'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import { useEmailThread, type OutreachEmail } from '@/lib/api/outreach';

// ============================================================
// THREAD VIEW — full email conversation history
// ============================================================

interface Props {
  contactId: number;
}

function EmailBubble({ email }: { email: OutreachEmail }) {
  const isOut = email.direction === 'outbound';
  const sentAt = new Date(email.sent_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  return (
    <div className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[85%] rounded-xl px-4 py-3 shadow-sm ${
        isOut ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'
      }`}>
        {email.subject && (
          <p className={`text-xs font-bold mb-1.5 ${isOut ? 'text-blue-100' : 'text-gray-500'}`}>
            {email.subject}
          </p>
        )}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{email.body}</div>
      </div>
      <div className={`flex items-center gap-1.5 mt-1 text-[11px] text-gray-400 ${isOut ? 'flex-row-reverse' : ''}`}>
        {isOut
          ? <ArrowUpRight className="w-3 h-3 text-blue-400" />
          : <ArrowDownLeft className="w-3 h-3 text-green-400" />}
        <span>{isOut ? 'You' : 'Them'} · {sentAt}</span>
      </div>
    </div>
  );
}

export function ThreadView({ contactId }: Props) {
  const { emails, isLoading, error } = useEmailThread(contactId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm">Loading thread…</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-500 py-4">Failed to load thread.</div>;
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-sm">No messages yet — compose your first email below.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {emails.map((email) => (
        <EmailBubble key={email.id} email={email} />
      ))}
    </div>
  );
}
