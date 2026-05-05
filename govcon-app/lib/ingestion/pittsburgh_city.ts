// ============================================================
// CITY OF PITTSBURGH SOLICITATIONS SCRAPER
// Source: https://pittsburghpa.bonfirehub.com (primary)
//         https://pittsburghpa.gov/finance/bids-rfps (fallback)
// Type: HTML scraper (Bonfire platform) + HTML fallback
// Auth: None (public portals)
// ============================================================

import * as cheerio from 'cheerio';
import type { ScraperResult, ScrapedOpportunity } from './shared/normalize_shared';
import {
  computeDedupHash,
  deriveThresholdCategory,
  mapContractType,
  dollarsToCents,
  parseToIso,
} from './shared/normalize_shared';

const SOURCE = 'local_pittsburgh' as const;
const FETCH_TIMEOUT_MS = 30_000;

// PRIMARY: Bonfire Hub (Pittsburgh's current procurement platform)
const BONFIRE_PORTAL = 'https://pittsburghpa.bonfirehub.com';
const BONFIRE_PROJECTS = 'https://pittsburghpa.bonfirehub.com/project_opportunities';

// Fallback: Finance Department page
const FINANCE_URL = 'https://pittsburghpa.gov/finance/bids-rfps';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
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
 * Fetches Bonfire portal and extracts project opportunities
 * Bonfire renders projects as HTML cards/tables we can parse
 */
async function fetchBonfireOpportunities(): Promise<ScrapedOpportunity[]> {
  const html = await fetchHtml(BONFIRE_PROJECTS);
  const $ = cheerio.load(html);
  const results: ScrapedOpportunity[] = [];
  
  // Bonfire project cards - try multiple selectors
  const projectCards = $('.project-opportunity, .project-card, .opportunity-item, [class*="project"], tr');
  
  projectCards.each((_, el) => {
    const $el = $(el);
    
    // Extract title from links or headers
    let title = $el.find('h2, h3, h4, .project-title, .title').first().text().trim();
    if (!title) {
      title = $el.find('a').first().text().trim();
    }
    // Skip if no valid title
    if (!title || title.length < 5 || title.toLowerCase().includes('next') || title.toLowerCase().includes('previous')) return;
    
    // Extract solicitation number if present in title
    const numberMatch = title.match(/([A-Z]+-\d+|\d{4}-\d+|RFP\s*#?\s*\d+|Bid\s*#?\s*\d+)/i);
    const solicitationNumber = numberMatch ? numberMatch[1] : '';
    
    // Extract department/agency
    let department = $el.find('.department, .agency, .organization, .category').first().text().trim();
    if (!department || department.length < 2) {
      department = 'City of Pittsburgh';
    }
    
    // Extract deadline - look for various date patterns
    let deadlineText = '';
    const deadlineEl = $el.find('.deadline, .due-date, .closing-date, [class*="deadline"], [class*="due"], [class*="close"]').first();
    if (deadlineEl.length) {
      deadlineText = deadlineEl.text().trim();
    } else {
      // Try to find deadline in the text
      const fullText = $el.text();
      const dateMatch = fullText.match(/(?:due|deadline|closes?)[:\s]*([A-Za-z]+\s+\d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i);
      if (dateMatch) deadlineText = dateMatch[1];
    }
    const deadline = parseToIso(deadlineText);
    
    // Extract posted/open date
    let postedText = $el.find('.posted, .open-date, .published, [class*="posted"]').first().text().trim();
    const postedDate = parseToIso(postedText);
    
    // Extract value/budget if present
    let valueDollars: number | undefined;
    const valueText = $el.find('.value, .budget, .estimate, [class*="value"], [class*="budget"]').first().text().trim();
    if (valueText) {
      const valueMatch = valueText.match(/\$?([\d,]+(?:\.\d{2})?)/);
      if (valueMatch) {
        valueDollars = parseFloat(valueMatch[1].replace(/,/g, ''));
      }
    }
    const valueCents = valueDollars ? dollarsToCents(valueDollars) : undefined;
    
    // Extract URL
    const href = $el.find('a').first().attr('href') || '';
    let url: string;
    if (href.startsWith('http')) {
      url = href;
    } else if (href) {
      url = `${BONFIRE_PORTAL}${href.startsWith('/') ? '' : '/'}${href}`;
    } else {
      url = BONFIRE_PORTAL;
    }
    
    // Extract description/summary
    const description = $el.find('.description, .summary, .excerpt, [class*="description"]').first().text().trim() || undefined;
    
    const dedupHash = computeDedupHash(title, department, deadline ?? null);
    
    results.push({
      source: SOURCE,
      title,
      agency_name: department,
      solicitation_number: solicitationNumber || undefined,
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
      place_of_performance_city: 'Pittsburgh',
      place_of_performance_state: 'PA',
      place_of_performance_zip: undefined,
      description,
      url,
      status: 'active',
    });
  });
  
  return results;
}

/**
 * Parses the Pittsburgh Finance Department bids and RFPs page.
 */
async function fetchFinanceOpportunities(): Promise<ScrapedOpportunity[]> {
  const html = await fetchHtml(FINANCE_URL);
  const $ = cheerio.load(html);
  const results: ScrapedOpportunity[] = [];
  
  // Finance page typically uses lists, tables, or divs
  $('ul li, table tr, .procurement-item, .bid-item, .rfp-item, article').each((i, el) => {
    if (el.tagName === 'tr' && i === 0) return; // skip header row
    
    const $el = $(el);
    const $link = $el.find('a').first();
    const title = $link.text().trim() || $el.text().trim();
    
    // Skip invalid entries
    if (!title || title.length < 10) return;
    if (title.toLowerCase().includes('next') || title.toLowerCase().includes('previous')) return;
    
    const href = $link.attr('href') || '';
    let url: string;
    if (href.startsWith('http')) {
      url = href;
    } else if (href) {
      url = `https://pittsburghpa.gov${href.startsWith('/') ? '' : '/'}${href}`;
    } else {
      url = FINANCE_URL;
    }
    
    // Try to extract solicitation number from title
    const solNumMatch = title.match(/(\d{4}-\d+|RFP-\d+|BID-\d+|SOL-\d+|IFB-\d+)/i);
    const solicitationNumber = solNumMatch ? solNumMatch[1] : '';
    
    // Try to extract dates from surrounding text
    const text = $el.text();
    const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4}|[A-Za-z]+\s+\d{1,2},?\s*\d{4})/);
    const deadlineText = dateMatch ? dateMatch[1] : '';
    const deadline = parseToIso(deadlineText);
    
    const dedupHash = computeDedupHash(title, 'City of Pittsburgh - Finance', deadline ?? null);
    
    results.push({
      source: SOURCE,
      title,
      agency_name: 'City of Pittsburgh - Finance Department',
      solicitation_number: solicitationNumber || undefined,
      dedup_hash: dedupHash,
      canonical_sources: [SOURCE],
      naics_code: undefined,
      naics_sector: undefined,
      contract_type: mapContractType(title),
      threshold_category: 'unknown',
      set_aside_type: undefined,
      value_min: undefined,
      value_max: undefined,
      deadline,
      posted_date: undefined,
      place_of_performance_city: 'Pittsburgh',
      place_of_performance_state: 'PA',
      place_of_performance_zip: undefined,
      description: undefined,
      url,
      status: 'active',
    });
  });
  
  return results;
}

