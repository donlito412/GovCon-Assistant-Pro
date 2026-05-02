export const dynamic = 'force-dynamic';

// ============================================================
// GET    /api/contacts/[id] — single contact
// PATCH  /api/contacts/[id] — update contact
// DELETE /api/contacts/[id] — remove contact
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('contacts').select('*').eq('id', params.id).eq('user_id', '00000000-0000-0000-0000-000000000001').maybeSingle();

  if (error)  return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Whitelist patchable fields
  const allowed = ['company_name','contact_name','email','phone','website','address','city',
    'state','zip','notes','linked_bid_ids','status','certifications','naics_codes'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No patchable fields provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('contacts').update(patch).eq('id', params.id).eq('user_id', '00000000-0000-0000-0000-000000000001').select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('contacts').delete().eq('id', params.id).eq('user_id', '00000000-0000-0000-0000-000000000001');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
