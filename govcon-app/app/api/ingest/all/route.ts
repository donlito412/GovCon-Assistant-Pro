export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/ingest/all
// Runs all scrapers and returns results
// Protected by INGEST_SECRET
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { runFullIngestion } from '@/lib/ingestion/runner';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify secret
  const secret = req.headers.get('x-ingest-secret');
  if (secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const result = await runFullIngestion();
    
    return NextResponse.json({
      success: true,
      timestamp: result.timestamp,
      summary: {
        opportunities: result.totalOpportunities,
        awards: result.totalAwards,
        errors: result.errors.length,
        durationMs: result.durationMs,
      },
      sources: result.results.map(r => ({
        source: r.source,
        count: r.opportunities?.length ?? 0,
        errors: r.errors.length,
      })),
      errors: result.errors,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/ingest/all] Fatal error:', msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

// Also allow GET for easier testing (with secret in query)
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const secret = searchParams.get('secret');
  
  if (secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const result = await runFullIngestion();
    
    return NextResponse.json({
      success: true,
      timestamp: result.timestamp,
      summary: {
        opportunities: result.totalOpportunities,
        awards: result.totalAwards,
        errors: result.errors.length,
        durationMs: result.durationMs,
      },
      sources: result.results.map(r => ({
        source: r.source,
        count: r.opportunities?.length ?? (r as any).awards?.length ?? 0,
        errors: r.errors.length,
      })),
      errors: result.errors,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/ingest/all] Fatal error:', msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
