// ============================================================
// PA DEPARTMENT OF STATE — CORPORATION SEARCH SCRAPER
// Source: https://www.corporations.pa.gov/Search/CorpSearch
// Scrapes active business entities in Allegheny County.
// Runs weekly (Sunday cron). Results become stub community_profiles
// with source='pa_corps_import', is_verified=false.
// ============================================================

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const PA_CORPS_BASE    = 'https://www.corporations.pa.gov';

export interface PaCorpsEntity {
  business_name:   string;
  business_type:   string;
  status:          string;
  address:         string;
  city:            string;
  zip:             string;
  filing_date:     string | null;
  entity_number:   string;
}

export interface PaCorpsResult {
  ingested:  number;
  skipped:   number;
  errors:    string[];
}

// PA Corps uses a form POST for search — simulate submission
async function fetchPaCorpsPage(page: number): Promise<PaCorpsEntity[]> {
  const entities: PaCorpsEntity[] = [];

  try {
    // POST to the search endpoint with Allegheny County filter
    const formData = new URLSearchParams({
      'searchParams.entityName':       '',
      'searchParams.entityNumber':     '',
      'searchParams.county':           '02',  // Allegheny County code
      'searchParams.entityStatus':     'ACT', // Active only
      'searchParams.entityTypeGroup':  '',
      'searchParams.pageNumber':       String(page),
      'searchParams.pageSize':         '100',
    });

    const res = await fetch(`${PA_CORPS_BASE}/Search/CorpSearch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':   'Mozilla/5.0 PGH-Gov-Contracts/1.0 (data aggregation)',
        'Accept':       'text/html',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      if (page > 1 && res.status === 404) return []; // no more pages
      throw new Error(`HTTP ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Results table — PA Corps renders a standard HTML table
    $('table tbody tr, .search-result-row, tr[data-entity]').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;

      const name    = $(cells[0]).text().trim();
      const type    = $(cells[1]).text().trim();
      const status  = $(cells[2]).text().trim();
      const address = $(cells[3]).text().trim();
      const city    = $(cells[4]).text().trim();
      const zip     = $(cells[5]).text().trim();
      const filing  = $(cells[6]).text().trim();
      const entityNum = $(cells[0]).find('a').attr('href')?.match(/\d+/)?.[0] ?? '';

      if (!name || (status && !status.toLowerCase().includes('active'))) return;

      entities.push({
        business_name: name,
        business_type: normalizeEntityType(type),
        status,
        address,
        city:          city || 'Pittsburgh',
        zip,
        filing_date:   parseDate(filing),
        entity_number: entityNum,
      });
    });

    // Fallback: scan for any <tr> containing business names if table selector missed
    if (entities.length === 0) {
      const rows = $('tr').toArray();
      for (const row of rows) {
        const text = $(row).text().replace(/\s+/g, ' ').trim();
        if (text.length < 5 || text.includes('Entity Name')) continue;
        const link = $(row).find('a').first();
        const name = link.text().trim();
        if (!name || name.length < 3) continue;
        const cells = $(row).find('td').toArray().map((c) => $(c).text().trim());
        entities.push({
          business_name: name,
          business_type: cells[1] ? normalizeEntityType(cells[1]) : 'LLC',
          status:        cells[2] ?? 'Active',
          address:       cells[3] ?? '',
          city:          cells[4] ?? 'Pittsburgh',
          zip:           cells[5] ?? '',
          filing_date:   cells[6] ? parseDate(cells[6]) : null,
          entity_number: link.attr('href')?.match(/\d+/)?.[0] ?? '',
        });
      }
    }
  } catch (err) {
    throw new Error(`PA Corps page ${page}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return entities;
}

function normalizeEntityType(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes('limit') && t.includes('liab')) return 'LLC';
  if (t.includes('corp')) return 'corp';
  if (t.includes('partner')) return 'partnership';
  if (t.includes('nonpro') || t.includes('non-pro')) return 'nonprofit';
  if (t.includes('sole')) return 'sole_prop';
  return 'LLC';
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (!m) return null;
  const [, mo, dy, yr] = m;
  const year = yr.length === 2 ? `20${yr}` : yr;
  return `${year}-${mo.padStart(2, '0')}-${dy.padStart(2, '0')}`;
}

function dedupHash(name: string, city: string): string {
  return crypto.createHash('sha256').update(`${name}|${city}`).digest('hex').slice(0, 16);
}

// ---- Main ingestion function ----

export async function ingestPaCorps(maxPages = 10): Promise<PaCorpsResult> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SVC_KEY);
  const errors: string[] = [];
  let totalIngested = 0;
  let totalSkipped  = 0;

  for (let page = 1; page <= maxPages; page++) {
    let entities: PaCorpsEntity[] = [];
    try {
      entities = await fetchPaCorpsPage(page);
    } catch (err) {
      errors.push(String(err));
      break; // stop on fetch error
    }

    if (entities.length === 0) break; // no more results

    // Prepare upsert rows
    const rows = entities.map((e) => ({
      business_name:  e.business_name,
      city:           e.city || 'Pittsburgh',
      zip:            e.zip || null,
      business_type:  e.business_type,
      source:         'pa_corps_import',
      is_verified:    false,
      sam_registered: false,
      // Store entity number in sam_uei field as a stub identifier
      sam_uei:        e.entity_number ? `PACORPS-${e.entity_number}` : null,
      naics_codes:    [],
      services_offered: [],
      certifications: {},
      looking_for:    [],
    }));

    // Upsert — match on business_name + city to avoid duplicates
    const { data, error } = await supabase
      .from('community_profiles')
      .upsert(rows, { onConflict: 'business_name,city', ignoreDuplicates: true })
      .select('id');

    if (error) {
      errors.push(`Page ${page} upsert: ${error.message}`);
    } else {
      totalIngested += data?.length ?? 0;
      totalSkipped  += entities.length - (data?.length ?? 0);
    }

    // Polite delay between pages
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`[PA Corps] Ingested: ${totalIngested}, Skipped: ${totalSkipped}, Errors: ${errors.length}`);
  return { ingested: totalIngested, skipped: totalSkipped, errors };
}
