'use client';

import React, { useState } from 'react';
import { Send, Loader2, X, PenLine } from 'lucide-react';
import { sendOutreachEmail, type OutreachContact } from '../../lib/api/outreach';

// ============================================================
// COMPOSE EMAIL — send via Resend or log inbound reply
// ============================================================

interface Props {
  contact: OutreachContact;
  contractTitle?: string;     // auto-suggest subject
  direction?: 'outbound' | 'inbound';
  onSent?: () => void;
  onClose?: () => void;
}

const FROM_EMAIL  = process.env.NEXT_PUBLIC_FROM_EMAIL ?? '';
const SENDER_NAME = process.env.NEXT_PUBLIC_SENDER_NAME ?? 'Jon Murphree';
const SENDER_CO   = process.env.NEXT_PUBLIC_SENDER_COMPANY ?? 'Murphree Enterprises';

export function ComposeEmail({ contact, contractTitle, direction = 'outbound', onSent, onClose }: Props) {
  const defaultSubject = contractTitle
    ? `Teaming Opportunity — ${contractTitle}`
    : 'Teaming Opportunity in Pittsburgh Government Contracting';

  const defaultBody = direction === 'outbound'
    ? `Hi${contact.contact_name ? ' ' + contact.contact_name.split(' ')[0] : ''},\n\nI'm reaching out from ${SENDER_CO} regarding a potential teaming opportunity${contractTitle ? ` for the "${contractTitle}" contract` : ''}.\n\nWe're looking for a qualified partner and believe your firm may be a great fit. I'd love to schedule a brief call to discuss.\n\nWould you be available for a 15-minute conversation this week?\n\nBest regards,\n${SENDER_NAME}`
    : '';

  const [subject,  setSubject]  = useState(defaultSubject);
  const [body,     setBody]     = useState(defaultBody);
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [sent,     setSent]     = useState(false);

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendOutreachEmail(contact.id, {
        direction,
        subject,
        bodyText:        body,
        fromEmail:       FROM_EMAIL,
        toEmail:         contact.email ?? undefined,
        senderName:      SENDER_NAME,
        senderCompany:   SENDER_CO,
        recipientName:   contact.contact_name ?? undefined,
        recipientCompany: contact.company_name,
      });
      setSent(true);
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-5 text-center text-green-700 text-sm font-semibold">
        {direction === 'outbound' ? '✓ Email sent successfully' : '✓ Reply logged'}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <PenLine className="w-4 h-4 text-gray-400" />
          {direction === 'outbound' ? 'Compose Email' : 'Log Inbound Reply'}
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {direction === 'outbound' && (
          <>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-semibold w-10">To:</span>
              <span>{contact.email ?? <em className="text-red-500">No email on file</em>}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-semibold w-10">From:</span>
              <span>{FROM_EMAIL || '(set NEXT_PUBLIC_FROM_EMAIL)'}</span>
            </div>
          </>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">
            {direction === 'outbound' ? 'Message' : 'Paste their reply'}
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={direction === 'outbound' ? 10 : 6}
            placeholder={direction === 'inbound' ? 'Paste the reply you received here…' : ''}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !body.trim() || (direction === 'outbound' && !contact.email)}
          className="flex items-center gap-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg disabled:opacity-50 transition"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Sending…' : direction === 'outbound' ? 'Send Email' : 'Log Reply'}
        </button>
      </div>
    </div>
  );
}
