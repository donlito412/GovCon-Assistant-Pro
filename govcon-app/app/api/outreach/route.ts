export const dynamic = 'force-dynamic';

// ============================================================
// GET  /api/outreach — list outreach contacts
// POST /api/outreach — create outreach contact
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q       = searchParams.get('q')?.trim() ?? '';
  const status  = searchParams.get('status');
  const bidId   = searchParams.get('bid_id');
  const sort    = searchParams.get('sort') ?? 'last_activity_desc';
  const page    = Math.max(0, parseInt(searchParams.get('page') ?? '0'));
  const perPage = Math.min(100, parseInt(searchParams.get('per_page') ?? '50'));

  let query = supabase
    .from('outreach_contacts')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id);

  if (q)      query = query.or(`company_name.ilike.%${q}%,contact_name.ilike.%${q}%`);
  if (status) query = query.eq('status', status);
  if (bidId)  query = query.contains('linked_bid_ids', [parseInt(bidId)]);

  query = sort === 'last_activity_asc'
    ? query.order('last_activity_at', { ascending: true, nullsFirst: false })
    : query.order('last_activity_at', { ascending: false, nullsFirst: false });

  query = query.range(page * perPage, (page + 1) * perPage - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contacts: data ?? [], total: count ?? 0,
    page, per_page: perPage,
    total_pages: Math.ceil((count ?? 0) / perPage),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body.company_name) return NextResponse.json({ error: 'company_name required' }, { status: 400 });

  const { data, error } = await supabase.from('outreach_contacts').insert({
    user_id:        user.id,
    contact_id:     body.contact_id ?? null,
    contact_name:   body.contact_name ?? null,
    company_name:   body.company_name,
    email:          body.email ?? null,
    phone:          body.phone ?? null,
    status:         body.status ?? 'not_contacted',
    linked_bid_ids: body.linked_bid_ids ?? [],
    notes:          body.notes ?? null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
