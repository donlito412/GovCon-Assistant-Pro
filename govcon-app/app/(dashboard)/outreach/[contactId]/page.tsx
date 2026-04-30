'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, Phone, Globe, PenLine,
  Loader2, AlertCircle, MessageSquare,
} from 'lucide-react';
import { OutreachStatusBadge } from '@/components/outreach/OutreachStatusBadge';
import { ThreadView } from '@/components/outreach/ThreadView';
import { ComposeEmail } from '@/components/outreach/ComposeEmail';
import {
  updateOutreachStatus, STATUS_LABELS,
  type OutreachContact, type OutreachStatus,
} from '@/lib/api/outreach';

// ============================================================
// OUTREACH CONTACT THREAD PAGE — /outreach/[contactId]
// ============================================================

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

const STATUS_PIPELINE: OutreachStatus[] = [
  'not_contacted','sent','replied','meeting_set','teaming_agreed','declined','not_a_fit',
];

export default function OutreachContactPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const router = useRouter();
  const [compose,    setCompose]    = useState<'outbound' | 'inbound' | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [threadKey,  setThreadKey]  = useState(0); // bump to re-fetch thread

  const { data: contact, error, isLoading, mutate } = useSWR<OutreachContact>(
    contactId ? `/api/outreach/${contactId}` : null, fetcher
  );

  const handleStatusMove = async (status: OutreachStatus) => {
    if (!contact) return;
    setStatusBusy(true);
    await updateOutreachStatus(contact.id, status);
    await mutate();
    setStatusBusy(false);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      <span className="text-sm">Loading contact…</span>
    </div>
  );

  if (error || !contact) return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 max-w-lg">
      <AlertCircle className="w-5 h-5" />
      <span className="text-sm">Contact not found.</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
        <ArrowLeft className="w-4 h-4" />Back to Outreach
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <OutreachStatusBadge status={contact.status} />
            <h1 className="text-xl font-bold text-gray-900 mt-1">{contact.company_name}</h1>
            {contact.contact_name && <p className="text-sm text-gray-500">{contact.contact_name}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setCompose(compose === 'inbound' ? null : 'inbound')}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:border-gray-400 px-3 py-1.5 rounded-lg transition">
              <PenLine className="w-3.5 h-3.5" />Log Reply
            </button>
            <button onClick={() => setCompose(compose === 'outbound' ? null : 'outbound')}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition">
              <Mail className="w-3.5 h-3.5" />Send Email
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-blue-600">
              <Mail className="w-3.5 h-3.5 text-gray-400" />{contact.email}
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 hover:text-blue-600">
              <Phone className="w-3.5 h-3.5 text-gray-400" />{contact.phone}
            </a>
          )}
        </div>

        {/* Status pipeline */}
        <div className="mt-4 flex gap-1 flex-wrap">
          {STATUS_PIPELINE.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusMove(s)}
              disabled={statusBusy || s === contact.status}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition ${
                s === contact.status
                  ? 'bg-blue-600 text-white border-blue-600 cursor-default'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              } disabled:opacity-50`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Compose */}
      {compose && (
        <ComposeEmail
          contact={contact}
          direction={compose}
          onSent={() => { setCompose(null); setThreadKey((k) => k + 1); mutate(); }}
          onClose={() => setCompose(null)}
        />
      )}

      {/* Thread */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">Conversation</h2>
        </div>
        <div className="px-5 py-4">
          <ThreadView key={threadKey} contactId={contact.id} />
        </div>
      </div>

      {/* Notes */}
      {contact.notes && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 italic">
          "{contact.notes}"
        </div>
      )}
    </div>
  );
}
