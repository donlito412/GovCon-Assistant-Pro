// ============================================================
// FPDS / USASpending INCUMBENT LOOKUP — TASK_018
// Queries USASpending.gov for active awards in Pittsburgh area,
// identifies expiring contracts, and upserts into incumbent_contracts.
// Called by: POST /api/ingest/incumbents (weekly Sunday cron)
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const USA_SPENDING_URL = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';

export interface IncumbentRecord {
  solicitation_number:            string | null;
  current_awardee_name:           string;
  current_awardee_uei:            string | null;
  award_date:                     string | null;
  award_amount:                   number | null;  // cents
  period_of_performance_end_date: string | null;
  base_period_months:             number | null;
  option_periods:                 object[];
  agency_name:                    string | null;
  naics_code:                     string | null;
  usaspending_award_id:           string;
}

export interface IngestionResult {
  ingested: number;
  updated:  number;
  errors:   string[];
}

// Normalize company names: strip legal suffixes and lowercase for dedup
export function normalizeAwardeeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(inc|llc|corp|ltd|co|lp|llp|dba|the)\b\.?/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pittsburgh-area ZIP codes for place of performance filter
const PGH_ZIPS = [
  '15201','15202','15203','15204','15205','15206','15207','15208','15209',
  '15210','15211','15212','15213','15214','15215','15216','15217','15218',
  '15219','15220','15221','15222','15223','15224','15225','15226','15227',
  '15228','15229','15230','15231','15232','15233','15234','15235','15236',
  '15237','15238','15239','15240','15241','15242','15243','15244','15250',
];

interface USASpendingAward {
  'Award ID':                         string;
  'Recipient Name':                   string;
  'recipient_uei':                    string | null;
  'Award Amount':                     number;
  'Awarding Agency':                  string;
  'Award Date':                       string;
  'Period of Performance End Date':   string;
  'NAICS Code':                       string;
  'Description':                      string;
  'Contract Award Type':              string;
}

async function fetchAwardsPage(
  naicsCodes: string[],
  page: number,
  perPage: number = 100,
): Promise<{ results: USASpendingAward[]; hasMore: boolean }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + 1); // include today

  const body = {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      place_of_performance_locations: [{ country: 'USA', state: 'PA', city: 'Pittsburgh' }],
      ...(naicsCodes.length > 0 ? { naics_codes: naicsCodes } : {}),
      // Only awards with end date in the future (still active or recently expired)
      time_period: [{
        start_date: new Date(Date.now() - 365 * 2 * 86400000).toISOString().slice(0, 10),
        end_date:   cutoffDate.toISOString().slice(0, 10),
        date_type:  'action_date',
      }],
    },
    fields: [
      'Award ID', 'Recipient Name', 'recipient_uei',
      'Award Amount', 'Awarding Agency', 'Award Date',
      'Period of Performance End Date', 'NAICS Code', 'Description',
      'Contract Award Type',
    ],
    page, limit: perPage,
    sort: 'Period of Performance End Date', order: 'asc',
  };

  const res = await fetch(USA_SPENDING_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'PGH-Gov-Contracts/1.0' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`USASpending HTTP ${res.status}`);
  const json = await res.json();
  const results: USASpendingAward[] = json.results ?? [];
  const total: number = json.page_metadata?.total ?? 0;
  return { results, hasMore: page * perPage < total };
}

export async function ingestIncumbents(
  naicsCodes: string[] = [],
  maxPages: number = 5,
): Promise<IngestionResult> {
  const db = createClient(SUPABASE_URL, SUPABASE_SVC_KEY);
  const errors: string[] = [];
  let ingested = 0;
  let updated  = 0;

  for (let page = 1; page <= maxPages; page++) {
    let results: USASpendingAward[];
    let hasMore: boolean;

    try {
      ({ results, hasMore } = await fetchAwardsPage(naicsCodes, page));
    } catch (err) {
      errors.push(`Page ${page}: ${err instanceof Error ? err.message : String(err)}`);
      break;
    }

    if (!results.length) break;

    for (const award of results) {
      const awardId = award['Award ID'];
      if (!awardId) continue;

      const endDateStr = award['Period of Performance End Date'];
      if (!endDateStr) continue;

      // Only care about awards expiring in the future (recompetes)
      const endDate = new Date(endDateStr);
      if (endDate < new Date(Date.now() - 30 * 86400000)) continue; // skip expired >30 days ago

      // Estimate base period: from award date to end date (rough months)
      let baseMonths: number | null = null;
      if (award['Award Date'] && endDateStr) {
        const start = new Date(award['Award Date']);
        const end   = new Date(endDateStr);
        baseMonths  = Math.round((end.getTime() - start.getTime()) / (30.44 * 86400000));
      }

      const record: IncumbentRecord = {
        solicitation_number:            null,
        current_awardee_name:           award['Recipient Name'] ?? 'Unknown',
        current_awardee_uei:            award['recipient_uei'] ?? null,
        award_date:                     award['Award Date'] ?? null,
        award_amount:                   award['Award Amount'] ? Math.round(award['Award Amount'] * 100) : null,
        period_of_performance_end_date: endDateStr,
        base_period_months:             baseMonths,
        option_periods:                 [],
        agency_name:                    award['Awarding Agency'] ?? null,
        naics_code:                     award['NAICS Code'] ?? null,
        usaspending_award_id:           awardId,
      };

      const { error, data } = await db
        .from('incumbent_contracts')
        .upsert(record, { onConflict: 'usaspending_award_id' })
        .select('id');

      if (error) {
        errors.push(`Upsert ${awardId}: ${error.message}`);
      } else {
        if (data && data.length > 0) ingested++;
        else updated++;
      }
    }

    if (!hasMore) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`[FPDS] Ingested=${ingested} Updated=${updated} Errors=${errors.length}`);
  return { ingested, updated, errors };
}
