// ============================================================
// SAM.GOV FORECAST OPPORTUNITIES INGESTION — TASK_018
// Fetches pre-solicitation forecasts from SAM.gov API
// Filters to Pittsburgh / Pennsylvania area
// Runs daily (06:30 UTC) via Netlify cron
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const SAMGOV_BASE      = 'https://api.sam.gov/opportunities/v2/search';
const SAMGOV_KEY       = process.env.SAMGOV_API_KEY ?? '';

export interface ForecastRecord {
  sam_notice_id:               string;
  title:                       string;
  agency_name:                 string | null;
  naics_code:                  string | null;
  estimated_solicitation_date: string | null;
  estimated_award_date:        string | null;
  estimated_value:             number | null;  // cents
  set_aside_type:              string | null;
  description:                 string | null;
  poc_name:                    string | null;
  poc_email:                   string | null;
  poc_phone:                   string | null;
  place_of_performance_city:   string | null;
  place_of_performance_state:  string;
  source:                      string;
  status:                      string;
}

export interface ForecastIngestionResult {
  ingested: number;
  updated:  number;
  errors:   string[];
}

function parseCents(val: string | number | undefined | null): number | null {
  if (!val) return null;
  const n = typeof val === 'string' ? parseFloat(val.replace(/[,$]/g, '')) : val;
  return isNaN(n) ? null : Math.round(n * 100);
}

function extractDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

async function fetchForecastPage(page: number, limit: number = 100): Promise<{ data: any[]; total: number }> {
  const params = new URLSearchParams({
    api_key: SAMGOV_KEY,
    limit:   String(limit),
    offset:  String((page - 1) * limit),
    type:    'FORECAST',
    ptype:   'PRESOL',  // Pre-solicitation (forecasts)
    state:   'PA',
  });

  const url = `${SAMGOV_BASE}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PGH-Gov-Contracts/1.0', Accept: 'application/json' },
    signal:  AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`SAM.gov HTTP ${res.status}: ${await res.text().catch(() => '')}`);
  const json = await res.json();

  const opportunities = json.opportunitiesData ?? json.data ?? [];
  const total         = json.totalRecords ?? json.total ?? opportunities.length;
  return { data: opportunities, total };
}

function mapForecastRecord(opp: any): ForecastRecord | null {
  const noticeId = opp.noticeId ?? opp.notice_id ?? opp.id;
  if (!noticeId) return null;
  const title = opp.title ?? opp.subject ?? '';
  if (!title) return null;

  const poc = opp.pointOfContact?.[0] ?? opp.poc?.[0] ?? {};
  const agency = opp.organizationHierarchy
    ? opp.organizationHierarchy.map((o: any) => o.name).join(' / ')
    : (opp.department ?? opp.agency ?? opp.subtierAgency ?? null);

  const city = opp.placeOfPerformance?.city?.name ?? opp.pop_city ?? null;
  const state = opp.placeOfPerformance?.state?.code ?? opp.pop_state ?? 'PA';

  return {
    sam_notice_id:               String(noticeId),
    title,
    agency_name:                 agency,
    naics_code:                  opp.naicsCode ?? opp.naics ?? null,
    estimated_solicitation_date: extractDate(opp.responseDeadLine ?? opp.archiveDate ?? opp.estimatedSolicitationDate),
    estimated_award_date:        extractDate(opp.estimatedAwardDate ?? opp.estimated_award_date),
    estimated_value:             parseCents(opp.awardAmount ?? opp.estimatedTotalValue ?? opp.estimated_value),
    set_aside_type:              opp.typeOfSetAside ?? opp.set_aside ?? null,
    description:                 opp.description ?? opp.synopsis ?? null,
    poc_name:                    poc.fullName ?? poc.name ?? null,
    poc_email:                   poc.email ?? null,
    poc_phone:                   poc.phone ?? poc.phoneNumber ?? null,
    place_of_performance_city:   city,
    place_of_performance_state:  state,
    source:                      'federal_samgov_forecast',
    status:                      'active',
  };
}

export async function ingestSamGovForecasts(maxPages: number = 10): Promise<ForecastIngestionResult> {
  const db = createClient(SUPABASE_URL, SUPABASE_SVC_KEY);
  const errors: string[] = [];
  let ingested = 0;
  let updated  = 0;
  const limit  = 100;

  for (let page = 1; page <= maxPages; page++) {
    let data: any[];
    let total: number;

    try {
      ({ data, total } = await fetchForecastPage(page, limit));
    } catch (err) {
      errors.push(`Page ${page}: ${err instanceof Error ? err.message : String(err)}`);
      break;
    }

    if (!data.length) break;

    // Filter to Pittsburgh area (PA confirmed in API filter, but also accept adjacent cities)
    const pghData = data.filter((opp) => {
      const state = opp.placeOfPerformance?.state?.code ?? opp.pop_state ?? '';
      return state === 'PA' || state === '';
    });

    for (const opp of pghData) {
      const record = mapForecastRecord(opp);
      if (!record) continue;

      const { data: upserted, error } = await db
        .from('forecast_opportunities')
        .upsert(record, { onConflict: 'sam_notice_id' })
        .select('id');

      if (error) {
        errors.push(`Upsert ${record.sam_notice_id}: ${error.message}`);
      } else {
        if (upserted && upserted.length > 0) ingested++;
        else updated++;
      }
    }

    if (page * limit >= total) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  // After ingestion, link forecasts to live opportunities by matching title keywords
  await linkForecastsToOpportunities(db).catch((err) => {
    errors.push(`Link step: ${err.message}`);
  });

  console.log(`[SAM Forecasts] Ingested=${ingested} Updated=${updated} Errors=${errors.length}`);
  return { ingested, updated, errors };
}

async function linkForecastsToOpportunities(db: ReturnType<typeof createClient>) {
  // Find forecasts whose status changed to 'solicited' — where a matching live opportunity exists
  const { data: forecasts } = await db
    .from('forecast_opportunities')
    .select('id, title, agency_name, naics_code')
    .eq('status', 'active')
    .is('linked_opportunity_id', null)
    .limit(200);

  if (!forecasts?.length) return;

  for (const forecast of forecasts) {
    const keywords = forecast.title.split(' ').slice(0, 4).join(' ');
    const { data: match } = await db
      .from('opportunities')
      .select('id')
      .textSearch('fts', keywords, { type: 'websearch' })
      .eq('agency', forecast.agency_name ?? '')
      .limit(1)
      .maybeSingle();

    if (match) {
      await db.from('forecast_opportunities')
        .update({ linked_opportunity_id: match.id, status: 'solicited' })
        .eq('id', forecast.id);
    }
  }
}
