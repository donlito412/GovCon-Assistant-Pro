export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/ingest/state-local  (TASK_027 Phase 0 rewrite)
//
// Now runs ONLY Allegheny County (the one state/local source with a real
// API). The HTML scrapers for PA eMarketplace, PA Treasury, and City of
// Pittsburgh were deleted — they failed silently and polluted the DB.
// Local solicitations are now manual-add via the UI.
//
// Secured with x-ingest-secret header.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { scrapeAlleghenyCounty } from '@/lib/ingestion/allegheny_county';
import type { ScraperResult } from '@/lib/ingestion/shared/normalize_shared';

interface ScraperSummary {
  source: string;
  totalScraped: number;
  errors: string[];
  durationMs: number;
}

interface IngestSummary {
  success: boolean;
  scrapers: ScraperSummary[];
  totalErrors: number;
  durationMs: number;
  note: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startMs = Date.now();

  const ingestSecret = process.env.INGEST_SECRET;
  if (!ingestSecret) {
    return NextResponse.json({ error: 'INGEST_SECRET missing.' }, { status: 500 });
  }
  if (req.headers.get('x-ingest-secret') !== ingestSecret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const summaries: ScraperSummary[] = [];
  let totalErrors = 0;

  try {
    const result: ScraperResult = await scrapeAlleghenyCounty();
    summaries.push({
      source: result.source,
      totalScraped: result.opportunities.length,
      errors: result.errors,
      durationMs: result.durationMs,
    });
    totalErrors += result.errors.length;
  } catch (err) {
    const msg = `Allegheny County threw: ${err instanceof Error ? err.message : String(err)}`;
    summaries.push({ source: 'local_allegheny', totalScraped: 0, errors: [msg], durationMs: 0 });
    totalErrors++;
  }

  const summary: IngestSummary = {
    success: totalErrors === 0,
    scrapers: summaries,
    totalErrors,
    durationMs: Date.now() - startMs,
    note: 'PA eMarketplace, PA Treasury, City of PGH scrapers removed in TASK_027. Use manual-add UI for those sources.',
  };

  return NextResponse.json(summary, { status: 200 });
}
