// ============================================================
// PA TREASURY CONTRACTS SCRAPER
// Source: https://contracts.patreasury.gov/
// Type: HTML scraper (fetch + cheerio)
// Auth: None
// Robots.txt: No disallow on public search results
// ============================================================

import * as cheerio from 'cheerio';
import type { ScraperResult, ScrapedOpportunity } from './shared/normalize_shared';
import {
  computeDedupHash,
  deriveThresholdCategory,
  mapContractType,
  parseDollarString,
  dollarsToCents,
  parseToIso,
  getNaicsSector,
} from './shared/normalize_shared';

const BASE_URL = 'https://contracts.patreasury.gov';
const SEARCH_URL = `${BASE_URL}/search.aspx`;
const SOURCE = 'state_pa_treasury' as const;
const FETCH_TIMEOUT_MS = 30_000;

const HEADERS = {
  'User-Agent':
    'GovConAssistantBot/1.0 (+https://github.com/donlito412/GovCon-Assistant-Pro; research/data-aggregation)',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchHtml(url: string, options?: RequestInit): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal, ...options });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extracts ASP.NET hidden form fields needed for POST back.
 */
function extractAspNetFields(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const fields: Record<string, string> = {};
  const fieldNames = [
    '__VIEWSTATE',
    '__VIEWSTATEGENERATOR',
    '__EVENTVALIDATION',
    '__EVENTTARGET',
    '__EVENTARGUMENT',
  ];
  for (const name of fieldNames) {
    const val = $(`input[name="${name}"]`).val();
    if (val) fields[name] = String(val);
  }
  return fields;
}

/**
 * Parses the search results table from PA Treasury.
 * The site renders a GridView with contract number, description, agency, value, dates.
 */
function parseResultsTable(html: string): Array<{
  contractNumber: string;
  description: string;
  agency: string;
  vendor: string;
  value: string;
  startDate: string;
  endDate: string;
  detailUrl: string;
}> {
  const $ = cheerio.load(html);
  const results: Array<{
    contractNumber: string;
    description: string;
    agency: string;
    vendor: string;
    value: string;
    startDate: string;
    endDate: string;
    detailUrl: string;
  }> = [];

  // PA Treasury uses a GridView table — find it by looking for rows with contract-like content
  $('table tr').each((i, row) => {
    if (i === 0) return; // header row
    const cells = $(row).find('td');
    if (cells.length < 4) return;

    const contractNumber = $(cells[0]).text().trim();
    if (!contractNumber) return;

    const description = $(cells[1]).text().trim();
    const agency = $(cells[2]).text().trim();
    const vendor = cells.length > 3 ? $(cells[3]).text().trim() : '';
    const value = cells.length > 4 ? $(cells[4]).text().trim() : '';
    const startDate = cells.length > 5 ? $(cells[5]).text().trim() : '';
    const endDate = cells.length > 6 ? $(cells[6]).text().trim() : '';

    const link = $(cells[0]).find('a').attr('href') || $(cells[1]).find('a').attr('href') || '';
    const detailUrl = link.startsWith('http')
      ? link
      : `${BASE_URL}${link.startsWith('/') ? '' : '/'}${link}`;

    if (description || agency) {
      results.push({ contractNumber, description, agency, vendor, value, startDate, endDate, detailUrl });
    }
  });

  return results;
}

/**
 * Main scraper for PA Treasury active contracts.
 * Performs a POST search for active contracts (status = active/open).
 */
export async function scrapePaTreasury(): Promise<ScraperResult> {
  const start = Date.now();
  const opportunities: ScrapedOpportunity[] = [];
  const errors: string[] = [];

  console.log('[pa_treasury] Starting scrape...');

  // First GET to retrieve ASP.NET form state
  let html: string;
  try {
    html = await fetchHtml(SEARCH_URL);
  } catch (err) {
    const msg = `Failed to load search page: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[pa_treasury] ${msg}`);
    return { source: SOURCE, opportunities: [], errors: [msg], durationMs: Date.now() - start };
  }

  const aspFields = extractAspNetFields(html);

  // Build POST body for active solicitations search
  const formData = new URLSearchParams({
    ...aspFields,
    '__EVENTTARGET': '',
    '__EVENTARGUMENT': '',
    // Search for active/open contracts — field names match PA Treasury's form
    'ctl00$MainContent$ddlStatus': 'Active',
    'ctl00$MainContent$btnSearch': 'Search',
  });

  let resultsHtml: string;
  try {
    resultsHtml = await fetchHtml(SEARCH_URL, {
      method: 'POST',
      body: formData.toString(),
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: SEARCH_URL,
      },
    });
  } catch (err) {
    const msg = `Failed to POST search: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[pa_treasury] ${msg}`);
    // Fall back to GET of the main page — still parse whatever is visible
    resultsHtml = html;
    errors.push(msg);
  }

  const rows = parseResultsTable(resultsHtml);
  console.log(`[pa_treasury] Found ${rows.length} contract row(s) in results.`);

  for (const row of rows) {
    try {
      const title = row.description || `Contract ${row.contractNumber}`;
      const agency = row.agency || 'PA Treasury';
      const deadline = parseToIso(row.endDate);
      const postedDate = parseToIso(row.startDate);
      const valueDollars = parseDollarString(row.value);
      const valueCents = dollarsToCents(valueDollars);

      const dedupHash = computeDedupHash(title, agency, deadline ?? null);

      const opp: ScrapedOpportunity = {
        source: SOURCE,
        title,
        agency_name: agency,
        solicitation_number: row.contractNumber || undefined,
        dedup_hash: dedupHash,
        canonical_sources: [SOURCE],
        naics_code: undefined,
        naics_sector: undefined,
        contract_type: mapContractType(title),
        threshold_category: deriveThresholdCategory(valueDollars ?? null),
        set_aside_type: undefined,
        value_min: valueCents,
        value_max: valueCents,
        deadline,
        posted_date: postedDate,
        place_of_performance_city: undefined,
        place_of_performance_state: 'PA',
        place_of_performance_zip: undefined,
        description: row.vendor ? `Vendor: ${row.vendor}` : undefined,
        url: row.detailUrl || SEARCH_URL,
        status: 'active',
      };

      opportunities.push(opp);
    } catch (err) {
      const msg = `Error processing contract "${row.contractNumber}": ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[pa_treasury] ${msg}`);
      errors.push(msg);
    }
  }

  const durationMs = Date.now() - start;
  console.log(`[pa_treasury] Done. ${opportunities.length} records | ${errors.length} errors | ${durationMs}ms`);

  return { source: SOURCE, opportunities, errors, durationMs };
}
