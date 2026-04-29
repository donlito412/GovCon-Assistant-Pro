// ============================================================
// PA eMARKETPLACE SCRAPER
// Source: https://www.emarketplace.state.pa.us/
// Type: HTML scraper (fetch + cheerio)
// Auth: None
// Robots.txt: No disallow for solicitations listing
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

const BASE_URL = 'https://www.emarketplace.state.pa.us';
const LISTING_URL = `${BASE_URL}/Solicitations/SolicitationSearch.aspx`;
const SOURCE = 'state_pa_emarketplace' as const;
const FETCH_TIMEOUT_MS = 30_000;

const HEADERS = {
  'User-Agent':
    'GovConAssistantBot/1.0 (+https://github.com/donlito412/GovCon-Assistant-Pro; research/data-aggregation)',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * Fetches HTML from a URL with timeout.
 */
async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parses a single detail page for a solicitation to get full description.
 */
async function fetchDetailDescription(detailUrl: string): Promise<string | undefined> {
  try {
    const html = await fetchHtml(detailUrl);
    const $ = cheerio.load(html);
    // PA eMarketplace detail pages put description in a <div> with class "SolicitationInfo" or similar
    const desc =
      $('[id*="Description"]').text().trim() ||
      $('[id*="Scope"]').text().trim() ||
      $('td:contains("Description")').next('td').text().trim() ||
      $('td:contains("Scope of Work")').next('td').text().trim() ||
      '';
    return desc || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parses the main solicitations listing page.
 * PA eMarketplace renders a GridView table of active solicitations.
 */
function parseListing(html: string): Array<{
  title: string;
  solicitationNumber: string;
  agency: string;
  category: string;
  dueDate: string;
  detailUrl: string;
}> {
  const $ = cheerio.load(html);
  const results: Array<{
    title: string;
    solicitationNumber: string;
    agency: string;
    category: string;
    dueDate: string;
    detailUrl: string;
  }> = [];

  // The listing table has id containing "GridView" or "gvSolicitations"
  const table = $('table[id*="Grid"], table[id*="grid"], table[id*="Solicitation"]').first();

  if (!table.length) {
    // Fallback: find any data table with solicitation number column
    $('table tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cells = $(row).find('td');
      if (cells.length < 4) return;

      const solNum = $(cells[0]).text().trim();
      const title = $(cells[1]).text().trim() || $(cells[2]).text().trim();
      const agency = $(cells[2]).text().trim() || $(cells[3]).text().trim();
      const dueDate = $(cells[cells.length - 1]).text().trim();
      const link = $(cells[0]).find('a').attr('href') || $(cells[1]).find('a').attr('href') || '';
      const detailUrl = link.startsWith('http') ? link : `${BASE_URL}${link.startsWith('/') ? '' : '/'}${link}`;

      if (solNum && title) {
        results.push({
          title,
          solicitationNumber: solNum,
          agency,
          category: '',
          dueDate,
          detailUrl,
        });
      }
    });
    return results;
  }

  table.find('tr').each((i, row) => {
    if (i === 0) return;
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const solNum = $(cells[0]).text().trim();
    const title = $(cells[1]).text().trim();
    const agency = $(cells[2]).text().trim();
    const category = cells.length > 3 ? $(cells[3]).text().trim() : '';
    const dueDate = cells.length > 4 ? $(cells[4]).text().trim() : $(cells[cells.length - 1]).text().trim();
    const link = $(cells[0]).find('a').attr('href') || $(cells[1]).find('a').attr('href') || '';
    const detailUrl = link.startsWith('http') ? link : `${BASE_URL}${link.startsWith('/') ? '' : '/Solicitations/'}${link}`;

    if (title) {
      results.push({ title, solicitationNumber: solNum, agency, category, dueDate, detailUrl });
    }
  });

  return results;
}

/**
 * Main scraper entry point.
 * Fetches all active PA eMarketplace solicitations, normalizes each to ScrapedOpportunity.
 */
export async function scrapeEMarketplace(): Promise<ScraperResult> {
  const start = Date.now();
  const opportunities: ScrapedOpportunity[] = [];
  const errors: string[] = [];

  console.log('[pa_emarketplace] Starting scrape...');

  let html: string;
  try {
    html = await fetchHtml(LISTING_URL);
  } catch (err) {
    const msg = `Failed to fetch listing page: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[pa_emarketplace] ${msg}`);
    return { source: SOURCE, opportunities: [], errors: [msg], durationMs: Date.now() - start };
  }

  const listed = parseListing(html);
  console.log(`[pa_emarketplace] Found ${listed.length} solicitation(s) on listing page.`);

  for (const item of listed) {
    try {
      let description: string | undefined;
      if (item.detailUrl && item.detailUrl !== BASE_URL) {
        description = await fetchDetailDescription(item.detailUrl);
      }

      const deadline = parseToIso(item.dueDate);
      const contractType = mapContractType(item.category || item.title);
      const dedupHash = computeDedupHash(item.title, item.agency, deadline ?? null);

      const opp: ScrapedOpportunity = {
        source: SOURCE,
        title: item.title,
        agency_name: item.agency || 'Commonwealth of Pennsylvania',
        solicitation_number: item.solicitationNumber || undefined,
        dedup_hash: dedupHash,
        canonical_sources: [SOURCE],
        naics_code: undefined,
        naics_sector: undefined,
        contract_type: contractType,
        threshold_category: 'unknown',
        set_aside_type: undefined,
        value_min: undefined,
        value_max: undefined,
        deadline,
        posted_date: undefined,
        place_of_performance_city: undefined,
        place_of_performance_state: 'PA',
        place_of_performance_zip: undefined,
        description,
        url: item.detailUrl || LISTING_URL,
        status: 'active',
      };

      opportunities.push(opp);
    } catch (err) {
      const msg = `Error processing solicitation "${item.solicitationNumber}": ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[pa_emarketplace] ${msg}`);
      errors.push(msg);
    }
  }

  const durationMs = Date.now() - start;
  console.log(
    `[pa_emarketplace] Done. ${opportunities.length} records | ${errors.length} errors | ${durationMs}ms`,
  );

  return { source: SOURCE, opportunities, errors, durationMs };
}
