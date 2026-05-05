// ============================================================
// HOUSING AUTHORITY OF PITTSBURGH SCRAPER
// Source: https://www.hacp.org/doing-business-with-hacp/
// Type: HTML scraper
// Auth: None (public procurement page)
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

const SOURCE = 'local_housing_authority' as const;
const FETCH_TIMEOUT_MS = 30_000;

const HACP_URL = 'https://www.hacp.org/doing-business-with-hacp/';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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

export async function scrapeHousingAuthority(): Promise<ScraperResult> {
  const start = Date.now();
  const opportunities: ScrapedOpportunity[] = [];
  const errors: string[] = [];
  
  console.log('[housing_authority] Starting scrape...');
  
  try {
    const html = await fetchHtml(HACP_URL);
    const $ = cheerio.load(html);
    
    // HACP page typically lists opportunities in various formats
    // Look for links, list items, or table rows containing solicitation info
    const items = $('a, li, tr, article, .opportunity, .solicitation, .rfp, .bid');
    
    items.each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      
      // Look for RFP/Bid/Solicitation patterns
      if (!text.match(/\b(RFP|Bid|Solicitation|IFB|RFQ|Contract|Procurement)\b/i)) return;
      
      const title = text.length > 100 ? text.substring(0, 100) + '...' : text;
      if (!title || title.length < 10) return;
      
      // Extract solicitation number
      const numMatch = text.match(/(?:RFP|Bid|IFB|RFQ)[-#\s]*(\d{2,4}[-\d]*)/i) ||
                       text.match(/#\s*(\d{4}[-\d]*)/);
      const solicitationNumber = numMatch ? numMatch[1] : '';
      
      // Extract dates
      const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|[A-Za-z]+\s+\d{1,2},?\s*\d{4})/);
      const deadlineText = dateMatch ? dateMatch[1] : '';
      const deadline = parseToIso(deadlineText);
      
      // Extract URL
      const href = $el.attr('href') || $el.find('a').first().attr('href') || '';
      let url: string;
      if (href.startsWith('http')) {
        url = href;
      } else if (href) {
        url = `https://www.hacp.org${href.startsWith('/') ? '' : '/'}${href}`;
      } else {
        url = HACP_URL;
      }
      
      // Skip PDF links (just the listing page)
      if (href.toLowerCase().endsWith('.pdf')) {
        url = HACP_URL;
      }
      
      const dedupHash = computeDedupHash(title, 'Housing Authority of Pittsburgh', deadline ?? null);
      
      opportunities.push({
        source: SOURCE,
        title,
        agency_name: 'Housing Authority of Pittsburgh',
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
        description: `HACP Procurement Opportunity: ${title}`.slice(0, 500),
        url,
        status: 'active',
      });
    });
    
    console.log(`[housing_authority] Found ${opportunities.length} opportunities.`);
    
  } catch (err) {
    const msg = `HACP fetch failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[housing_authority] ${msg}`);
    errors.push(msg);
  }
  
  const durationMs = Date.now() - start;
  return { source: SOURCE, opportunities, errors, durationMs };
}
