// ============================================================
// SAM.GOV OPPORTUNITIES API CLIENT
// Endpoint: https://api.sam.gov/opportunities/v2/search
// Auth: SAMGOV_API_KEY query param
// Filters: PA state-wide, last 90 days
// Secondary filter: Pittsburgh area zips applied in normalize.ts
// Pagination: loops all pages (limit=100)
// Rate limit: exponential backoff on HTTP 429
// ============================================================

const SAM_BASE_URL = 'https://api.sam.gov/opportunities/v2/search';
const PAGE_LIMIT = 100;
const MAX_RESULTS = 50_000;  // GovTribe-style: capture more opportunities
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 2_000;

// Comprehensive NAICS codes for Pittsburgh region economy
const PITTSBURGH_REGION_NAICS = [
  // Construction (236, 237, 238)
  '236115', '236116', '236117', '236118', '236210', '236220', // Building Construction
  '237310', '237990', // Heavy/Civil Construction
  '238110', '238120', '238130', '238140', '238150', '238160', '238170', '238190', // Specialty Trade Contractors
  '238210', '238220', '238290', '238310', '238320', '238330', '238340', '238350', '238390', // Electrical, Plumbing, HVAC
  '238680', '238690', '238710', '238720', '238730', '238740', '238790', '238870', '238890', '238910', '238990', // Other Specialty Trades
  
  // Manufacturing (334, 335, 336)
  '334110', '334210', '334220', '334290', '334310', '334412', '334413', '334414', '334416', '334417', '334418', '334419', '334511', '334512', // Computer/Electronic
  '335110', '335120', '335210', '335220', '335230', '335311', '335312', '335313', '335314', '335999', // Electrical Equipment
  '336211', '336212', '336213', '336214', '336311', '336312', '336313', '336390', '336411', '336412', '336413', '336991', '336992', '336999', // Transportation Equipment
  
  // Professional/Scientific/Technical Services (541)
  '541110', '541120', '541130', '541140', '541150', '541160', '541190', // Custom Computer Programming
  '541211', '541212', '541213', '541214', '541215', '541216', '541219', '541330', '541340', '541350', '541360', '541370', '541380', '541390', '541410', '541420', '541430', '541490', '541511', '541512', '541513', '541519', '541511', '541512', '541513', '541519', '541611', '541612', '541613', '541614', '541620', '541690', '541711', '541712', '541713', '541714', '541715', '541720', '541990', // Various Professional Services
  
  // Administrative/Support Services (561)
  '561110', '561120', '561210', '561220', '561299', '561311', '561312', '561320', '561330', '561410', '561412', '561413', '561414', '561419', '561421', '561422', '561423', '561429', '561431', '561432', '561433', '561439', '561440', '561491', '561499', '561511', '561512', '561519', '561521', '561522', '561523', '561524', '561529', '561531', '561532', '561533', '561539', '561550', '561561', '561562', '561563', '561569', '561570', '561580', '561590', '561610', '561620', '561621', '561622', '561623', '561624', '561629', '561630', '561650', '561680', '561691', '561692', '561699', '561710', '561720', '561730', '561740', '561790', '561791', '561792', '561799', '561810', '561820', '561830', '561840', '561850', '561860', '561870', '561880', '561890', '561910', '561920', '561930', '561990', // Administrative Services
  
  // Healthcare (621, 622)
  '621111', '621112', '621210', '621310', '621320', '621330', '621340', '621391', '621399', '621400', '621410', '621420', '621491', '621493', '621498', '621499', '621511', '621512', '621520', '621530', '621540', '621550', '621560', '621570', '621580', '621590', '621610', '621620', '621630', '621640', '621691', '621692', '621699', '621999', // Ambulatory Health Care
  '622110', '622210', '622310', '622320', '622330', '622340', '622350', '622360', '622390', '622410', '622420', '622430', '622490', '622510', '622520', '622530', '622540', '622550', '622560', '622570', '622580', '622590', '622610', '622620', '622690', '622710', '622720', '622730', '622740', '622750', '622790', '622810', '622820', '622830', '622840', '622850', '622860', '622890', '622910', '622920', '622930', '622990', // Hospitals/Nursing
  
  // Educational Services (611)
  '611110', '611120', '611130', '611141', '611142', '611143', '611144', '611145', '611146', '611147', '611148', '611149', '611150', '611151', '611152', '611153', '611154', '611155', '611156', '611157', '611158', '611159', '611160', '611161', '611162', '611163', '611164', '611165', '611166', '611167', '611168', '611169', '611170', '611171', '611172', '611173', '611174', '611175', '611176', '611177', '611178', '611179', '611180', '611181', '611182', '611183', '611184', '611185', '611186', '611187', '611188', '611189', '611190', '611191', '611192', '611193', '611194', '611195', '611196', '611197', '611198', '611199', '611210', '611220', '611230', '611310', '611320', '611330', '611410', '611420', '611430', '611511', '611512', '611513', '611514', '611515', '611516', '611517', '611518', '611519', '611520', '611530', '611610', '611620', '611630', '611640', '611690', '611710', '611720', '611730', '611810', '611820', '611830', '611840', '611850', '611860', '611870', '611880', '611890', '611910', '611920', '611930', '611990', // Educational Services
  
  // Information Technology/Data Processing (518, 511)
  '518210', '518212', '518213', '518214', '518219', '518310', '518311', '518312', '518313', '518314', '518315', '518316', '518317', '518318', '518319', '518410', '518412', '518413', '518414', '518415', '518416', '518417', '518418', '518419', '518510', '518512', '518513', '518514', '518515', '518516', '518517', '518518', '518519', '518890', '518910', '518991', '518992', '518999', // Data Processing/Hosting
  '511110', '511120', '511130', '511140', '511190', '511210', '511212', '511213', '511219', '511310', '511320', '511330', '511340', '511410', '511420', '511430', '511440', '511490', '511510', '511512', '511513', '511514', '511515', '511516', '511517', '511518', '511519', '511520', '511530', '511540', '511590', '511610', '511620', '511630', '511690', '511710', '511720', '511730', '511790', '511810', '511820', '511830', '511890', '511910', '511920', '511930', '511990', // Publishing/Information
  
  // Food Services (722)
  '722110', '722211', '722212', '722213', '722214', '722215', '722220', '722310', '722320', '722330', '722410', '722511', '722512', '722513', '722514', '722515', '722320', '722330', '722410', '722511', '722512', '722513', '722514', '722515', // Food Services
  
  // Repair/Maintenance (811)
  '811111', '811112', '811118', '811119', '811121', '811122', '811123', '811124', '811125', '811126', '811127', '811128', '811129', '811130', '811140', '811150', '811160', '811190', '811192', '811198', '811199', '811211', '811212', '811213', '811214', '811219', '811221', '811222', '811229', '811231', '811232', '811239', '811241', '811242', '811249', '811251', '811252', '811259', '811261', '811262', '811269', '811271', '811272', '811279', '811281', '811282', '811289', '811291', '811292', '811299', '811310', '811320', '811330', '811340', '811350', '811360', '811370', '811380', '811390', '811411', '811412', '811413', '811414', '811415', '811416', '811417', '811418', '811419', '811420', '811421', '811422', '811429', '811430', '811440', '811450', '811460', '811470', '811480', '811490', '811511', '811512', '811513', '811514', '811515', '811516', '811517', '811518', '811519', '811520', '811530', '811590', '811610', '811620', '811630', '811690', '811710', '811720', '811730', '811790', '811810', '811820', '811830', '811890', '811910', '811920', '811930', '811990', // Repair/Maintenance
];

