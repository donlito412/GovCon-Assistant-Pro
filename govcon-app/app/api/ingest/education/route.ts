export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/ingest/education  (TASK_027 Phase 0 — disabled)
//
// All five education-site HTML scrapers (Pitt, CMU, CCAC, PPS, Duquesne)
// were removed. They timed out, returned 0 records, or required brittle
// per-site CSS selectors that broke whenever the sites updated. For one
// person to maintain, this was net-negative.
//
// This route now returns 410 Gone so cron jobs/UI calls fail loudly
// rather than silently logging "0 results".
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      removed: true,
      message:
        'Education scrapers removed in TASK_027. Use manual-add UI for university solicitations.',
    },
    { status: 410 },
  );
}
