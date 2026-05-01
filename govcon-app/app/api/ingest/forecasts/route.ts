export const dynamic = 'force-dynamic';

// ============================================================
// GET/POST /api/ingest/forecasts — daily forecast ingestion
// Cron: 30 6 * * * (06:30 UTC daily)
// Also triggers weekly incumbent backfill if ?incumbents=1
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ingestSamGovForecasts } from '@/lib/ingestion/forecasts/samgov_forecasts';
import { ingestIncumbents } from '@/lib/ingestion/incumbents/fpds_lookup';

export const maxDuration = 300;

async function handler(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET ?? '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const doIncumbents = searchParams.get('incumbents') === '1';
  const maxPages     = Math.min(20, parseInt(searchParams.get('max_pages') ?? '10'));

  const results: Record<string, any> = {};

  console.log('[ingest/forecasts] Starting SAM.gov forecast ingestion');
  results.forecasts = await ingestSamGovForecasts(maxPages);
  console.log('[ingest/forecasts] Forecasts done:', results.forecasts);

  if (doIncumbents) {
    console.log('[ingest/forecasts] Starting FPDS incumbent ingestion');
    results.incumbents = await ingestIncumbents([], 5);
    console.log('[ingest/forecasts] Incumbents done:', results.incumbents);
  }

  return NextResponse.json({ ...results, timestamp: new Date().toISOString() });
}

export async function GET(req: NextRequest) { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }
