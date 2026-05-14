export const dynamic = 'force-dynamic';

// ============================================================
// GET /api/cron/ingest
// Vercel cron handler that triggers all ingest endpoints in sequence.
// Secured with CRON_SECRET header (Vercel provides this automatically).
// Runs daily at 11:00 UTC (07:00 ET).
//
// Sequence:
//   1. federal (SAM.gov)
//   2. state-local (PA eMarketplace, PA Treasury, Allegheny, Pittsburgh)
//   3. grants (Grants.gov, PA DCED, URA, SBA)
//   4. events (City Council, Planning, URA, Eventbrite)
//   5. education (Pitt, CMU, CCAC, PPS, Duquesne)
//   6. forecasts (SAM.gov forecast API)
//
// Returns JSON summary of all ingestion results.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';

interface IngestResult {
  source: string;
  success: boolean;
  durationMs: number;
  error?: string;
  data?: any;
}

interface CronSummary {
  success: boolean;
  totalDurationMs: number;
  results: IngestResult[];
  overallErrors: string[];
}

/**
 * Calls an ingest endpoint with proper authentication.
 */
async function callIngestEndpoint(
  baseUrl: string,
  source: string,
  ingestSecret: string,
): Promise<IngestResult> {
  const startMs = Date.now();
  
  try {
    const response = await fetch(`${baseUrl}/api/ingest/${source}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ingest-secret': ingestSecret,
      },
    });

    const durationMs = Date.now() - startMs;
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        source,
        success: false,
        durationMs,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      source,
      success: true,
      durationMs,
      data,
    };
  } catch (error) {
    const durationMs = Date.now() - startMs;
    return {
      source,
      success: false,
      durationMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const startMs = Date.now();

  // ---- AUTH CHECK ----
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/ingest] CRON_SECRET env var is not set.');
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET missing.' },
      { status: 500 },
    );
  }

  if (!isAuthorizedCronRequest(req, cronSecret)) {
    console.warn('[cron/ingest] Unauthorized request — bad or missing authorization header.');
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // ---- ENV CHECKS ----
  const ingestSecret = process.env.INGEST_SECRET;
  if (!ingestSecret) {
    console.error('[cron/ingest] INGEST_SECRET env var is not set.');
    return NextResponse.json(
      { error: 'Server misconfiguration: INGEST_SECRET missing.' },
      { status: 500 },
    );
  }

  // Get the base URL for making internal requests
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  console.log('[cron/ingest] Starting daily ingestion sequence...');

  // ---- INGESTION SEQUENCE ----
  const sources = [
    'federal',
    'state-local', 
    'grants',
    'events',
    'education',
    'forecasts',
  ];

  const results: IngestResult[] = [];
  const overallErrors: string[] = [];

  for (const source of sources) {
    console.log(`[cron/ingest] Running ${source} ingestion...`);
    const result = await callIngestEndpoint(baseUrl, source, ingestSecret);
    results.push(result);
    
    if (result.success) {
      console.log(`[cron/ingest] ✓ ${source} completed in ${result.durationMs}ms`);
    } else {
      const errorMsg = `✗ ${source} failed: ${result.error}`;
      console.error(`[cron/ingest] ${errorMsg}`);
      overallErrors.push(errorMsg);
    }
  }

  // ---- ALERTS ----
  console.log('[cron/ingest] Running email alerts...');
  const alertsStart = Date.now();
  let alertsResult: IngestResult | null = null;
  
  try {
    const alertsResponse = await fetch(`${baseUrl}/api/alerts/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ingest-secret': ingestSecret,
      },
    });

    const alertsData = await alertsResponse.json();
    
    alertsResult = {
      source: 'alerts',
      success: alertsResponse.ok,
      durationMs: Date.now() - alertsStart,
      error: alertsResponse.ok ? undefined : alertsData.error || 'Alerts failed',
      data: alertsData,
    };
    
    results.push(alertsResult);
    
    if (alertsResponse.ok) {
      console.log(`[cron/ingest] ✓ alerts completed in ${alertsResult.durationMs}ms (${alertsData.emailsSent || 0} emails sent)`);
    } else {
      const errorMsg = `✗ alerts failed: ${alertsResult.error}`;
      console.error(`[cron/ingest] ${errorMsg}`);
      overallErrors.push(errorMsg);
    }
  } catch (error) {
    const errorMsg = `✗ alerts failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`[cron/ingest] ${errorMsg}`);
    overallErrors.push(errorMsg);
    
    alertsResult = {
      source: 'alerts',
      success: false,
      durationMs: Date.now() - alertsStart,
      error: errorMsg,
    };
    results.push(alertsResult);
  }

  const totalDurationMs = Date.now() - startMs;
  const success = overallErrors.length === 0;

  const summary: CronSummary = {
    success,
    totalDurationMs,
    results,
    overallErrors,
  };

  console.log(
    `[cron/ingest] DONE — Success: ${success} | Duration: ${totalDurationMs}ms | Errors: ${overallErrors.length}`,
  );

  return NextResponse.json(summary, { status: success ? 200 : 500 });
}
