export const dynamic = 'force-dynamic';

// ============================================================
// GET  /api/community/connections — list my connections & pending requests
// POST /api/community/connections — send connection request
// PATCH /api/community/connections — accept / decline
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getRouteUser } from '@/lib/auth/route';

async function getMyProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from('community_profiles').select('id, business_name, email').eq('user_id', userId).maybeSingle();
  return data;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();

  const profile = await getMyProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ connections: [], pending_in: [], pending_out: [] });

  const [connRes, inRes, outRes] = await Promise.all([
    supabase.from('connection_requests')
      .select('*, from_profile:community_profiles!from_profile_id(id,business_name,neighborhood,industry), to_profile:community_profiles!to_profile_id(id,business_name,neighborhood,industry)')
      .eq('status', 'accepted')
      .or(`from_profile_id.eq.${profile.id},to_profile_id.eq.${profile.id}`),
    supabase.from('connection_requests')
      .select('*, from_profile:community_profiles!from_profile_id(id,business_name,neighborhood)')
      .eq('to_profile_id', profile.id).eq('status', 'pending'),
    supabase.from('connection_requests')
      .select('*, to_profile:community_profiles!to_profile_id(id,business_name,neighborhood)')
      .eq('from_profile_id', profile.id).eq('status', 'pending'),
  ]);

  return NextResponse.json({
    connections:  connRes.data  ?? [],
    pending_in:   inRes.data    ?? [],
    pending_out:  outRes.data   ?? [],
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const myProfile = await getMyProfile(supabase, user.id);
  if (!myProfile) return NextResponse.json({ error: 'Create a community profile first' }, { status: 400 });
  if (!body.to_profile_id) return NextResponse.json({ error: 'to_profile_id required' }, { status: 400 });
  if (body.to_profile_id === myProfile.id) return NextResponse.json({ error: 'Cannot connect to yourself' }, { status: 400 });

  const { data, error } = await supabase.from('connection_requests').insert({
    from_profile_id: myProfile.id,
    to_profile_id:   body.to_profile_id,
    message:         body.message ?? null,
    status:          'pending',
  }).select().single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Connection request already sent' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Email notification to recipient (best-effort)
  const { data: targetProfile } = await supabase
    .from('community_profiles').select('email, business_name').eq('id', body.to_profile_id).maybeSingle();
  if (targetProfile?.email && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from:    process.env.FROM_EMAIL ?? 'onboarding@resend.dev',
      to:      [targetProfile.email],
      subject: `New Connection Request — ${myProfile.business_name}`,
      text:    `${myProfile.business_name} wants to connect with you on PGH Gov Contracts.\n\n${body.message ?? ''}\n\nLog in to accept or decline.`,
    }).catch(() => {}); // non-blocking
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { request_id, status } = body;
  if (!request_id || !['accepted','declined'].includes(status)) {
    return NextResponse.json({ error: 'request_id and status (accepted|declined) required' }, { status: 400 });
  }

  const myProfile = await getMyProfile(supabase, user.id);
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 400 });

  const { data, error } = await supabase
    .from('connection_requests')
    .update({ status })
    .eq('id', request_id)
    .eq('to_profile_id', myProfile.id)
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
