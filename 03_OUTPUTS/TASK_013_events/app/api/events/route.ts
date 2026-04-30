// ============================================================
// GET /api/events — query events with filtering + pagination
// Params: q, source, event_type, why_relevant, is_virtual,
//         is_free, date_from, date_to, sort, page, per_page
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../03_OUTPUTS/TASK_001_scaffold/lib/supabase';

const PER_PAGE = 25;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);

  const q           = searchParams.get('q')?.trim() ?? '';
  const source      = searchParams.get('source');
  const eventType   = searchParams.get('event_type');
  const whyRelevant = searchParams.get('why_relevant');
  const isVirtual   = searchParams.get('is_virtual');
  const isFree      = searchParams.get('is_free');
  const dateFrom    = searchParams.get('date_from') ?? new Date().toISOString().slice(0, 10);
  const dateTo      = searchParams.get('date_to');
  const sort        = searchParams.get('sort') ?? 'date_asc';
  const page        = Math.max(0, parseInt(searchParams.get('page') ?? '0'));
  const perPage     = Math.min(100, parseInt(searchParams.get('per_page') ?? String(PER_PAGE)));

  const supabase = createServerSupabaseClient();
  let query = supabase.from('events').select('*', { count: 'exact' });

  if (q) query = query.textSearch('fts', q, { type: 'websearch', config: 'english' });
  if (source)      query = query.eq('source', source);
  if (eventType)   query = query.eq('event_type', eventType);
  if (whyRelevant) query = query.eq('why_relevant', whyRelevant);
  if (isVirtual !== null && isVirtual !== '')  query = query.eq('is_virtual', isVirtual === 'true');
  if (isFree !== null && isFree !== '')        query = query.eq('is_free', isFree === 'true');
  if (dateFrom)    query = query.gte('event_date', dateFrom);
  if (dateTo)      query = query.lte('event_date', dateTo);

  switch (sort) {
    case 'date_desc':
      query = query.order('event_date', { ascending: false });
      break;
    case 'date_asc':
    default:
      query = query.order('event_date', { ascending: true });
      break;
  }

  const from = page * perPage;
  query = query.range(from, from + perPage - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[api/events]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    events:      data ?? [],
    total:       count ?? 0,
    page,
    per_page:    perPage,
    total_pages: Math.ceil((count ?? 0) / perPage),
  });
}
