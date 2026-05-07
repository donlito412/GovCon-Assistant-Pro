export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/admin/wipe
// Truncates the opportunities + contract_awards tables.
//
// Auth: x-ingest-secret header must match INGEST_SECRET env var.
// Returns counts before+after so caller can confirm the wipe ran.
//
// Used by the user's WIPE_AND_REINGEST.command script. The reason this
// runs server-side instead of via direct REST is that the local
// .env.local got replaced by `vercel env pull` and no longer carries
// SUPABASE_SERVICE_ROLE_KEY — but Vercel's runtime env has it.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

async function tableCount(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  table: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.error(`[admin/wipe] count(${table}) failed:`, error.message);
    return null;
  }
  return count ?? 0;
}

async function wipeTable(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  table: string,
): Promise<{ ok: boolean; error?: string }> {
  // Use a wide id filter to delete all rows. Supabase REST requires
  // SOME filter — id > 0 catches every row with a positive integer id.
  const { error } = await supabase.from(table).delete().gt('id', 0);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const expected = process.env.INGEST_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: 'INGEST_SECRET not configured' },
      { status: 500 },
    );
  }
  if (req.headers.get('x-ingest-secret') !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const tables = ['opportunities', 'contract_awards'];

  const before: Record<string, number | null> = {};
  for (const t of tables) before[t] = await tableCount(supabase, t);

  const wipeResults: Record<string, { ok: boolean; error?: string }> = {};
  for (const t of tables) wipeResults[t] = await wipeTable(supabase, t);

  const after: Record<string, number | null> = {};
  for (const t of tables) after[t] = await tableCount(supabase, t);

  return NextResponse.json(
    {
      ok: Object.values(wipeResults).every((r) => r.ok),
      before,
      after,
      results: wipeResults,
    },
    { status: 200 },
  );
}
