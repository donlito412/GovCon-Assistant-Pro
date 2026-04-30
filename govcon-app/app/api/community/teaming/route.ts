// ============================================================
// GET  /api/community/teaming — list open teaming posts
// POST /api/community/teaming — create teaming post
// PATCH/DELETE handled inline via query param ?action=close&id=N
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get('status') ?? 'open';
  const naics    = searchParams.get('naics');
  const certNeeded = searchParams.get('cert_needed');
  const page     = Math.max(0, parseInt(searchParams.get('page') ?? '0'));
  const perPage  = Math.min(100, parseInt(searchParams.get('per_page') ?? '20'));

  let query = supabase
    .from('teaming_posts')
    .select('*, community_profiles(business_name, neighborhood, certifications, sam_registered)', { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (naics)      query = query.contains('naics_needed', [naics]);
  if (certNeeded) query = query.contains('certifications_needed', [certNeeded]);
  query = query.range(page * perPage, (page + 1) * perPage - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    posts: data ?? [], total: count ?? 0,
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

  // Resolve the caller's community profile
  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'You must create a community profile first' }, { status: 400 });
  if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const { data, error } = await supabase.from('teaming_posts').insert({
    author_profile_id:     profile.id,
    linked_opportunity_id: body.linked_opportunity_id ?? null,
    title:                 body.title,
    description:           body.description ?? null,
    contract_value_range:  body.contract_value_range ?? null,
    naics_needed:          body.naics_needed ?? [],
    certifications_needed: body.certifications_needed ?? [],
    response_deadline:     body.response_deadline ?? null,
    status:                'open',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { id, status } = body;
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

  const { data: profile } = await supabase
    .from('community_profiles').select('id').eq('user_id', user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 400 });

  const { data, error } = await supabase
    .from('teaming_posts').update({ status })
    .eq('id', id).eq('author_profile_id', profile.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
