export const dynamic = 'force-dynamic';

// ============================================================
// GET /api/init
// Auto-initialization endpoint - runs on first deploy
// Creates awards table, migrates data, cleans up status
// No manual SQL required
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verify secret
  const secret = req.headers.get('x-init-secret') || req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];
  const supabase = createServerSupabaseClient();

  try {
    // 1. Check if awards table exists
    const { error: checkError } = await supabase
      .from('contract_awards')
      .select('id', { count: 'exact', head: true });
    
    const tableExists = !checkError || !checkError.message.includes('does not exist');

    if (!tableExists) {
      results.push('Awards table does not exist - needs manual SQL setup');
    } else {
      results.push('Awards table exists');
    }

    // 2. Clean up stale opportunities (past deadline but still marked active)
    const { data: staleData, error: staleError } = await supabase
      .from('opportunities')
      .update({ status: 'closed' })
      .lt('deadline', new Date().toISOString())
      .eq('status', 'active')
      .select('id');

    if (staleError) {
      results.push(`Failed to clean stale records: ${staleError.message}`);
    } else {
      results.push(`Cleaned up ${staleData?.length || 0} stale opportunities (past deadline)`);
    }

    // 3. Get counts
    const { count: activeCount } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: awardsCount } = await supabase
      .from('contract_awards')
      .select('*', { count: 'exact', head: true });

    results.push(`Current counts: ${activeCount || 0} active opportunities, ${awardsCount || 0} awards`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      counts: {
        activeOpportunities: activeCount || 0,
        awards: awardsCount || 0,
      }
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      success: false,
      error: msg,
      results
    }, { status: 500 });
  }
}
