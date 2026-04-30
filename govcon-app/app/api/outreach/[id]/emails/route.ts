// ============================================================
// GET  /api/outreach/[id]/emails — fetch email thread
// POST /api/outreach/[id]/emails — send outbound email via Resend
//                                  OR log inbound reply
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { createServerSupabaseClient } from '@/lib/supabase';
import { OutreachEmail } from '@/lib/email/outreach-email';

type Ctx = { params: { id: string } };

// ---- GET — fetch thread ----
export async function GET(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('outreach_threads')
    .select('*')
    .eq('contact_id', params.id)
    .eq('user_id', user.id)
    .order('sent_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ emails: data ?? [] });
}

// ---- POST — send or log ----
export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { direction = 'outbound', subject, bodyText, fromEmail, toEmail,
          senderName, senderCompany, recipientName, recipientCompany } = body;

  if (!bodyText) return NextResponse.json({ error: 'bodyText required' }, { status: 400 });

  let resendMessageId: string | undefined;

  // Send via Resend for outbound emails
  if (direction === 'outbound' && toEmail) {
    const resendKey = process.env.RESEND_API_KEY ?? '';
    if (!resendKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }
    const resend = new Resend(resendKey);

    const html = await render(
      OutreachEmail({
        senderName:       senderName ?? 'Jon',
        senderCompany:    senderCompany ?? 'Murphree Enterprises',
        recipientName,
        recipientCompany: recipientCompany ?? '',
        subject:          subject ?? 'Teaming Opportunity',
        body:             bodyText,
        replyToEmail:     fromEmail ?? process.env.FROM_EMAIL ?? '',
      }) as React.ReactElement
    );

    const { data: resendData, error: resendErr } = await resend.emails.send({
      from:     fromEmail ?? process.env.FROM_EMAIL ?? 'onboarding@resend.dev',
      to:       [toEmail],
      subject:  subject ?? 'Teaming Opportunity',
      html,
      replyTo:  fromEmail,
    });

    if (resendErr) {
      return NextResponse.json({ error: `Resend error: ${resendErr.message}` }, { status: 500 });
    }
    resendMessageId = resendData?.id;
  }

  // Store in outreach_threads
  const { data: thread, error: threadErr } = await supabase.from('outreach_threads').insert({
    contact_id:         parseInt(params.id),
    user_id:            user.id,
    direction,
    subject:            subject ?? null,
    body:               bodyText,
    from_email:         fromEmail ?? null,
    to_email:           toEmail ?? null,
    resend_message_id:  resendMessageId ?? null,
    sent_at:            new Date().toISOString(),
  }).select().single();

  if (threadErr) return NextResponse.json({ error: threadErr.message }, { status: 500 });

  // Update contact status + last_activity_at
  const newStatus = direction === 'outbound' ? 'sent' : 'replied';
  await supabase.from('outreach_contacts').update({
    status:             newStatus,
    last_activity_at:   new Date().toISOString(),
    first_contacted_at: direction === 'outbound' ? new Date().toISOString() : undefined,
  }).eq('id', params.id).eq('user_id', user.id);

  return NextResponse.json({ email: thread, resend_id: resendMessageId }, { status: 201 });
}
