'use client';
export const dynamic = 'force-dynamic';


import React, { useState } from 'react';
import {
  Loader2, AlertCircle, FileCheck, RefreshCw, Plus,
} from 'lucide-react';
import {
  useBids, computeBidStats, type BidFilters, type BidRecord,
} from '@/lib/api/bids';
import { BidCard } from '@/components/bids/BidCard';
import { BidStats } from '@/components/bids/BidStats';
import { SubmitBidForm } from '@/components/bids/SubmitBidForm';

// ============================================================
// BID HISTORY PAGE — /bids
// ============================================================

const STATUS_OPTIONS = [
  { value: '',          label: 'All Statuses' },
  { value: 'pending',   label: 'Pending' },
  { value: 'won',       label: 'Won' },
  { value: 'lost',      label: 'Lost' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'no_award',  label: 'No Award' },
];

const SORT_OPTIONS = [
  { value: 'date_desc',   label: 'Date (newest)' },
  { value: 'date_asc',    label: 'Date (oldest)' },
  { value: 'amount_desc', label: 'Amount (high→low)' },
  { value: 'amount_asc',  label: 'Amount (low→high)' },
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

export default function BidsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [sort,         setSort]         = useState('date_desc');
  const [page,         setPage]         = useState(0);
  const [showForm,     setShowForm]     = useState(false);

  const filters: BidFilters = {
    status: statusFilter || undefined,
    sort,
    page,
  };

  // Fetch all for stats (no filter), and filtered list for display
  const { data: allData }                           = useBids({});
  const { data, isLoading, error, mutate }          = useBids(filters);

  const allBids   = (allData?.bids ?? []) as BidRecord[];
  const bids      = (data?.bids ?? []) as BidRecord[];
  const total     = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;
  const stats     = computeBidStats(allBids);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-green-600" />
            Bid History
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Every bid you've submitted — pending, won, and lost</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm((s) => !s)}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border transition ${
              showForm ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-600 border-green-300 hover:bg-green-50'
            }`}
          >
            <Plus className="w-4 h-4" />Log Bid
          </button>
          <button onClick={() => mutate()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {allBids.length > 0 && <BidStats stats={stats} />}

      {/* Log bid form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <SubmitBidForm
            onCreated={() => { mutate(); setShowForm(false); }}
            onClose={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {!isLoading && !error && (
          <p className="text-sm text-gray-400 ml-auto">{total.toLocaleString()} bid{total !== 1 ? 's' : ''}</p>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading bids…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error.message}</span>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && bids.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No bids recorded yet</p>
          <p className="text-xs mt-1">Click "Log Bid" to record your first submission</p>
        </div>
      )}

      {/* Grid */}
      {bids.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bids.map((bid) => <BidCard key={bid.id} bid={bid} />)}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
