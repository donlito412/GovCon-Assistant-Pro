export const dynamic = 'force-dynamic';

// ============================================================
// GET  /api/community/profiles — directory listing
// POST /api/community/profiles — create own profile
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q             = searchParams.get('q')?.trim() ?? '';
  const neighborhood  = searchParams.get('neighborhood');
  const industry      = searchParams.get('industry');
  const samOnly       = searchParams.get('sam_registered');
  const verifiedOnly  = searchParams.get('verified');
  const lookingFor    = searchParams.get('looking_for');
  const sort          = searchParams.get('sort') ?? 'newest';
  const page          = Math.max(0, parseInt(searchParams.get('page') ?? '0'));
  const perPage       = Math.min(100, parseInt(searchParams.get('per_page') ?? '24'));

  let query = supabase
    .from('community_profiles')
    .select('*', { count: 'exact' });

  if (q)            query = query.textSearch('fts', q, { type: 'websearch' });
  if (neighborhood) query = query.ilike('neighborhood', `%${neighborhood}%`);
  if (industry)     query = query.ilike('industry', `%${industry}%`);
  if (samOnly === 'true')    query = query.eq('sam_registered', true);
  if (verifiedOnly === 'true') query = query.eq('is_verified', true);
  if (lookingFor)   query = query.contains('looking_for', [lookingFor]);

  switch (sort) {
    case 'verified_first': query = query.order('is_verified', { ascending: false }).order('created_at', { ascending: false }); break;
    case 'oldest':         query = query.order('created_at', { ascending: true }); break;
    default:               query = query.order('created_at', { ascending: false }); break;
  }

  query = query.range(page * perPage, (page + 1) * perPage - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    profiles: data ?? [], total: count ?? 0,
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
  if (!body.business_name) return NextResponse.json({ error: 'business_name required' }, { status: 400 });

  // One profile per user
  const { data: existing } = await supabase
    .from('community_profiles').select('id').eq('user_id', user.id).maybeSingle();
  if (existing) return NextResponse.json({ error: 'Profile already exists — use PATCH to update' }, { status: 409 });

  const { data, error } = await supabase.from('community_profiles').insert({
    user_id:             user.id,
    business_name:       body.business_name,
    owner_name:          body.owner_name ?? null,
    email:               body.email ?? null,
    phone:               body.phone ?? null,
    website:             body.website ?? null,
    neighborhood:        body.neighborhood ?? null,
    city:                body.city ?? 'Pittsburgh',
    zip:                 body.zip ?? null,
    business_type:       body.business_type ?? null,
    industry:            body.industry ?? null,
    naics_codes:         body.naics_codes ?? [],
    services_offered:    body.services_offered ?? [],
    years_in_business:   body.years_in_business ?? null,
    employee_count_range: body.employee_count_range ?? null,
    certifications:      body.certifications ?? {},
    sam_registered:      body.sam_registered ?? false,
    sam_uei:             body.sam_uei ?? null,
    bio:                 body.bio ?? null,
    looking_for:         body.looking_for ?? [],
    source:              'self_registered',
    is_verified:         false,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
