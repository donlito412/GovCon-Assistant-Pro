// ============================================================
// GET  /api/contacts — list user's saved contacts
// POST /api/contacts — save a new contact (requires Jon's approval upstream)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../03_OUTPUTS/TASK_001_scaffold/lib/supabase';

// ---- GET ----
export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q             = searchParams.get('q')?.trim() ?? '';
  const status        = searchParams.get('status');
  const source        = searchParams.get('source');
  const samRegistered = searchParams.get('sam_registered');
  const page          = Math.max(0, parseInt(searchParams.get('page') ?? '0'));
  const perPage       = Math.min(100, parseInt(searchParams.get('per_page') ?? '50'));

  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (q)             query = query.textSearch('fts', q, { type: 'websearch' });
  if (status)        query = query.eq('status', status);
  if (source)        query = query.eq('source', source);
  if (samRegistered !== null && samRegistered !== '') {
    query = query.eq('sam_registered', samRegistered === 'true');
  }

  query = query.range(page * perPage, (page + 1) * perPage - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    contacts:    data ?? [],
    total:       count ?? 0,
    page,
    per_page:    perPage,
    total_pages: Math.ceil((count ?? 0) / perPage),
  });
}

// ---- POST ----
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.company_name) {
    return NextResponse.json({ error: 'company_name is required' }, { status: 400 });
  }

  const { data, error } = await supabase.from('contacts').insert({
    user_id:        user.id,
    company_name:   body.company_name,
    contact_name:   body.contact_name ?? null,
    email:          body.email ?? null,
    phone:          body.phone ?? null,
    website:        body.website ?? null,
    address:        body.address ?? null,
    city:           body.city ?? null,
    state:          body.state ?? 'PA',
    zip:            body.zip ?? null,
    source:         body.source ?? 'manual',
    uei:            body.uei ?? null,
    naics_codes:    body.naics_codes ?? [],
    certifications: body.certifications ?? null,
    sam_registered: body.sam_registered ?? false,
    notes:          body.notes ?? null,
    linked_bid_ids: body.linked_bid_ids ?? [],
    status:         body.status ?? 'saved',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
