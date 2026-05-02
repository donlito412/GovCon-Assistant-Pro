export const dynamic = 'force-dynamic';

// ============================================================
// GET  /api/bids — list bid records
// POST /api/bids — create bid record
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get('status');
  const agency   = searchParams.get('agency');
  const dateFrom = searchParams.get('date_from');
  const dateTo   = searchParams.get('date_to');
  const sort     = searchParams.get('sort') ?? 'date_desc';
  const page     = Math.max(0, parseInt(searchParams.get('page') ?? '0'));
  const perPage  = Math.min(100, parseInt(searchParams.get('per_page') ?? '25'));

  let query = supabase
    .from('bid_records')
    .select('*', { count: 'exact' })
    .eq('user_id', '00000000-0000-0000-0000-000000000001');

  if (status)   query = query.eq('status', status);
  if (agency)   query = query.ilike('agency', `%${agency}%`);
  if (dateFrom) query = query.gte('bid_submitted_date', dateFrom);
  if (dateTo)   query = query.lte('bid_submitted_date', dateTo);

  switch (sort) {
    case 'amount_desc': query = query.order('bid_amount', { ascending: false, nullsFirst: false }); break;
    case 'amount_asc':  query = query.order('bid_amount', { ascending: true,  nullsFirst: false }); break;
    case 'date_asc':    query = query.order('bid_submitted_date', { ascending: true,  nullsFirst: false }); break;
    default:            query = query.order('bid_submitted_date', { ascending: false, nullsFirst: false }); break;
  }

  query = query.range(page * perPage, (page + 1) * perPage - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    bids: data ?? [], total: count ?? 0,
    page, per_page: perPage,
    total_pages: Math.ceil((count ?? 0) / perPage),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.contract_title || !body.agency) {
    return NextResponse.json({ error: 'contract_title and agency required' }, { status: 400 });
  }

  const { data, error } = await supabase.from('bid_records').insert({
    user_id:             '00000000-0000-0000-0000-000000000001',
    opportunity_id:      body.opportunity_id ?? null,
    pipeline_item_id:    body.pipeline_item_id ?? null,
    contract_title:      body.contract_title,
    agency:              body.agency,
    solicitation_number: body.solicitation_number ?? null,
    source:              body.source ?? null,
    bid_submitted_date:  body.bid_submitted_date ?? null,
    bid_amount:          body.bid_amount ?? null,
    bid_narrative:       body.bid_narrative ?? null,
    team_composition:    body.team_composition ?? [],
    documents_submitted: body.documents_submitted ?? [],
    status:              body.status ?? 'pending',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
