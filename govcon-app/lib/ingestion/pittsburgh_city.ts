// ============================================================
// CITY OF PITTSBURGH SOLICITATIONS SCRAPER
// Source: https://procurement.opengov.com/portal/pittsburghpa
// Type: HTML scraper (fetch + cheerio)
// Auth: None (OpenGov public portal)
// Notes: OpenGov renders a public-facing solicitation portal.
//        We fetch the public portal listing and parse solicitation cards.
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

const SOURCE = 'local_pittsburgh' as const;
const FETCH_TIMEOUT_MS = 30_000;

// Primary: OpenGov portal for City of Pittsburgh
const OPENGOV_URL = 'https://procurement.opengov.com/portal/pittsburghpa';

// Fallback: OMB/Solicitations direct page
const FALLBACK_URL = 'https://pittsburghpa.gov/omb/solicitations';

const HEADERS = {
  'User-Agent':
    'GovConAssistantBot/1.0 (+https://github.com/donlito412/GovCon-Assistant-Pro; research/data-aggregation)',
  Accept: 'text/html,application/xhtml+xml,application/json',
  'Accept-Language': 'en-US,en;q=0.9',
};

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
 * Tries the OpenGov public API for Pittsburgh solicitations.
 * OpenGov exposes a JSON endpoint for public portals.
 */
async function fetchOpenGovApi(): Promise<ScrapedOpportunity[] | null> {
  // OpenGov public portal API — undocumented but publicly accessible
  const apiUrl = 'https://procurement.opengov.com/api/v1/portal/pittsburghpa/solicitations?status=open&limit=100';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(apiUrl, {
        headers: { ...HEADERS, Accept: 'application/json' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) return null;

    const data = await res.json() as {
      solicitations?: Array<{
        id?: string | number;
        name?: string;
        number?: string;
        department?: string;
        submission_deadline?: string;
        published_at?: string;
        solicitation_type?: string;
        url?: string;
        description?: string;
        estimated_value?: number;
      }>;
    };

    if (!data?.solicitations?.length) return null;

    const results: ScrapedOpportunity[] = [];
    for (const s of data.solicitations) {
      const title = s.name ?? `Solicitation ${s.number}`;
      const agency = s.department ?? 'City of Pittsburgh';
      const deadline = parseToIso(s.submission_deadline ?? null);
      const postedDate = parseToIso(s.published_at ?? null);
      const valueDollars = s.estimated_value ?? undefined;
      const valueCents = dollarsToCents(valueDollars);

      results.push({
        source: SOURCE,
        title,
        agency_name: agency,
        solicitation_number: s.number ?? String(s.id ?? ''),
        dedup_hash: computeDedupHash(title, agency, deadline ?? null),
        canonical_sources: [SOURCE],
        naics_code: undefined,
        naics_sector: undefined,
        contract_type: mapContractType(s.solicitation_type ?? title),
        threshold_category: deriveThresholdCategory(valueDollars ?? null),
        set_aside_type: undefined,
        value_min: valueCents,
        value_max: valueCents,
        deadline,
        posted_date: postedDate,
        place_of_performance_city: 'Pittsburgh',
        place_of_performance_state: 'PA',
        place_of_performance_zip: undefined,
        description: s.description ?? undefined,
        url: s.url ?? `${OPENGOV_URL}/${s.id ?? ''}`,
        status: 'active',
      });
    }
    return results;
  } catch {
    return null;
  }
}

/**
 * Parses the OpenGov HTML portal page for Pittsburgh solicitations.
 * OpenGov renders solicitation cards as <article> or <div class="solicitation"> elements.
 */
function parseOpenGovHtml(html: string): Array<{
  number: string;
  title: string;
  department: string;
  type: string;
  deadline: string;
  posted: string;
  url: string;
}> {
  const $ = cheerio.load(html);
  const results: Array<{
    number: string;
    title: string;
    department: string;
    type: string;
    deadline: string;
    posted: string;
    url: string;
  }> = [];

  // OpenGov renders cards — try multiple selectors
  const cards = $('article, .solicitation-card, [data-testid="solicitation-row"], .procurement-item, tr[data-href]');

  cards.each((_, el) => {
    const $el = $(el);
    const title =
      $el.find('h2, h3, .solicitation-title, .title, [class*="title"]').first().text().trim() ||
      $el.find('a').first().text().trim();
    if (!title) return;

    const number =
      $el.find('[class*="number"], [class*="id"], .solicitation-number').first().text().trim() || '';
    const department =
      $el.find('[class*="department"], [class*="agency"], [class*="org"]').first().text().trim() ||
      'City of Pittsburgh';
    const type =
      $el.find('[class*="type"], [class*="category"]').first().text().trim() || '';
    const deadline =
      $el.find('[class*="deadline"], [class*="due"], time[datetime]').first().attr('datetime') ||
      $el.find('[class*="deadline"], [class*="due"]').first().text().trim() ||
      '';
    const posted =
      $el.find('[class*="posted"], [class*="published"]').first().text().trim() || '';
    const href =
      $el.find('a').first().attr('href') ||
      $el.attr('data-href') ||
      '';
    const url = href.startsWith('http') ? href : href ? `${OPENGOV_URL}${href}` : OPENGOV_URL;

    results.push({ number, title, department, type, deadline, posted, url });
  });

  // Fallback: try table rows (some portals use tables)
  if (results.length === 0) {
    $('table tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const title = $(cells[0]).text().trim() || $(cells[1]).text().trim();
      if (!title) return;
      const number = $(cells[0]).text().trim();
      const department = cells.length > 2 ? $(cells[2]).text().trim() : 'City of Pittsburgh';
      const deadline = cells.length > 3 ? $(cells[3]).text().trim() : '';
      const href = $(cells[0]).find('a').attr('href') || $(cells[1]).find('a').attr('href') || '';
      const url = href.startsWith('http') ? href : href ? `${OPENGOV_URL}${href}` : OPENGOV_URL;
      results.push({ number, title, department, type: '', deadline, posted: '', url });
    });
  }

  return results;
}