/**
 * Main City of Pittsburgh scraper.
 * Tries Bonfire first, then Finance Department page.
 */
export async function scrapePittsburghCity(): Promise<ScraperResult> {
  const start = Date.now();
  const opportunities: ScrapedOpportunity[] = [];
  const errors: string[] = [];
  
  console.log('[pittsburgh_city] Starting scrape...');
  
  // Attempt 1: Bonfire Hub (primary)
  console.log('[pittsburgh_city] Trying Bonfire Hub...');
  try {
    const bonfireResults = await fetchBonfireOpportunities();
    if (bonfireResults.length > 0) {
      console.log(`[pittsburgh_city] Bonfire returned ${bonfireResults.length} solicitation(s).`);
      opportunities.push(...bonfireResults);
      const durationMs = Date.now() - start;
      return { source: SOURCE, opportunities, errors, durationMs };
    }
  } catch (err) {
    const msg = `Bonfire fetch failed: ${err instanceof Error ? err.message : String(err)}`;
    console.warn(`[pittsburgh_city] ${msg}`);
    errors.push(msg);
  }
  
  // Attempt 2: Finance Department page (fallback)
  console.log('[pittsburgh_city] Trying Finance Department page...');
  try {
    const financeResults = await fetchFinanceOpportunities();
    if (financeResults.length > 0) {
      console.log(`[pittsburgh_city] Finance page returned ${financeResults.length} solicitation(s).`);
      opportunities.push(...financeResults);
    }
  } catch (err) {
    const msg = `Finance Department fetch failed: ${err instanceof Error ? err.message : String(err)}`;
    console.warn(`[pittsburgh_city] ${msg}`);
    errors.push(msg);
  }
  
  const durationMs = Date.now() - start;
  console.log(
    `[pittsburgh_city] Done. ${opportunities.length} records | ${errors.length} errors | ${durationMs}ms`,
  );
  
  return { source: SOURCE, opportunities, errors, durationMs };
}