export interface SamGovPlaceOfPerformance {
  city?: { name?: string; code?: string };
  state?: { name?: string; code?: string };
  zip?: string;
  country?: { name?: string; code?: string };
  county?: { name?: string; code?: string };
}

export interface SamGovAward {
  date?: string;
  number?: string;
  amount?: string;
  awardee?: {
    name?: string;
    ueiSAM?: string;
    location?: SamGovPlaceOfPerformance;
  };
}

export interface SamGovPointOfContact {
  type?: string;
  title?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  fax?: string;
}

export interface SamGovOpportunity {
  noticeId: string;
  title: string;
  solicitationNumber?: string;
  fullParentPathName?: string;
  fullParentPathCode?: string;
  postedDate?: string;
  type?: string;
  baseType?: string;
  archiveType?: string;
  archiveDate?: string;
  typeOfSetAsideDescription?: string;
  typeOfSetAside?: string;
  responseDeadLine?: string;
  naicsCode?: string;
  naicsCodes?: string[];
  classificationCode?: string;
  active?: string;
  award?: SamGovAward;
  pointOfContact?: SamGovPointOfContact[];
  description?: string;
  organizationType?: string;
  officeAddress?: {
    zipcode?: string;
    city?: string;
    countryCode?: string;
    state?: string;
  };
  placeOfPerformance?: SamGovPlaceOfPerformance;
  additionalInfoLink?: string;
  uiLink?: string;
  links?: Array<{ rel?: string; href?: string }>;
  resourceLinks?: string[];
}

