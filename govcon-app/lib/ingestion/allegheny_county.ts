// ============================================================
// ALLEGHENY COUNTY CONTRACTS SCRAPER
// Source: Allegheny County PAVNextGen Contracts API
//   API:    https://documents.alleghenycounty.us/PAVNextGen/api
//   Portal: https://documents.alleghenycounty.us/PAVClient/ContractSearch/index.html
// Type: REST JSON API (no auth required, cloud-accessible)
// Query ID 232 = "Contracts - 2015" (all contracts since 2015)
// Fetches in date-range windows to work around the 2,000-record truncation limit.
// ============================================================

import type { ScraperResult, ScrapedOpportunity } from './shared/normalize_shared';
import { computeDedupHash } from './shared/normalize_shared';

// Awards table type (separate from opportunities)
interface ScrapedAward {
  source: 'local_allegheny';
  title: string;
  agency_name: string;
  solicitation_number?: string;
  dedup_hash: string;
  canonical_sources: ['local_allegheny'];
  naics_code?: number;
  naics_sector?: string;
  contract_type: 'contract';
  award_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  awardee_name?: string;
  place_of_performance_city: string;
  place_of_performance_state: string;
  description: string;
  url: string;
  status: 'awarded';
}

const SOURCE = 'local_allegheny' as const;
const PORTAL_URL = 'https://documents.alleghenycounty.us/PAVClient/ContractSearch/index.html';
const API_URL = 'https://documents.alleghenycounty.us/PAVNextGen/api/CustomQuery/KeywordSearch';
const QUERY_ID = 232; // "Contracts - 2015"
const FETCH_TIMEOUT_MS = 60_000;

// Date ranges to overcome the 2,000-record server-side truncation limit
const DATE_RANGES: Array<[string, string]> = [
  ['01/01/2015', '12/31/2020'],
  ['01/01/2021', '12/31/2022'],
  ['01/01/2023', '12/31/2024'],
  ['01/01/2025', '12/31/2030'],
];

interface PAVRecord {
  ID: string;
  Name: string;
  DisplayColumnValues: Array<{ Value: string; RawValue: string | null }>;
}

interface PAVResponse {
  Data: PAVRecord[];
  Truncated: boolean;
}

async function fetchContractRange(fromDate: string, toDate: string): Promise<PAVRecord[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'GovConAssistantBot/1.0',
        Referer: PORTAL_URL,
        Origin: 'https://documents.alleghenycounty.us',
      },
      body: JSON.stringify({
        QueryID: QUERY_ID,
        Keywords: [],
        FromDate: fromDate,
        ToDate: toDate,
        QueryLimit: 0,
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} for range ${fromDate}–${toDate}`);

    const data: PAVResponse = await res.json();
    return data.Data ?? [];
  } finally {
    clearTimeout(timer);
  }
}

function parseDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  // Input: "M/D/YYYY"
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return undefined;
  const [, mo, dy, yr] = m;
  const iso = `${yr}-${mo.padStart(2, '0')}-${dy.padStart(2, '0')}`;
  // Sanity check — reject dates before 2000 or after 2040
  if (iso < '2000-01-01' || iso > '2040-12-31') return undefined;
  return iso;
}

function mapRecord(rec: PAVRecord): ScrapedAward | null {
  const cols = rec.DisplayColumnValues ?? [];
  const dept   = cols[0]?.Value?.trim() ?? '';
  const vendor = cols[1]?.Value?.trim() ?? '';
  const agree  = cols[2]?.Value?.trim() ?? '';
  const start  = cols[3]?.Value?.trim() ?? '';
  const end    = cols[4]?.Value?.trim() ?? '';

  // Skip records with no meaningful data
  if (!dept && !agree) return null;

  // Build title: "Vendor — Department — Agreement #N"
  const parts = [vendor, dept, agree ? `Agreement #${agree}` : ''].filter(Boolean);
  const title = parts.join(' — ') || `Allegheny County Contract ${agree}`;

  const agency = dept ? `Allegheny County - ${dept}` : 'Allegheny County';
  const contractEndDate = parseDate(end);
  const contractStartDate = parseDate(start);
  const awardDate = contractStartDate; // Use start date as award date

  const dedupHash = computeDedupHash(title, agency, contractEndDate ?? null);

  return {
    source: SOURCE,
    title: title.slice(0, 500),
    agency_name: agency.slice(0, 255),
    solicitation_number: agree || undefined,
    dedup_hash: dedupHash,
    canonical_sources: [SOURCE],
    naics_code: undefined,
    naics_sector: undefined,
    contract_type: 'contract',
    award_date: awardDate,
    contract_start_date: contractStartDate,
    contract_end_date: contractEndDate,
    awardee_name: vendor || undefined,
    place_of_performance_city: 'Pittsburgh',
    place_of_performance_state: 'PA',
    description: `Allegheny County contract. Vendor: ${vendor || 'N/A'}. Department: ${dept || 'N/A'}. Agreement #${agree}. Period: ${start} to ${end}`.slice(0, 1000),
    url: PORTAL_URL,
    status: 'awarded',
  };
}

export async function scrapeAlleghenyCounty(): Promise<ScraperResult & { awards: ScrapedAward[] }> {
  const start = Date.now();
  const errors: string[] = [];
  const seen = new Set<string>();
  const awards: ScrapedAward[] = [];

  console.log('[allegheny_county] Starting PAVNextGen API fetch...');
  console.log('[allegheny_county] NOTE: These are HISTORICAL AWARDS — writing to contract_awards table');

  for (const [fromDate, toDate] of DATE_RANGES) {
    console.log(`[allegheny_county] Fetching ${fromDate} → ${toDate}...`);
    try {
      const records = await fetchContractRange(fromDate, toDate);
      console.log(`[allegheny_county] Got ${records.length} records for ${fromDate}–${toDate}`);

      for (const rec of records) {
        const award = mapRecord(rec);
        if (!award) continue;
        if (seen.has(award.dedup_hash)) continue;
        seen.add(award.dedup_hash);
        awards.push(award);
      }
    } catch (err) {
      const msg = `Failed to fetch range ${fromDate}–${toDate}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[allegheny_county] ${msg}`);
      errors.push(msg);
    }
  }

  const durationMs = Date.now() - start;
  console.log(
    `[allegheny_county] Done. ${awards.length} unique awards | ${errors.length} errors | ${durationMs}ms`,
  );

  // Return empty opportunities array (for backwards compat) + awards array
  return { source: SOURCE, opportunities: [], awards, errors, durationMs };
}
