'use client';

import React, { useState } from 'react';
import { Calendar, Building2, Tag, Handshake, CheckCircle, Loader2 } from 'lucide-react';
import { sendMessage, closeTeamingPost, type TeamingPost } from '../../lib/api/community';

// ============================================================
// TEAMING POST CARD — teaming board listing
// ============================================================

interface Props {
  post: TeamingPost;
  myProfileId?: number;
  isOwner?: boolean;
  onClosed?: () => void;
}

export function TeamingPostCard({ post, myProfileId, isOwner, onClosed }: Props) {
  const [showInterest, setShowInterest] = useState(false);
  const [message,      setMessage]      = useState('');
  const [sending,      setSending]      = useState(false);
  const [sent,         setSent]         = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const deadlineStr = post.response_deadline
    ? new Date(post.response_deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const isExpired = post.response_deadline
    ? new Date(post.response_deadline) < new Date()
    : false;

  const handleInterest = async () => {
    if (!myProfileId) return;
    setSending(true);
    setError(null);
    try {
      const intro = message.trim() || `Hi, I'm interested in your teaming post: "${post.title}"`;
      await sendMessage(post.author_profile_id, intro);
      setSent(true);
      setShowInterest(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleClose = async (status: 'filled' | 'expired') => {
    await closeTeamingPost(post.id, status);
    onClosed?.();
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition ${
      post.status !== 'open' ? 'opacity-60' : 'hover:shadow-md border-gray-200'
    }`}>
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />

      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            post.status === 'open' ? 'bg-green-100 text-green-700' :
            post.status === 'filled' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
          </span>
          {post.community_profiles && (
            <span className="text-xs text-gray-400 truncate max-w-[140px]">
              {post.community_profiles.business_name}
            </span>
          )}
        </div>
        <h3 className="text-sm font-bold text-gray-900 leading-snug">{post.title}</h3>
      </div>

      {post.description && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 line-clamp-2">{post.description}</p>
        </div>
      )}

      <div className="px-4 pb-2 space-y-1">
        {post.contract_value_range && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
            Contract value: {post.contract_value_range}
          </div>
        )}
        {deadlineStr && (
          <div className={`flex items-center gap-1.5 text-xs ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            Response by {deadlineStr}
            {isExpired && ' (expired)'}
          </div>
        )}
      </div>

      {(post.naics_needed?.length > 0 || post.certifications_needed?.length > 0) && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {post.naics_needed?.map((n) => (
            <span key={n} className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{n}</span>
          ))}
          {post.certifications_needed?.map((c) => (
            <span key={c} className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{c}</span>
          ))}
        </div>
      )}

      {error && <p className="px-4 pb-2 text-xs text-red-500">{error}</p>}

      {sent && (
        <div className="px-4 pb-3 flex items-center gap-1.5 text-xs text-green-600 font-semibold">
          <CheckCircle className="w-3.5 h-3.5" />Interest sent!
        </div>
      )}

      {post.status === 'open' && !sent && (
        <div className="border-t border-gray-100 px-4 py-2.5">
          {isOwner ? (
            <div className="flex gap-2">
              <button onClick={() => handleClose('filled')}
                className="text-xs text-gray-600 hover:text-green-700 border border-gray-200 hover:border-green-300 px-2.5 py-1.5 rounded-lg transition">
                Mark Filled
              </button>
              <button onClick={() => handleClose('expired')}
                className="text-xs text-gray-400 hover:text-gray-700 px-2.5 py-1.5 rounded-lg">
                Close Post
              </button>
            </div>
          ) : (
            <>
              {showInterest ? (
                <div className="space-y-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Introduce yourself and why you're a good fit…"
                    rows={2}
                    className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleInterest} disabled={sending}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
                      {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Handshake className="w-3 h-3" />}
                      {sending ? 'Sending…' : "I'm Interested"}
                    </button>
                    <button onClick={() => setShowInterest(false)}
                      className="text-xs text-gray-400 hover:text-gray-700">Cancel</button>
                  </div>
                </div>
              ) : (
                myProfileId && (
                  <button onClick={() => setShowInterest(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition w-full justify-center">
                    <Handshake className="w-3.5 h-3.5" />I'm Interested
                  </button>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