export interface SamGovSearchResponse {
  totalRecords: number;
  limit: number;
  offset: number;
  opportunitiesData: SamGovOpportunity[];
}

export interface FetchAllOpportunitiesResult {
  opportunities: SamGovOpportunity[];
  totalFetched: number;
  totalAvailable: number;
  errors: string[];
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a single page from SAM.gov with exponential backoff on 429.
 */
async function fetchPage(
  apiKey: string,
  offset: number,
  postedFrom: string,
  postedTo: string,
): Promise<SamGovSearchResponse> {
  // GovTribe-style: Fetch ALL US opportunities (no state filter)
  // Post-fetch filter keeps opportunities relevant to Pittsburgh businesses:
  // 1. Place of performance in Pittsburgh MSA
  // 2. Office address in Pittsburgh MSA  
  // 3. No location specified (national contracts where Pittsburgh can bid)
  // 4. Set-asides that Pittsburgh small businesses qualify for
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: String(PAGE_LIMIT),
    offset: String(offset),
    postedFrom,
    postedTo,
    ptype: 'o,k,r,s,p,u,a,g',  // Added g=grant
    status: 'active',
    // NO state filter - get all US opportunities
  });

  const url = `${SAM_BASE_URL}?${params.toString()}`;

  let attempt = 0;
  let backoffMs = INITIAL_BACKOFF_MS;

  while (attempt <= MAX_RETRIES) {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status === 429) {
      attempt++;
      if (attempt > MAX_RETRIES) {
        throw new Error(`SAM.gov rate limit exceeded after ${MAX_RETRIES} retries (offset=${offset})`);
      }
      console.warn(
        `[samgov] Rate limited (429) at offset=${offset}. Retrying in ${backoffMs}ms (attempt ${attempt}/${MAX_RETRIES})`,
      );
      await sleep(backoffMs);
      backoffMs = Math.min(backoffMs * 2, 60_000);
      continue;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `SAM.gov API error: HTTP ${response.status} at offset=${offset}. Body: ${body.slice(0, 500)}`,
      );
    }

    const data = (await response.json()) as SamGovSearchResponse;
    return data;
  }

  throw new Error(`fetchPage exhausted retries at offset=${offset}`);
}

/**
 * Builds the postedFrom date string (MM/DD/YYYY) for N days ago.
 */
function daysAgoDateString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Builds today's date string (MM/DD/YYYY).
 */
