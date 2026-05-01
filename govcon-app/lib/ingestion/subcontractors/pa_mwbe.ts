// ============================================================
// PA MWBE SCRAPER
// Source: https://www.dgs.pa.gov/Materials-Services-Procurement/Small-Diverse-Business/Pages/default.aspx
// Type: HTML scraper (fetch + cheerio)
// Auth: None (public directory)
// Purpose: Scrape PA DGS MWDBE certified firms list for Pittsburgh area
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

const SOURCE = 'pa_mwbe' as const;
const BASE_URL = 'https://www.dgs.pa.gov/Materials-Services-Procurement/Small-Diverse-Business/Pages/default.aspx';
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
 * Parses PA DGS MWBE directory page
 */
function parseMwbeDirectory(html: string): Array<{
  companyName: string;
  city?: string;
  state?: string;
  zip?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  certifications: string[];
  website?: string;
}> {
  const $ = cheerio.load(html);
  const results: Array<{
    companyName: string;
    city?: string;
    state?: string;
    zip?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    certifications: string[];
    website?: string;
  }> = [];

  // PA DGS might use tables, lists, or cards for directory listings
  // Try multiple selector patterns
  
  // Pattern 1: Table rows
  $('table tr').each((i, row) => {
    if (i === 0) return; // Skip header row

    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const companyName = $(cells[0]).text().trim();
    if (!companyName || companyName.length < 3) return;

    // Extract contact info from cells
    let city: string | undefined;
    let state: string | undefined;
    let zip: string | undefined;
    let contactName: string | undefined;
    let phone: string | undefined;
    let email: string | undefined;
    let website: string | undefined;
    const certifications: string[] = [];

    // Look for location (City, State ZIP)
    for (let j = 1; j < cells.length; j++) {
      const text = $(cells[j]).text().trim();
      const locationMatch = text.match(/^(.+?),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
      if (locationMatch) {
        [, city, state, zip] = locationMatch;
        break;
      }
    }

    // Look for contact information
    for (let j = 1; j < cells.length; j++) {
      const text = $(cells[j]).text().trim();
      
      if (text.includes('@') && !email) {
        email = text;
      }
      
      if (/\d{3}.*\d{3}.*\d{4}/.test(text) && !phone) {
        phone = text;
      }
      
      if (text.startsWith('http') || text.includes('www.')) {
        website = text.startsWith('http') ? text : `https://${text}`;
      }
    }

    // Look for certifications in the row
    const rowText = $(row).text().toLowerCase();
    if (rowText.includes('mbe') || rowText.includes('minority')) certifications.push('mbe');
    if (rowText.includes('wbe') || rowText.includes('women')) certifications.push('wbe');
    if (rowText.includes('dbe') || rowText.includes('disadvantaged')) certifications.push('dbe');
    if (rowText.includes('hubzone') || rowText.includes('hub zone')) certifications.push('hubzone');
    if (rowText.includes('veteran') || rowText.includes('sdvosb')) certifications.push('veteran');

    results.push({
      companyName,
      city,
      state,
      zip,
      contactName,
      phone,
      email,
      certifications,
      website,
    });
  });

  // Pattern 2: List items or cards
  if (results.length === 0) {
    $('li, .directory-item, .company-card, .vendor-item').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      
      if (text.length < 20) return; // Skip very short entries

      const companyName = $el.find('h3, h4, .company-name, .vendor-name, strong').first().text().trim() || 
                         $el.text().split('\n')[0]?.trim() || '';
      
      if (!companyName || companyName.length < 3) return;

      // Extract other information
      let city: string | undefined;
      let state: string | undefined;
      let zip: string | undefined;
      let contactName: string | undefined;
      let phone: string | undefined;
      let email: string | undefined;
      let website: string | undefined;
      const certifications: string[] = [];

      // Look for patterns in the text
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      for (const line of lines) {
        // Location pattern
        const locationMatch = line.match(/^(.+?),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
        if (locationMatch) {
          [, city, state, zip] = locationMatch;
          continue;
        }

        // Email pattern
        if (line.includes('@') && !email) {
          email = line;
          continue;
        }

        // Phone pattern
        if (/\d{3}.*\d{3}.*\d{4}/.test(line) && !phone) {
          phone = line;
          continue;
        }

        // Website pattern
        if ((line.startsWith('http') || line.includes('www.')) && !website) {
          website = line.startsWith('http') ? line : `https://${line}`;
          continue;
        }

        // Contact name pattern (assume it's a name if it has 2-4 words and no special chars)
        if (line.match(/^[A-Za-z\s]{2,50}$/) && !contactName && line.split(' ').length >= 2 && line.split(' ').length <= 4) {
          contactName = line;
          continue;
        }
      }

      // Look for certifications in the element text
      const lowerText = text.toLowerCase();
      if (lowerText.includes('mbe') || lowerText.includes('minority')) certifications.push('mbe');
      if (lowerText.includes('wbe') || lowerText.includes('women')) certifications.push('wbe');
      if (lowerText.includes('dbe') || lowerText.includes('disadvantaged')) certifications.push('dbe');
      if (lowerText.includes('hubzone') || lowerText.includes('hub zone')) certifications.push('hubzone');
      if (lowerText.includes('veteran') || lowerText.includes('sdvosb')) certifications.push('veteran');

      results.push({
        companyName,
        city,
        state,
        zip,
        contactName,
        phone,
        email,
        certifications,
        website,
      });
    });
  }

  return results;
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
 * Main scraper function for PA MWBE
 */
export async function scrapePaMwbe(): Promise<{
  source: string;
  contacts: SubcontractorContact[];
  errors: string[];
  durationMs: number;
}> {
  const start = Date.now();
  const contacts: SubcontractorContact[] = [];
  const errors: string[] = [];

  console.log('[pa_mwbe] Starting PA DGS MWBE directory scrape...');

  try {
    console.log('[pa_mwbe] Fetching MWBE directory...');
    
    const html = await fetchHtml(BASE_URL);
    const directoryResults = parseMwbeDirectory(html);
    
    console.log(`[pa_mwbe] Found ${directoryResults.length} companies in directory`);

    for (const company of directoryResults) {
      try {
        // Filter to Pittsburgh area only
        if (!isPittsburghArea(company)) {
          continue;
        }

        const contact: SubcontractorContact = {
          company_name: company.companyName,
          contact_name: company.contactName,
          email: company.email,
          phone: company.phone,
          naics_codes: [], // PA MWBE directory doesn't typically include NAICS codes
          sam_registered: false, // Can't assume SAM registration from MWBE listing
          cage_code: undefined,
          certifications: company.certifications,
          capabilities: undefined,
          website: company.website,
          city: company.city,
          state: company.state,
          zip: company.zip,
          source: SOURCE,
        };

        contacts.push(contact);
      } catch (error) {
        const errorMsg = `Error processing company "${company.companyName}": ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[pa_mwbe] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `PA MWBE scrape failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[pa_mwbe] ${errorMsg}`);
    errors.push(errorMsg);
  }

  const durationMs = Date.now() - start;
  console.log(`[pa_mwbe] Done. ${contacts.length} Pittsburgh-area contacts | ${errors.length} errors | ${durationMs}ms`);

  return {
    source: SOURCE,
    contacts,
    errors,
    durationMs,
  };
}
