'use client';
export const dynamic = 'force-dynamic';


import React, { useState } from 'react';
import { Search, Loader2, AlertCircle, Users, RefreshCw } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import useSWR from 'swr';
import {
  useCommunityProfiles, type ProfileFilters, type CommunityProfile,
} from '@/lib/api/community';
import { BusinessProfileCard } from '@/components/community/BusinessProfileCard';

// ============================================================
// COMMUNITY DIRECTORY PAGE — /community
// ============================================================

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const LOOKING_FOR_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'subcontractor_work', label: 'Sub Work' },
  { value: 'prime_teaming',      label: 'Prime Teaming' },
  { value: 'suppliers',          label: 'Suppliers' },
  { value: 'mentorship',         label: 'Mentorship' },
];

const SORT_OPTIONS = [
  { value: 'newest',         label: 'Newest' },
  { value: 'oldest',         label: 'Oldest' },
  { value: 'verified_first', label: 'Verified First' },
];

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button onClick={() => onChange(page - 1)} disabled={page === 0}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
        ← Prev
      </button>
      <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
        Next →
      </button>
    </div>
  );
}

export default function CommunityPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ]  = useDebounce(searchInput, 400);
  const [samOnly,     setSamOnly]     = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [lookingFor,  setLookingFor]  = useState('');
  const [sort,        setSort]        = useState('newest');
  const [page,        setPage]        = useState(0);

  const filters: ProfileFilters = {
    q:              debouncedQ || undefined,
    sam_registered: samOnly || undefined,
    verified:       verifiedOnly || undefined,
    looking_for:    lookingFor || undefined,
    sort,
    page,
  };

  const { data, isLoading, error, mutate } = useCommunityProfiles(filters);
  const profiles    = (data?.profiles ?? []) as CommunityProfile[];
  const total       = data?.total ?? 0;
  const totalPages  = data?.total_pages ?? 0;

  // Get current user's profile id
  const { data: myProfileData } = useSWR('/api/community/profiles/me', fetcher, { revalidateOnFocus: false });
  const myProfileId: number | undefined = myProfileData?.id;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />Business Community
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Discover Pittsburgh-area business owners looking to team up</p>
        </div>
        <button onClick={() => mutate()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search businesses by name, industry, services…"
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); setPage(0); }}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={samOnly} onChange={(e) => { setSamOnly(e.target.checked); setPage(0); }} className="accent-blue-600" />
          SAM Registered
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => { setVerifiedOnly(e.target.checked); setPage(0); }} className="accent-blue-600" />
          Verified Only
        </label>
        <select value={lookingFor} onChange={(e) => { setLookingFor(e.target.value); setPage(0); }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
          {LOOKING_FOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {!isLoading && !error && (
          <span className="text-sm text-gray-400 ml-auto">{total.toLocaleString()} member{total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading community…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error.message}</span>
        </div>
      )}

      {!isLoading && !error && profiles.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No members found</p>
        </div>
      )}

      {profiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((p) => (
            <BusinessProfileCard key={p.id} profile={p} myProfileId={myProfileId} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
