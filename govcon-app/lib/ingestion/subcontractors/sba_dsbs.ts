// ============================================================
// SBA DSBS SCRAPER
// Source: https://dsbs.sba.gov/search/dsp_dsbs.cfm
// Type: HTML scraper (fetch + cheerio)
// Auth: None (public search)
// Purpose: Scrape Pittsburgh small business profiles from SBA Dynamic Small Business Search
// ============================================================

import * as cheerio from 'cheerio';

interface SubcontractorContact {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  naics_codes: number[];
  sam_registered: boolean;
  cage_code?: string;
  certifications: string[];
  capabilities?: string;
  website?: string;
  city?: string;
  state?: string;
  zip?: string;
  source: string;
}

const SOURCE = 'sba_dsbs' as const;
const BASE_URL = 'https://dsbs.sba.gov/search/dsp_dsbs.cfm';
const FETCH_TIMEOUT_MS = 30_000;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

/**
 * Fetches HTML from a URL with timeout
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
 * Parses SBA DSBS search results page
 */
function parseSearchResults(html: string): Array<{
  companyName: string;
  city?: string;
  state?: string;
  zip?: string;
  cageCode?: string;
  detailUrl?: string;
}> {
  const $ = cheerio.load(html);
  const results: Array<{
    companyName: string;
    city?: string;
    state?: string;
    zip?: string;
    cageCode?: string;
    detailUrl?: string;
  }> = [];

  // SBA DSBS typically uses tables for search results
  $('table tr').each((i, row) => {
    if (i === 0) return; // Skip header row

    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const companyName = $(cells[0]).text().trim();
    if (!companyName || companyName.length < 3) return;

    // Look for link to company details
    const detailLink = $(cells[0]).find('a').first();
    const detailUrl = detailLink.attr('href') 
      ? detailLink.attr('href')?.startsWith('http') 
        ? detailLink.attr('href') 
        : `https://dsbs.sba.gov${detailLink.attr('href')}`
      : undefined;

    // Extract location info (usually in format "City, ST ZIP")
    let city: string | undefined;
    let state: string | undefined;
    let zip: string | undefined;
    
    const locationText = $(cells[1]).text().trim();
    if (locationText) {
      const locationMatch = locationText.match(/^(.+?),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
      if (locationMatch) {
        [, city, state, zip] = locationMatch;
      }
    }

    // Look for CAGE code (often in the last column)
    let cageCode: string | undefined;
    for (let j = 2; j < cells.length; j++) {
      const text = $(cells[j]).text().trim();
      if (/^[A-Z0-9]{5}$/.test(text)) {
        cageCode = text;
        break;
      }
    }

    results.push({
      companyName,
      city,
      state,
      zip,
      cageCode,
      detailUrl,
    });
  });

  return results;
}

/**
 * Parses individual company detail page for additional information
 */
async function parseCompanyDetail(detailUrl: string): Promise<{
  contactName?: string;
  email?: string;
  phone?: string;
  naicsCodes: number[];
  certifications: string[];
  capabilities?: string;
  website?: string;
}> {
  try {
    const html = await fetchHtml(detailUrl);
    const $ = cheerio.load(html);

    const result = {
      contactName: undefined as string | undefined,
      email: undefined as string | undefined,
      phone: undefined as string | undefined,
      naicsCodes: [] as number[],
      certifications: [] as string[],
      capabilities: undefined as string | undefined,
      website: undefined as string | undefined,
    };

    // Extract contact information
    $('td, div, span').each((_, el) => {
      const text = $(el).text().trim();
      const label = $(el).prev('td, th, strong, b').text().trim().toLowerCase();

      if (label.includes('contact') || label.includes('name')) {
        if (text.length > 3 && text.length < 100) {
          result.contactName = text;
        }
      }

      if (label.includes('email') || label.includes('e-mail')) {
        if (text.includes('@')) {
          result.email = text;
        }
      }

      if (label.includes('phone') || label.includes('telephone')) {
        if (/\d{3}.*\d{3}.*\d{4}/.test(text)) {
          result.phone = text;
        }
      }

      if (label.includes('website') || label.includes('url')) {
        if (text.startsWith('http') || text.includes('www.')) {
          result.website = text.startsWith('http') ? text : `https://${text}`;
        }
      }

      if (label.includes('naics') || label.includes('business code')) {
        const naicsMatches = text.match(/\b(\d{6})\b/g);
        if (naicsMatches) {
          result.naicsCodes.push(...naicsMatches.map(n => parseInt(n)).filter(n => !isNaN(n)));
        }
      }

      if (label.includes('capability') || label.includes('description') || label.includes('overview')) {
        if (text.length > 20 && text.length < 2000) {
          result.capabilities = text;
        }
      }
    });

    // Look for certification checkboxes or labels
    const certPatterns = [
      '8(a)', '8a', 'hubzone', 'hub zone', 'sdvosb', 'service disabled',
      'wosb', 'women owned', 'edwosb', 'economically disadvantaged',
      'small business', 'sbe', 'dbe', 'disadvantaged', 'veteran owned',
      'minority owned', 'mbe', 'wbe'
    ];

    $('td, div, span, label').each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      
      certPatterns.forEach(cert => {
        if (text.includes(cert) && !result.certifications.includes(cert.replace(/[^a-z0-9]/g, '_'))) {
          result.certifications.push(cert.replace(/[^a-z0-9]/g, '_'));
        }
      });
    });

    return result;
  } catch (error) {
    console.error(`[sba_dsbs] Failed to parse detail page ${detailUrl}:`, error);
    return {
      contactName: undefined,
      email: undefined,
      phone: undefined,
      naicsCodes: [],
      certifications: [],
      capabilities: undefined,
      website: undefined,
    };
  }
}

