'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useMessageThread, sendMessage, type CommunityMessage } from '@/lib/api/community';

// ============================================================
// MESSAGE THREAD — direct messages between connected profiles
// ============================================================

interface Props {
  withProfileId: number;
  withProfileName: string;
  myProfileId: number;
}

function Bubble({ msg, isMe }: { msg: CommunityMessage; isMe: boolean }) {
  const time = new Date(msg.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
  return (
    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
        isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
      }`}>
        {msg.body}
      </div>
      <span className="text-[10px] text-gray-400 mt-0.5">{time}</span>
    </div>
  );
}

export function MessageThread({ withProfileId, withProfileName, myProfileId }: Props) {
  const [draft,   setDraft]   = useState('');
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, mutate } = useMessageThread(withProfileId);
  const messages: CommunityMessage[] = data?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(withProfileId, draft.trim());
      setDraft('');
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-bold text-gray-900">{withProfileName}</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Loading…</span>
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">No messages yet — say hello!</p>
        )}
        {messages.map((msg) => (
          <Bubble key={msg.id} msg={msg} isMe={msg.from_profile_id === myProfileId} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        {error && <p className="text-xs text-red-500 mb-1">{error}</p>}
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${withProfileName}…`}
            rows={1}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            className="flex items-center gap-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg disabled:opacity-50 transition"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
