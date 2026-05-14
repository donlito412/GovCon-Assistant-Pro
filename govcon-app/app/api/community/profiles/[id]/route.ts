export const dynamic = 'force-dynamic';

// ============================================================
// GET   /api/community/profiles/[id] — single profile (public)
// PATCH /api/community/profiles/[id] — update own profile
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getRouteUser } from '@/lib/auth/route';
import { isAuthEnabled } from '@/lib/auth/mode';

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const user = await getRouteUser();
  if (isAuthEnabled() && !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('community_profiles')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Mask contact info unless viewer is the owner or profiles are connected
  const isOwner = user ? data.user_id === user.id : false;
  if (!isOwner) {
    if (!user) {
      return NextResponse.json({ ...data, email: null, phone: null });
    }

    const { data: conn } = await supabase
      .from('connection_requests')
      .select('id')
      .eq('status', 'accepted')
      .or(`from_profile_id.eq.${params.id},to_profile_id.eq.${params.id}`)
      .limit(1)
      .maybeSingle();

    if (!conn) {
      // Mask private fields
      return NextResponse.json({ ...data, email: null, phone: null });
    }
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const allowed = [
    'business_name','owner_name','email','phone','website',
    'neighborhood','city','zip','business_type','industry',
    'naics_codes','services_offered','years_in_business','employee_count_range',
    'certifications','sam_registered','sam_uei','bio','looking_for','profile_photo_url',
  ];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  // Only owner can update
  const { data, error } = await supabase
    .from('community_profiles')
    .update(patch)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
