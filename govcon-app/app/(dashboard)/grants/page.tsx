'use client';

import React, { useState, useCallback } from 'react';
import { Search, Loader2, AlertCircle, Landmark, RefreshCw } from 'lucide-react';
import { useGrants, type GrantFilters } from '@/lib/api/grants';
import { GrantCard } from '@/components/grants/GrantCard';
import { GrantFilterPanel } from '@/components/grants/GrantFilterPanel';
import { useDebounce } from 'use-debounce';

// ============================================================
// GRANTS DISCOVERY PAGE — /grants
// ============================================================

const ITEMS_PER_PAGE = 25;

function Pagination({
  page, totalPages, onChange,
}: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
      >
        ← Prev
      </button>
      <span className="text-sm text-gray-500">
        Page {page + 1} of {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
      >
        Next →
      </button>
    </div>
  );
}

export default function GrantsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ] = useDebounce(searchInput, 400);
  const [filters, setFilters] = useState<GrantFilters>({ sort: 'deadline_asc' });

  const activeFilters: GrantFilters = {
    ...filters,
    q: debouncedQ || undefined,
  };

  const { data, isLoading, error, mutate } = useGrants(activeFilters);

  const handleFilterChange = useCallback((f: GrantFilters) => {
    setFilters({ ...f, page: 0 });
  }, []);

  const handlePageChange = (p: number) => setFilters((f) => ({ ...f, page: p }));

  const grants = data?.grants ?? [];
  const total  = data?.total ?? 0;
  const page   = data?.page  ?? 0;
  const totalPages = data?.total_pages ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-emerald-600" />
            Grants & Funding
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Federal, state, and local grants, loans, and incentive programs
          </p>
        </div>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search grants by title, agency, program…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Layout */}
      <div className="flex gap-5 items-start">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 hidden md:block">
          <GrantFilterPanel filters={filters} onChange={handleFilterChange} />
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Result count */}
          {!isLoading && !error && (
            <p className="text-sm text-gray-500">
              {total.toLocaleString()} {total === 1 ? 'program' : 'programs'} found
            </p>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading grants…</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Failed to load grants — {error.message}</span>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !error && grants.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Landmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No grants found</p>
              <p className="text-xs mt-1">Try adjusting filters or run ingestion to pull fresh data</p>
            </div>
          )}

          {/* Grid */}
          {grants.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {grants.map((grant) => (
                <GrantCard key={grant.id} grant={grant} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
        </div>
      </div>
    </div>
  );
}