/**
 * Parses the City of Pittsburgh OMB solicitations fallback page.
 */
function parseFallbackHtml(html: string): Array<{
  number: string;
  title: string;
  department: string;
  type: string;
  deadline: string;
  posted: string;
  url: string;
}> {
  const $ = cheerio.load(html);
  const results: Array<{
    number: string;
    title: string;
    department: string;
    type: string;
    deadline: string;
    posted: string;
    url: string;
  }> = [];

  // PGH gov pages typically use <ul> or <table> for solicitation listings
  $('ul li, table tr, .view-row').each((i, el) => {
    const $el = $(el);
    if (el.tagName === 'tr' && i === 0) return;

    const $link = $el.find('a').first();
    const title = $link.text().trim() || $el.text().trim();
    if (!title || title.length < 5) return;

    const href = $link.attr('href') || '';
    const url = href.startsWith('http')
      ? href
      : href
      ? `https://pittsburghpa.gov${href.startsWith('/') ? '' : '/'}${href}`
      : FALLBACK_URL;

    // Try to extract a date from surrounding text
    const rowText = $el.text();
    const dateMatch = rowText.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{1,2},\s*\d{4})/);
    const deadline = dateMatch ? dateMatch[1] : '';

    results.push({
      number: '',
      title,
      department: 'City of Pittsburgh',
      type: '',
      deadline,
      posted: '',
      url,
    });
  });

  return results;
}

/**
 * Main City of Pittsburgh scraper.
 * Tries OpenGov API first, then HTML scraping of portal, then fallback page.
 */
export async function scrapePittsburghCity(): Promise<ScraperResult> {
  const start = Date.now();
  const opportunities: ScrapedOpportunity[] = [];
  const errors: string[] = [];

  console.log('[pittsburgh_city] Starting scrape...');

  // Attempt 1: OpenGov JSON API
  console.log('[pittsburgh_city] Trying OpenGov API...');
  const apiResults = await fetchOpenGovApi();
  if (apiResults && apiResults.length > 0) {
    console.log(`[pittsburgh_city] OpenGov API returned ${apiResults.length} solicitation(s).`);
    opportunities.push(...apiResults);
    const durationMs = Date.now() - start;
    console.log(`[pittsburgh_city] Done (API). ${opportunities.length} records | ${durationMs}ms`);
    return { source: SOURCE, opportunities, errors, durationMs };
  }

  // Attempt 2: Scrape OpenGov portal HTML
  console.log('[pittsburgh_city] API unavailable. Scraping OpenGov portal HTML...');
  let html: string | null = null;
  let parsedItems: ReturnType<typeof parseOpenGovHtml> = [];

  try {
    html = await fetchHtml(OPENGOV_URL);
    parsedItems = parseOpenGovHtml(html);
    console.log(`[pittsburgh_city] OpenGov HTML: found ${parsedItems.length} item(s).`);
  } catch (err) {
    const msg = `OpenGov portal fetch failed: ${err instanceof Error ? err.message : String(err)}`;
    console.warn(`[pittsburgh_city] ${msg}`);
    errors.push(msg);
  }

  // Attempt 3: Fallback OMB page
  if (parsedItems.length === 0) {
    console.log('[pittsburgh_city] Trying fallback OMB solicitations page...');
    try {
      const fallbackHtml = await fetchHtml(FALLBACK_URL);
      parsedItems = parseFallbackHtml(fallbackHtml);
      console.log(`[pittsburgh_city] Fallback page: found ${parsedItems.length} item(s).`);
    } catch (err) {
      const msg = `Fallback page fetch failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[pittsburgh_city] ${msg}`);
      errors.push(msg);
    }
  }

  for (const item of parsedItems) {
    try {
      const title = item.title;
      const agency = item.department || 'City of Pittsburgh';
      const deadline = parseToIso(item.deadline);
      const postedDate = parseToIso(item.posted);
      const contractType = mapContractType(item.type || title);
      const dedupHash = computeDedupHash(title, agency, deadline ?? null);

      const opp: ScrapedOpportunity = {
        source: SOURCE,
        title,
        agency_name: agency,
        solicitation_number: item.number || undefined,
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
        posted_date: postedDate,
        place_of_performance_city: 'Pittsburgh',
        place_of_performance_state: 'PA',
        place_of_performance_zip: undefined,
        description: undefined,
        url: item.url,
        status: 'active',
      };

      opportunities.push(opp);
    } catch (err) {
      const msg = `Error processing solicitation "${item.title}": ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[pittsburgh_city] ${msg}`);
      errors.push(msg);
    }
  }

  const durationMs = Date.now() - start;
  console.log(
    `[pittsburgh_city] Done. ${opportunities.length} records | ${errors.length} errors | ${durationMs}ms`,
  );

  return { source: SOURCE, opportunities, errors, durationMs };
}
