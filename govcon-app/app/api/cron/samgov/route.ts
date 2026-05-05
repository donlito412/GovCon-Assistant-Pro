export const dynamic = 'force-dynamic';

// ============================================================
// GET /api/cron/samgov  (TASK_027 Phase 1)
// Vercel cron runs this every 6 hours.
// Triggers /api/ingest/federal (SAM.gov, PA-scoped at API level).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const start = Date.now();

  const cronSecret = process.env.CRON_SECRET;
  const ingestSecret = process.env.INGEST_SECRET;
  if (!cronSecret || !ingestSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET or INGEST_SECRET missing.' },
      { status: 500 },
    );
  }

  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${cronSecret}` && auth !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/ingest/federal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ingest-secret': ingestSecret,
      },
    });
    const data = await res.json().catch(() => ({}));

    return NextResponse.json(
      {
        success: res.ok,
        durationMs: Date.now() - start,
        upstream: data,
      },
      { status: res.ok ? 200 : 500 },
    );
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
