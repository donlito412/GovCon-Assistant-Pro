'use client';

import React, { useState } from 'react';
import { Check, X, Loader2, UserPlus, UserCheck } from 'lucide-react';
import {
  sendConnectionRequest, respondToConnection,
  type CommunityProfile, type ConnectionRequest as ConnReq,
} from '@/lib/api/community';

// ============================================================
// CONNECTION REQUEST — send / accept / decline
// ============================================================

interface SendProps {
  toProfile: Pick<CommunityProfile, 'id' | 'business_name'>;
  fromProfileId: number;
  onSent?: () => void;
  onCancel?: () => void;
}

export function ConnectionRequest({ toProfile, fromProfileId, onSent, onCancel }: SendProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      await sendConnectionRequest(toProfile.id, message || undefined);
      setSent(true);
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
        <UserCheck className="w-3.5 h-3.5" />Request sent to {toProfile.business_name}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`Introduce yourself to ${toProfile.business_name}… (optional)`}
        rows={2}
        className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSend} disabled={sending}
          className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition">
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
          {sending ? 'Sending…' : 'Send Request'}
        </button>
        <button onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5">Cancel</button>
      </div>
    </div>
  );
}

// ---- Respond to incoming request ----

interface RespondProps {
  request: ConnReq;
  onResponded?: () => void;
}

export function ConnectionRequestRespond({ request, onResponded }: RespondProps) {
  const [busy,  setBusy]  = useState(false);
  const [done,  setDone]  = useState(false);
  const [error, setError] = useState<string | null>(null);

  const respond = async (status: 'accepted' | 'declined') => {
    setBusy(true);
    try {
      await respondToConnection(request.id, status);
      setDone(true);
      onResponded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  if (done) return <span className="text-xs text-gray-400">Responded</span>;

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-700">
        <strong>{request.from_profile?.business_name}</strong> wants to connect
        {request.message && <span className="italic text-gray-500"> — "{request.message}"</span>}
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => respond('accepted')} disabled={busy}
          className="flex items-center gap-1 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-2.5 py-1.5 rounded-lg disabled:opacity-50">
          <Check className="w-3 h-3" />Accept
        </button>
        <button onClick={() => respond('declined')} disabled={busy}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 px-2.5 py-1.5 rounded-lg">
          <X className="w-3 h-3" />Decline
        </button>
      </div>
    </div>
  );
}
