'use client';

export const dynamic = 'force-dynamic';


import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { LayoutGrid, List, Loader2, FileSearch, ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchBar } from '@/components/contracts/SearchBar';
import { SortControls } from '@/components/contracts/SortControls';
import { FilterPanel } from '@/components/contracts/FilterPanel';
import { ContractCard } from '@/components/contracts/ContractCard';
import { ContractTable } from '@/components/contracts/ContractTable';
import { useContracts, updateSearchParam, type ContractListItem } from '@/lib/api/contracts';

// ============================================================
// CONTRACTS LIST PAGE
// Main contract discovery interface.
// Filter state in URL — all shareable, back-button safe.
// ============================================================

const PAGE_SIZE = 25;

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
        Showing <span className="font-medium">{from}–{to}</span> of{' '}
        <span className="font-medium">{total.toLocaleString()}</span> results
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
        {/* Page numbers — show 5 around current */}
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <FileSearch className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">No contracts found</h3>
      <p className="text-sm text-gray-500 max-w-sm">
        Try adjusting your search or filters. Make sure the ingestion pipeline has been run to populate data.
      </p>
    </div>
  );
}

function ContractsPageInner() {
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const statusParam = searchParams.get('status') ?? 'active';
  const isClosed = statusParam.includes('closed') || statusParam.includes('awarded') || statusParam.includes('cancelled');

  const { data, isLoading, error } = useContracts({ limit: String(PAGE_SIZE) });

  function handleAddToPipeline(contract: ContractListItem) {
    // TASK_005 will wire this — for now navigate to pipeline with opp id
    window.location.href = `/pipeline?add=${contract.id}`;
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isClosed ? 'Closed/Expired Pittsburgh-area opportunities' : 'Active Pittsburgh-area opportunities — bid before the deadline'}
            {!isClosed && <span className="text-blue-600 font-medium ml-2">(Closed contracts → <a href="/awards" className="underline">Awards page</a>)</span>}
          </p>
        </div>
      </div>

      {/* Search bar */}
      <SearchBar />

      {/* Main layout: filter sidebar + results */}
      <div className="flex gap-5 items-start">
        {/* Filter panel — fixed width sidebar */}
        <FilterPanel className="w-64 flex-shrink-0 sticky top-20 hidden md:block" />

        {/* Results area */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Results header: count + sort + view toggle */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-gray-600">
              {isLoading ? (
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading…
                </span>
              ) : data ? (
                <span>
                  <span className="font-semibold text-gray-900">{data.total.toLocaleString()}</span> opportunities
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <SortControls />
              {/* View toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded-md transition ${viewMode === 'card' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  aria-label="Card view"
                  title="Card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  aria-label="Table view"
                  title="Table view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              Failed to load contracts: {error.message}
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-40 animate-pulse">
                  <div className="flex gap-2 mb-3">
                    <div className="h-5 w-20 bg-gray-200 rounded-md" />
                    <div className="h-5 w-14 bg-gray-200 rounded-md" />
                  </div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-gray-200 rounded mb-4" />
                  <div className="h-3 w-full bg-gray-100 rounded mb-1" />
                  <div className="h-3 w-2/3 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && !error && data && (
            <>
              {data.data.length === 0 ? (
                <EmptyState />
              ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {data.data.map((contract) => (
                    <ContractCard
                      key={contract.id}
                      contract={contract}
                      onAddToPipeline={handleAddToPipeline}
                    />
                  ))}
                </div>
              ) : (
                <ContractTable
                  contracts={data.data}
                  onAddToPipeline={handleAddToPipeline}
                />
              )}

              {/* Pagination */}
              {data.totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={data.totalPages}
                  total={data.total}
                  limit={PAGE_SIZE}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContractsPage() {
  return (
    <Suspense fallback={null}>
      <ContractsPageInner />
    </Suspense>
  );
}
