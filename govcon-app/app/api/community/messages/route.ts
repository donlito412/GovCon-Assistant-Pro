// ============================================================
// GET  /api/community/messages?with=profileId — fetch thread
// POST /api/community/messages — send message (must be connected)
// PATCH /api/community/messages?thread_with=profileId — mark read
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerSupabaseClient } from '../../../../../../03_OUTPUTS/TASK_001_scaffold/lib/supabase';

async function getMyProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from('community_profiles').select('id, business_name, email').eq('user_id', userId).maybeSingle();
  return data;
}

async function areConnected(supabase: any, profileA: number, profileB: number): Promise<boolean> {
  const { data } = await supabase
    .from('connection_requests')
    .select('id').eq('status', 'accepted')
    .or(`and(from_profile_id.eq.${profileA},to_profile_id.eq.${profileB}),and(from_profile_id.eq.${profileB},to_profile_id.eq.${profileA})`)
    .limit(1).maybeSingle();
  return !!data;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const withProfileId = parseInt(searchParams.get('with') ?? '0');

  const myProfile = await getMyProfile(supabase, user.id);
  if (!myProfile) return NextResponse.json({ messages: [] });

  if (!withProfileId) {
    // Return inbox summary — latest message per conversation partner
    const { data, error } = await supabase
      .from('community_messages')
      .select('*, from_profile:community_profiles!from_profile_id(id,business_name), to_profile:community_profiles!to_profile_id(id,business_name)')
      .or(`from_profile_id.eq.${myProfile.id},to_profile_id.eq.${myProfile.id}`)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data ?? [] });
  }

  // Thread with specific profile
  const { data, error } = await supabase
    .from('community_messages')
    .select('*')
    .or(
      `and(from_profile_id.eq.${myProfile.id},to_profile_id.eq.${withProfileId}),` +
      `and(from_profile_id.eq.${withProfileId},to_profile_id.eq.${myProfile.id})`
    )
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { to_profile_id, bodyText } = body;
  if (!to_profile_id || !bodyText?.trim()) return NextResponse.json({ error: 'to_profile_id and bodyText required' }, { status: 400 });

  const myProfile = await getMyProfile(supabase, user.id);
  if (!myProfile) return NextResponse.json({ error: 'Create a community profile first' }, { status: 400 });

  // Enforce connection requirement
  const connected = await areConnected(supabase, myProfile.id, to_profile_id);
  if (!connected) return NextResponse.json({ error: 'You must be connected to message this person' }, { status: 403 });

  const { data, error } = await supabase.from('community_messages').insert({
    from_profile_id: myProfile.id,
    to_profile_id,
    body:            bodyText.trim(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email notification (best-effort)
  const { data: recipient } = await supabase
    .from('community_profiles').select('email, business_name').eq('id', to_profile_id).maybeSingle();
  if (recipient?.email && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from:    process.env.FROM_EMAIL ?? 'onboarding@resend.dev',
      to:      [recipient.email],
      subject: `New message from ${myProfile.business_name}`,
      text:    `${myProfile.business_name} sent you a message on PGH Gov Contracts:\n\n"${bodyText.trim()}"\n\nLog in to reply.`,
    }).catch(() => {});
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { thread_with } = body;
  if (!thread_with) return NextResponse.json({ error: 'thread_with required' }, { status: 400 });

  const myProfile = await getMyProfile(supabase, user.id);
  if (!myProfile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabase.from('community_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('to_profile_id', myProfile.id)
    .eq('from_profile_id', thread_with)
    .is('read_at', null);

  return NextResponse.json({ success: true });
}
