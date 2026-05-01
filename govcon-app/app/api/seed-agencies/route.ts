export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/seed-agencies
// One-time endpoint to seed the agencies table with Pittsburgh-area government agencies
// Secured by x-ingest-secret header
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { seedAgencies } from '@/seed-agencies';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth check
  const secret = req.headers.get('x-ingest-secret') ?? '';
  const INGEST_SECRET = process.env.INGEST_SECRET ?? '';
  
  if (INGEST_SECRET && secret !== INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[seed-agencies] Starting agency seeding...');

  try {
    const result = await seedAgencies();
    
    return NextResponse.json({
      success: result.errors.length === 0,
      agencies_inserted: result.inserted,
      agencies_updated: result.updated,
      total_processed: result.inserted + result.updated,
      errors: result.errors,
    }, { status: result.errors.length === 0 ? 200 : 500 });
  } catch (error) {
    console.error('[seed-agencies] API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
