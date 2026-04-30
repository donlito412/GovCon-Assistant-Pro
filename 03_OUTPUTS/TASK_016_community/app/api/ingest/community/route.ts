// ============================================================
// GET/POST /api/ingest/community — PA Corps weekly ingestion
// Cron: Sundays 14:00 UTC
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ingestPaCorps } from '../../../../lib/ingestion/community/pa_corps';

export const maxDuration = 300;

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handler(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handler(req);
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET ?? '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const maxPages = Math.min(50, parseInt(searchParams.get('max_pages') ?? '10'));

  console.log(`[community ingest] Starting PA Corps — maxPages=${maxPages}`);
  const result = await ingestPaCorps(maxPages);
  console.log(`[community ingest] Done:`, result);

  return NextResponse.json({
    source: 'pa_corps',
    ingested: result.ingested,
    skipped:  result.skipped,
    errors:   result.errors,
    timestamp: new Date().toISOString(),
  });
}