/**
 * Checks if a company is in the Pittsburgh area
 */
function isPittsburghArea(company: {
  city?: string;
  state?: string;
  zip?: string;
}): boolean {
  if (company.state !== 'PA') return false;
  
  // Check Pittsburgh area cities
  const pittsburghCities = [
    'pittsburgh', 'allegheny', 'butler', 'washington', 'westmoreland', 'beaver',
    'monroeville', 'west mifflin', 'mckeesport', 'bethel park', 'carnegie',
    'canonsburg', 'wexford', 'cranberry', 'mars', 'new castle', 'greensburg'
  ];
  
  if (company.city) {
    const cityLower = company.city.toLowerCase();
    if (pittsburghCities.some(city => cityLower.includes(city))) {
      return true;
    }
  }
  
  // Check Pittsburgh ZIP codes (15xxx)
  if (company.zip && company.zip.startsWith('15')) {
    return true;
  }
  
  return false;
}

/**
 * Main scraper function for SBA DSBS
 */
export async function scrapeSbaDsbs(): Promise<{
  source: string;
  contacts: SubcontractorContact[];
  errors: string[];
  durationMs: number;
}> {
  const start = Date.now();
  const contacts: SubcontractorContact[] = [];
  const errors: string[] = [];

  console.log('[sba_dsbs] Starting SBA DSBS scrape...');

  try {
    // Search for Pennsylvania small businesses
    const searchUrl = `${BASE_URL}?state=PA&pageSize=50`;
    console.log('[sba_dsbs] Fetching Pennsylvania search results...');
    
    const html = await fetchHtml(searchUrl);
    const searchResults = parseSearchResults(html);
    
    console.log(`[sba_dsbs] Found ${searchResults.length} companies in search results`);

    for (const company of searchResults) {
      try {
        // Filter to Pittsburgh area only
        if (!isPittsburghArea(company)) {
          continue;
        }

        // Get detailed information
        let detailInfo = {
          contactName: undefined as string | undefined,
          email: undefined as string | undefined,
          phone: undefined as string | undefined,
          naicsCodes: [] as number[],
          certifications: [] as string[],
          capabilities: undefined as string | undefined,
          website: undefined as string | undefined,
        };

        if (company.detailUrl) {
          detailInfo = await parseCompanyDetail(company.detailUrl) as typeof detailInfo;
        }

        const contact: SubcontractorContact = {
          company_name: company.companyName,
          contact_name: detailInfo.contactName || undefined,
          email: detailInfo.email || undefined,
          phone: detailInfo.phone || undefined,
          naics_codes: detailInfo.naicsCodes,
          sam_registered: true, // If they're in DSBS, they're likely SAM registered
          cage_code: company.cageCode,
          certifications: detailInfo.certifications,
          capabilities: detailInfo.capabilities,
          website: detailInfo.website,
          city: company.city,
          state: company.state,
          zip: company.zip,
          source: SOURCE,
        };

        contacts.push(contact);
      } catch (error) {
        const errorMsg = `Error processing company "${company.companyName}": ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[sba_dsbs] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `SBA DSBS scrape failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[sba_dsbs] ${errorMsg}`);
    errors.push(errorMsg);
  }

  const durationMs = Date.now() - start;
  console.log(`[sba_dsbs] Done. ${contacts.length} Pittsburgh-area contacts | ${errors.length} errors | ${durationMs}ms`);

  return {
    source: SOURCE,
    contacts,
    errors,
    durationMs,
  };
}
