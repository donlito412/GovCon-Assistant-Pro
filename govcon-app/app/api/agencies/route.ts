// ============================================================
// GET /api/agencies
// Agency directory: all agencies with live stats from opportunities.
// Stats are computed via Supabase aggregation (not real-time joins).
//
// Query params:
//   level  — filter by agency_level: federal | state | local | education
//   sort   — active_count:desc (default) | total_spend:desc | name:asc
//   q      — partial name match
//   page   — 1-indexed (default 1)
//   limit  — per page (default 30)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const level = searchParams.get('level') ?? '';
  const sort = searchParams.get('sort') ?? 'active_count:desc';
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10)));
  const offset = (page - 1) * limit;

  const [sortField, sortDir] = sort.split(':');
  const ascending = sortDir !== 'desc';

  try {
    const supabase = createServerSupabaseClient();

    // Build agency query
    let query = supabase
      .from('agencies')
      .select('*', { count: 'exact' });

    if (level) query = query.eq('level', level);
    if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);

    const allowedSort: Record<string, string> = {
      name: 'name',
      total_spend: 'total_spend',
    };
    const safeSort = allowedSort[sortField] ?? 'name';
    query = query.order(safeSort, { ascending, nullsFirst: false });
    query = query.range(offset, offset + limit - 1);

    const { data: agencies, count, error } = await query;
    if (error) {
      console.error('[api/agencies GET]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Augment each agency with live active_count + active_value_cents from opportunities
    const agencyNames = (agencies ?? []).map((a) => a.name).filter(Boolean);
    let statsMap: Record<string, { active_count: number; active_value_cents: number }> = {};

    if (agencyNames.length > 0) {
      const { data: oppStats } = await supabase
        .from('opportunities')
        .select('agency_name, value_max, value_min')
        .eq('status', 'active')
        .in('agency_name', agencyNames);

      for (const opp of oppStats ?? []) {
        const name = opp.agency_name;
        if (!name) continue;
        if (!statsMap[name]) statsMap[name] = { active_count: 0, active_value_cents: 0 };
        statsMap[name].active_count++;
        statsMap[name].active_value_cents += opp.value_max ?? opp.value_min ?? 0;
      }
    }

    const augmented = (agencies ?? []).map((a) => ({
      ...a,
      active_count: statsMap[a.name]?.active_count ?? 0,
      active_value_cents: statsMap[a.name]?.active_value_cents ?? 0,
    }));

    // If sorting by active_count, sort in-memory (not in DB)
    if (sortField === 'active_count') {
      augmented.sort((a, b) => ascending
        ? a.active_count - b.active_count
        : b.active_count - a.active_count);
    }

    return NextResponse.json({
      data: augmented,
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    }, { status: 200, headers: { 'Cache-Control': 'private, max-age=120' } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
