'use client';

export const dynamic = 'force-dynamic';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Award, DollarSign, Building2, ChevronLeft, ChevronRight,
  ExternalLink, Search, Loader2, Filter,
} from 'lucide-react';
import { useContracts, updateSearchParam } from '@/lib/api/contracts';

// ============================================================
// FEDERAL CONTRACT AWARDS PAGE — /awards
// Shows awarded contracts from USASpending.gov
// ============================================================

const PAGE_SIZE = 25;

function formatDollars(cents: number | null): string {
  if (!cents) return '—';
  const dollars = cents / 100;
  if (dollars >= 1_000_000_000) return `$${(dollars / 1_000_000_000).toFixed(1)}B`;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toFixed(0)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function Pagination({
  page, totalPages, total, limit,
}: { page: number; totalPages: number; total: number; limit: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goTo(p: number) {
    const qs = updateSearchParam(new URLSearchParams(searchParams.toString()), { page: String(p) });
    router.push(`${pathname}?${qs}`);
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between py-4">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium">{from.toLocaleString()}–{to.toLocaleString()}</span> of{' '}
        <span className="font-medium">{total.toLocaleString()}</span> awards
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const start = Math.max(1, Math.min(page - 2, totalPages - 4));
          const p = start + i;
          if (p > totalPages) return null;
          return (
            <button
              key={p}
              onClick={() => goTo(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function AwardRow({ award }: { award: ReturnType<typeof useContracts>['data'] extends { data: Array<infer T> } ? T : never }) {
  // Extract recipient from description: "Awarded to: COMPANY NAME. NAICS: ..."
  const recipientMatch = award.description?.match(/Awarded to:\s*([^.]+)/i);
  const recipient = recipientMatch?.[1]?.trim() ?? '—';

  const value = award.value_max;
  const valueStr = formatDollars(value);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-200 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
            {award.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">{award.agency_name ?? '—'}</span>
          </div>

          {/* Recipient */}
          {recipient !== '—' && (
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-2 py-1 mb-2 w-fit max-w-full">
              <Award className="w-3 h-3 flex-shrink-0" />
              <span className="truncate font-medium">{recipient}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {award.solicitation_number && (
              <span className="bg-gray-100 rounded px-2 py-0.5 font-mono">
                {award.solicitation_number}
              </span>
            )}
            {award.place_of_performance_city && (
              <span>{award.place_of_performance_city}, {award.place_of_performance_state}</span>
            )}
            {award.posted_date && (
              <span>Awarded: {formatDate(award.posted_date)}</span>
            )}
            {award.deadline && award.deadline > new Date().toISOString() && (
              <span>Expires: {formatDate(award.deadline)}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{valueStr}</p>
            <p className="text-xs text-gray-400">Contract Value</p>
          </div>
          {award.url && (
            <a
              href={award.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition"
            >
              USASpending <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function AwardsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const q = searchParams.get('q') ?? '';
  const agency = searchParams.get('agency') ?? '';
  const sort = searchParams.get('sort') ?? 'value_max:desc';

  const { data: response, isLoading, error } = useContracts({
    source: 'federal_usaspending',
    status: 'awarded',
    q,
    agency,
    sort,
    page: String(page),
    limit: String(PAGE_SIZE),
  });

  const awards = response?.data ?? [];
  const total = response?.total ?? 0;
  const totalPages = response?.totalPages ?? 1;

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const query = (fd.get('q') as string) ?? '';
    const qs = updateSearchParam(new URLSearchParams(), { q: query, page: '1' });
    router.push(`${pathname}?${qs}`);
  }

  function handleSortChange(newSort: string) {
    const qs = updateSearchParam(new URLSearchParams(searchParams.toString()), { sort: newSort, page: '1' });
    router.push(`${pathname}?${qs}`);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Federal Contract Awards</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Awarded contracts in the Pittsburgh metro area · Source: USASpending.gov
          </p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="text-sm font-semibold text-green-800">{total.toLocaleString()} Awards</span>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex-1 min-w-[240px] max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search awards by title, agency, or recipient..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </form>

        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="value_max:desc">Highest Value</option>
          <option value="value_max:asc">Lowest Value</option>
          <option value="posted_date:desc">Most Recent</option>
          <option value="posted_date:asc">Oldest First</option>
          <option value="deadline:desc">Latest Expiry</option>
        </select>
      </div>

      {/* Stats Row */}
      {!isLoading && awards.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">Total Awards</p>
            <p className="text-xl font-bold text-gray-900">{total.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">Total Value (shown)</p>
            <p className="text-xl font-bold text-gray-900">
              {formatDollars(awards.reduce((sum, a) => sum + (a.value_max ?? 0), 0))}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">Avg. Award Value</p>
            <p className="text-xl font-bold text-gray-900">
              {awards.length > 0
                ? formatDollars(Math.round(awards.reduce((sum, a) => sum + (a.value_max ?? 0), 0) / awards.length))
                : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          Failed to load awards: {error.message}
        </div>
      )}

      {/* Awards List */}
      {!isLoading && !error && (
        <>
          <div className="space-y-3">
            {awards.map((award) => (
              <AwardRow key={award.id} award={award as any} />
            ))}
          </div>

          {awards.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400">
              <Award className="w-8 h-8 mb-2" />
              <p className="text-sm font-medium">No awards found</p>
              <p className="text-xs">Try adjusting your search</p>
            </div>
          )}

          {awards.length > 0 && (
            <Pagination page={page} totalPages={totalPages} total={total} limit={PAGE_SIZE} />
          )}
        </>
      )}
    </div>
  );
}

export default function AwardsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    }>
      <AwardsContent />
    </Suspense>
  );
}
