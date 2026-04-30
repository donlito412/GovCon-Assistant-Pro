'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, Handshake, Plus, RefreshCw } from 'lucide-react';
import useSWR from 'swr';
import {
  useTeamingPosts, type TeamingPost, type CommunityProfile,
} from '@/lib/api/community';
import { TeamingPostCard } from '@/components/community/TeamingPostCard';
import { PostTeamingRequest } from '@/components/community/PostTeamingRequest';

// ============================================================
// TEAMING BOARD PAGE — /community/teaming
// ============================================================

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CERT_OPTIONS = ['8(a)', 'HUBZone', 'SDVOSB', 'WOSB', 'EDWOSB', 'MBE/WBE'];

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button onClick={() => onChange(page - 1)} disabled={page === 0}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
      <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
    </div>
  );
}

export default function TeamingPage() {
  const [naicsFilter, setNaicsFilter] = useState('');
  const [certFilter,  setCertFilter]  = useState('');
  const [statusTab,   setStatusTab]   = useState<'open' | 'filled'>('open');
  const [page,        setPage]        = useState(0);
  const [showForm,    setShowForm]    = useState(false);

  const { data, isLoading, error, mutate } = useTeamingPosts({
    status:      statusTab,
    naics:       naicsFilter || undefined,
    cert_needed: certFilter  || undefined,
    page,
  });

  const posts       = (data?.posts ?? []) as TeamingPost[];
  const total       = data?.total ?? 0;
  const totalPages  = data?.total_pages ?? 0;

  const { data: myProfileData } = useSWR('/api/community/profiles/me', fetcher, { revalidateOnFocus: false });
  const myProfile: CommunityProfile | undefined = myProfileData ?? undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Handshake className="w-6 h-6 text-indigo-600" />Teaming Board
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Open teaming requests from Pittsburgh-area businesses</p>
        </div>
        <div className="flex gap-2">
          {myProfile && (
            <button onClick={() => setShowForm((s) => !s)}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border transition ${
                showForm ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'
              }`}>
              <Plus className="w-4 h-4" />Post Request
            </button>
          )}
          <button onClick={() => mutate()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Post form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <PostTeamingRequest
            onCreated={() => { mutate(); setShowForm(false); }}
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {(['open', 'filled'] as const).map((s) => (
          <button key={s} onClick={() => { setStatusTab(s); setPage(0); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              statusTab === s ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="NAICS code filter…" value={naicsFilter}
          onChange={(e) => { setNaicsFilter(e.target.value); setPage(0); }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none w-40" />
        <select value={certFilter} onChange={(e) => { setCertFilter(e.target.value); setPage(0); }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">Any certification</option>
          {CERT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {!isLoading && !error && (
          <span className="text-sm text-gray-400 ml-auto">{total.toLocaleString()} post{total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /><span className="text-sm">Loading posts…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /><span className="text-sm">{error.message}</span>
        </div>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Handshake className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No teaming posts yet</p>
          {myProfile && <p className="text-xs mt-1">Post the first teaming request to get started</p>}
          {!myProfile && <p className="text-xs mt-1">Create a community profile to post teaming requests</p>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <TeamingPostCard
            key={post.id}
            post={post}
            myProfileId={myProfile?.id}
            isOwner={post.author_profile_id === myProfile?.id}
            onClosed={() => mutate()}
          />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
