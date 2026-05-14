export const dynamic = 'force-dynamic';

// ============================================================
// GET /api/cron/usaspending  (TASK_027 Phase 1)
// Vercel cron runs this weekly.
//
// Fetches PA recipient federal awards from the last 24 months from
// USASpending.gov (free, no key) and upserts into contract_awards.
// This is the data that powers /agencies/[id] and /vendors/[uei]
// aggregation queries.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { fetchPAAwards, type USASpendingAward } from '@/lib/ingestion/usaspending';
import { upsertAwards } from '@/lib/db/upsert';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';

interface ScrapedAward {
  source: string;
  title: string;
  agency_name: string;
  solicitation_number?: string;
  dedup_hash: string;
  canonical_sources: string[];
  naics_code?: number;
  naics_sector?: string;
  contract_type: string;
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

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function toScrapedAward(raw: USASpendingAward): ScrapedAward {
  const id = (raw as any)['Award ID'] ?? raw.Award_ID ?? raw.piid ?? '';
  const recipient = (raw as any)['Recipient Name'] ?? raw.Recipient_Name ?? '';
  const agency = (raw as any)['Awarding Agency'] ?? raw.Awarding_Agency ?? '';
  const amount = (raw as any)['Award Amount'] ?? raw.Award_Amount ?? 0;
  const date = (raw as any)['Award Date'] ?? raw.Award_Date ?? '';
  const description = (raw as any)['Description'] ?? raw.Description ?? '';
  const naicsRaw = (raw as any)['naics_code'] ?? raw.naics_code;
  const piid = (raw as any)['piid'] ?? raw.piid ?? id;

  const naicsNum =
    typeof naicsRaw === 'string' ? parseInt(naicsRaw, 10) : naicsRaw;

  const dedupHash = sha256(
    `${(piid || id).toString().toLowerCase()}|${(agency || '').toLowerCase()}|${date}`,
  );

  return {
    source: 'federal_usaspending',
    title: description?.toString().slice(0, 200) || `Award ${piid || id}`,
    agency_name: agency?.toString() || 'Unknown',
    solicitation_number: (piid || id)?.toString() || undefined,
    dedup_hash: dedupHash,
    canonical_sources: ['federal_usaspending'],
    naics_code: Number.isFinite(naicsNum) ? naicsNum : undefined,
    naics_sector: undefined,
    contract_type: 'contract',
    award_date: date || undefined,
    contract_start_date: undefined,
    contract_end_date: undefined,
    awardee_name: recipient?.toString() || undefined,
    place_of_performance_city: '',
    place_of_performance_state: 'PA',
    description: description?.toString() || '',
    url: id ? `https://www.usaspending.gov/award/${encodeURIComponent(id.toString())}` : '',
    status: 'awarded',
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET missing.' }, { status: 500 });
  }
  if (!isAuthorizedCronRequest(req, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const raw = await fetchPAAwards();
    const awards = raw.map(toScrapedAward);
    const { inserted, errors } = await upsertAwards(awards, 'federal_usaspending');

    return NextResponse.json({
      success: errors.length === 0,
      fetched: raw.length,
      inserted,
      errors,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      },
      { status: 500 },
    );
  }
}