function todayDateString(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Fetches ALL US SAM.gov opportunities (GovTribe-style).
 * Returns national opportunities relevant to Pittsburgh businesses.
 * Paginates through all pages (up to MAX_RESULTS).
 * 
 * @param apiKey - SAM.gov API key (from SAMGOV_API_KEY env var)
 * @param lookbackDays - Number of days to look back (default 365)
 */
export async function fetchAllUSOpportunities(
  apiKey: string,
  lookbackDays = 365,
): Promise<FetchAllOpportunitiesResult> {
  if (!apiKey) {
    throw new Error('SAM.gov API key is required. Set SAMGOV_API_KEY in environment.');
  }

  const postedFrom = daysAgoDateString(lookbackDays);
  const postedTo = todayDateString();

  console.log(`[samgov] Fetching ALL US opportunities from ${postedFrom} to ${postedTo}`);

  const allOpportunities: SamGovOpportunity[] = [];
  const errors: string[] = [];
  let offset = 0;
  let totalAvailable = 0;

  // First page — establishes totalRecords
  let firstPage: SamGovSearchResponse;
  try {
    firstPage = await fetchPage(apiKey, offset, postedFrom, postedTo);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[samgov] Failed to fetch first page: ${msg}`);
    return { opportunities: [], totalFetched: 0, totalAvailable: 0, errors: [msg] };
  }

  totalAvailable = firstPage.totalRecords ?? 0;
  console.log(`[samgov] Total records available in PA: ${totalAvailable}`);

  if (firstPage.opportunitiesData?.length) {
    allOpportunities.push(...firstPage.opportunitiesData);
  }

  offset += PAGE_LIMIT;
  const effectiveMax = Math.min(totalAvailable, MAX_RESULTS);

  while (offset < effectiveMax) {
    try {
      const page = await fetchPage(apiKey, offset, postedFrom, postedTo);
      const records = page.opportunitiesData ?? [];

      if (records.length === 0) {
        console.log(`[samgov] Empty page at offset=${offset}, stopping.`);
        break;
      }

      allOpportunities.push(...records);
      console.log(
        `[samgov] Fetched offset=${offset}: ${records.length} records (running total: ${allOpportunities.length})`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[samgov] Error at offset=${offset}: ${msg}`);
      errors.push(msg);
      // Continue to next page rather than aborting entire ingestion
    }

    offset += PAGE_LIMIT;

    // Small courtesy delay between pages to avoid hammering the API
    await sleep(200);
  }

  console.log(
    `[samgov] Fetch complete. Total fetched: ${allOpportunities.length} / ${totalAvailable} available`,
  );
  if (errors.length > 0) {
    console.warn(`[samgov] ${errors.length} page error(s) encountered during fetch.`);
  }

  return {
    opportunities: allOpportunities,
    totalFetched: allOpportunities.length,
    totalAvailable,
    errors,
  };
}

// ============================================================
// MAIN SCRAPER FUNCTION
// ============================================================

import { normalizeSamGovOpportunities } from './normalize';
import type { ScraperResult } from './shared/normalize_shared';

/**
 * Main SAM.gov scraper - fetches and normalizes opportunities
 * This is the function called by the ingestion runner
 */
export async function scrapeSAMGov(): Promise<ScraperResult> {
  const start = Date.now();
  const apiKey = process.env.SAMGOV_API_KEY;
  
  if (!apiKey) {
    return {
      source: 'federal_samgov' as const,
      opportunities: [],
      errors: ['SAMGOV_API_KEY not configured in environment variables'],
      durationMs: 0,
    };
  }
  
  try {
    // Fetch all US opportunities (GovTribe-style, not just PA)
    const result = await fetchAllUSOpportunities(apiKey, 365);
    
    // Normalize to our schema
    const normalized = normalizeSamGovOpportunities(result.opportunities);
    
    const durationMs = Date.now() - start;
    
    console.log(`[scrapeSAMGov] Complete: ${normalized.length} opportunities (${result.totalAvailable} available)`);
    
    return {
      source: 'federal_samgov' as const,
      opportunities: normalized,
      errors: result.errors,
      durationMs,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[scrapeSAMGov] Fatal error:', msg);
    
    return {
      source: 'federal_samgov' as const,
      opportunities: [],
      errors: [msg],
      durationMs: Date.now() - start,
    };
  }
}
