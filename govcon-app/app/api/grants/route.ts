export const dynamic = 'force-dynamic';

// ============================================================
// GET /api/grants
// Queryable grants endpoint with filtering, sorting, pagination.
// Params: q, category, grant_type, eligible_entity, source,
//         min_amount, max_amount, deadline_before, deadline_after,
//         sort (deadline_asc|amount_desc|recent), page, per_page
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

const PER_PAGE = 25;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);

  const q              = searchParams.get('q')?.trim() ?? '';
  const category       = searchParams.get('category');
  const grantType      = searchParams.get('grant_type');
  const eligibleEntity = searchParams.get('eligible_entity');
  const source         = searchParams.get('source');
  const minAmount      = searchParams.get('min_amount');  // cents
  const maxAmount      = searchParams.get('max_amount');  // cents
  const deadlineBefore = searchParams.get('deadline_before');
  const deadlineAfter  = searchParams.get('deadline_after');
  const sort           = searchParams.get('sort') ?? 'deadline_asc';
  const page           = Math.max(0, parseInt(searchParams.get('page') ?? '0'));
  const perPage        = Math.min(100, parseInt(searchParams.get('per_page') ?? String(PER_PAGE)));

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('grants')
    .select('*', { count: 'exact' })
    .eq('status', 'active');

  // Full-text search
  if (q) {
    query = query.textSearch('fts', q, { type: 'websearch', config: 'english' });
  }

  // Filters
  if (category) query = query.eq('category', category);
  if (grantType) query = query.eq('grant_type', grantType);
  if (source)    query = query.eq('source', source);
  if (eligibleEntity) query = query.contains('eligible_entities', [eligibleEntity]);
  if (minAmount)      query = query.gte('max_amount', parseInt(minAmount));
  if (maxAmount)      query = query.lte('min_amount', parseInt(maxAmount));
  if (deadlineAfter)  query = query.gte('application_deadline', deadlineAfter);
  if (deadlineBefore) query = query.lte('application_deadline', deadlineBefore);

  // Sorting
  switch (sort) {
    case 'deadline_asc':
      query = query.order('application_deadline', { ascending: true, nullsFirst: false });
      break;
    case 'amount_desc':
      query = query.order('max_amount', { ascending: false, nullsFirst: false });
      break;
    case 'recent':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  // Pagination
  const from = page * perPage;
  query = query.range(from, from + perPage - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('[api/grants]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    grants:      data ?? [],
    total:       count ?? 0,
    page,
    per_page:    perPage,
    total_pages: Math.ceil((count ?? 0) / perPage),
  });
}
