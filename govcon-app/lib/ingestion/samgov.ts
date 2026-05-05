// ============================================================
// SAM.GOV OPPORTUNITIES API CLIENT
// Endpoint: https://api.sam.gov/opportunities/v2/search
// Auth: SAMGOV_API_KEY query param
// Filters: PA state-wide, last 30 days
// Pagination: loops all pages (limit=100), stops at end
// ============================================================

const SAM_BASE_URL = 'https://api.sam.gov/opportunities/v2/search';
const PAGE_LIMIT = 100;
const MAX_RESULTS = 500;  // Task 027 constraint: Single ingest run = ≤500 records
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 2_000;

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
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: String(PAGE_LIMIT),
    offset: String(offset),
    postedFrom,
    postedTo,
    ptype: 'o,k,r,s,p,u,a,g',
    status: 'active',
    state: 'PA', // Task 027 constraint: filter at the API level
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
 * Fetches SAM.gov opportunities for PA.
 * Paginates up to MAX_RESULTS (500).
 * 
 * @param apiKey - SAM.gov API key
 * @param lookbackDays - Number of days to look back (default 30)
 */
export async function fetchPAOpportunities(
  apiKey: string,
  lookbackDays = 30, // Task 027 constraint: Lookback 30 days
): Promise<FetchAllOpportunitiesResult> {
  if (!apiKey) {
    throw new Error('SAM.gov API key is required. Set SAMGOV_API_KEY in environment.');
  }

  const postedFrom = daysAgoDateString(lookbackDays);
  const postedTo = todayDateString();

  console.log(`[samgov] Fetching PA opportunities from ${postedFrom} to ${postedTo}`);

  const allOpportunities: SamGovOpportunity[] = [];
  const errors: string[] = [];
  let offset = 0;
  let totalAvailable = 0;

  // First page
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
    }

    offset += PAGE_LIMIT;
    await sleep(200);
  }

  console.log(
    `[samgov] Fetch complete. Total fetched: ${allOpportunities.length} / ${totalAvailable} available`,
  );
  
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

import { normalizePittsburghOpportunities } from './normalize';
import type { ScraperResult } from './shared/normalize_shared';

export async function scrapeSAMGov(): Promise<ScraperResult> {
  const start = Date.now();
  const apiKey = process.env.SAMGOV_API_KEY;
  
  if (!apiKey) {
    return {
      source: 'federal_samgov' as const,
      opportunities: [],
      errors: ['SAMGOV_API_KEY not configured'],
      durationMs: 0,
    };
  }
  
  try {
    const result = await fetchPAOpportunities(apiKey, 30);
    
    // Normalize mapping still used to conform to our DB schema, 
    // but the input is now constrained to PA at the API level
    const batchResult = normalizePittsburghOpportunities(result.opportunities);
    const normalized = batchResult.normalized;
    
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
