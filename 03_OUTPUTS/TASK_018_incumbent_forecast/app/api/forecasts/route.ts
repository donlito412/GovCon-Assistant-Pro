// ============================================================
// GET /api/forecasts — forecast opportunities query
// Filters: q, naics, agency, status, days, min_value, sort, page
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../03_OUTPUTS/TASK_001_scaffold/lib/supabase';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q         = searchParams.get('q');
  const naics     = searchParams.get('naics');
  const agency    = searchParams.get('agency');
  const status    = searchParams.get('status') ?? 'active';
  const days      = searchParams.get('days') ? parseInt(searchParams.get('days')!) : null;
  const minValue  = searchParams.get('min_value');
  const sort      = searchParams.get('sort') ?? 'soonest';
  const page      = Math.max(0, parseInt(searchParams.get('page') ?? '0'));
  const perPage   = Math.min(50, parseInt(searchParams.get('per_page') ?? '20'));

  let query = supabase
    .from('forecast_opportunities')
    .select('*', { count: 'exact' })
    .eq('status', status);

  if (q)       query = query.textSearch('fts', q, { type: 'websearch' });
  if (naics)   query = query.eq('naics_code', naics);
  if (agency)  query = query.ilike('agency_name', `%${agency}%`);
  if (minValue) query = query.gte('estimated_value', parseInt(minValue));
  if (days !== null) {
    const cutoff = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    query = query.lte('estimated_solicitation_date', cutoff);
  }

  switch (sort) {
    case 'highest_value': query = query.order('estimated_value', { ascending: false, nullsFirst: false }); break;
    case 'latest':        query = query.order('estimated_solicitation_date', { ascending: false, nullsFirst: false }); break;
    default:              query = query.order('estimated_solicitation_date', { ascending: true, nullsFirst: false }); break;
  }

  query = query.range(page * perPage, (page + 1) * perPage - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    forecasts:   data ?? [],
    total:       count ?? 0,
    page,        per_page: perPage,
    total_pages: Math.ceil((count ?? 0) / perPage),
  });
}
