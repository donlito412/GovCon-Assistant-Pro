// ============================================================
// GET /api/recompetes — expiring contracts query
// Filters: days, naics, agency, min_value, max_value, sort, page
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../03_OUTPUTS/TASK_001_scaffold/lib/supabase';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days      = Math.min(730, parseInt(searchParams.get('days') ?? '180'));
  const naics     = searchParams.get('naics');
  const agency    = searchParams.get('agency');
  const minValue  = searchParams.get('min_value');
  const maxValue  = searchParams.get('max_value');
  const sort      = searchParams.get('sort') ?? 'soonest';
  const page      = Math.max(0, parseInt(searchParams.get('page') ?? '0'));
  const perPage   = Math.min(50, parseInt(searchParams.get('per_page') ?? '20'));

  const today   = new Date().toISOString().slice(0, 10);
  const cutoff  = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

  let query = supabase
    .from('incumbent_contracts')
    .select('*, opportunities(title,source,set_aside_type,status)', { count: 'exact' })
    .gte('period_of_performance_end_date', today)
    .lte('period_of_performance_end_date', cutoff);

  if (naics)    query = query.eq('naics_code', naics);
  if (agency)   query = query.ilike('agency_name', `%${agency}%`);
  if (minValue) query = query.gte('award_amount', parseInt(minValue));
  if (maxValue) query = query.lte('award_amount', parseInt(maxValue));

  switch (sort) {
    case 'highest_value': query = query.order('award_amount', { ascending: false, nullsFirst: false }); break;
    case 'oldest':        query = query.order('period_of_performance_end_date', { ascending: false }); break;
    default:              query = query.order('period_of_performance_end_date', { ascending: true }); break;
  }

  query = query.range(page * perPage, (page + 1) * perPage - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    recompetes:  data ?? [],
    total:       count ?? 0,
    page,        per_page: perPage,
    total_pages: Math.ceil((count ?? 0) / perPage),
    filter:      { days, naics, agency, sort },
  });
}
