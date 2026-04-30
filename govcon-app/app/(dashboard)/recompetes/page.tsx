'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle, RefreshCw, Clock, Bot } from 'lucide-react';
import Link from 'next/link';
import { useDebounce } from 'use-debounce';
import {
  useRecompetes, type RecompeteFilters, type IncumbentContract,
} from '../../../lib/api/recompetes';
import { RecompeteCard } from '../../../components/recompetes/RecompeteCard';

// ============================================================
// RECOMPETE RADAR PAGE — /recompetes
// ============================================================

const DAYS_OPTIONS = [
  { label: '30 days',  value: 30  },
  { label: '60 days',  value: 60  },
  { label: '90 days',  value: 90  },
  { label: '6 months', value: 180 },
  { label: '1 year',   value: 365 },
  { label: '18 months', value: 548 },
];

const SORT_OPTIONS = [
  { label: 'Soonest Expiring',  value: 'soonest'        },
  { label: 'Highest Value',     value: 'highest_value'   },
];

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

export default function RecompetesPage() {
  const [days,       setDays]      = useState(180);
  const [naicsInput, setNaicsInput] = useState('');
  const [agencyInput, setAgencyInput] = useState('');
  const [sort,       setSort]      = useState<'soonest' | 'highest_value'>('soonest');
  const [page,       setPage]      = useState(0);

  const [debouncedNaics]  = useDebounce(naicsInput,  500);
  const [debouncedAgency] = useDebounce(agencyInput, 500);

  const filters: RecompeteFilters = {
    days, naics: debouncedNaics || undefined, agency: debouncedAgency || undefined,
    sort, page, per_page: 20,
  };

  const { data, isLoading, error, mutate } = useRecompetes(filters);
  const recompetes  = data?.recompetes ?? [];
  const total       = data?.total ?? 0;
  const totalPages  = data?.total_pages ?? 0;

  const handleAddToPipeline = async (contract: IncumbentContract) => {
    const title = contract.opportunities?.title ?? `${contract.agency_name} — Recompete`;
    await fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: 'tracking',
        notes: `Recompete radar: incumbent is ${contract.current_awardee_name}. Contract expires ${contract.period_of_performance_end_date}.`,
        opportunity_id: contract.opportunity_id ?? null,
      }),
    });
  };

  const handleWatch = (contract: IncumbentContract) => {
    const aiUrl = `/assistant?prompt=${encodeURIComponent(
      `Research the incumbent ${contract.current_awardee_name} for the ${contract.agency_name ?? ''} contract (NAICS ${contract.naics_code}). What's their win history and how should I position for the recompete?`
    )}`;
    window.open(aiUrl, '_blank');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" />Recompete Radar
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Contracts expiring soon in the Pittsburgh area — get ahead of the recompete</p>
        </div>
        <div className="flex gap-2">
          <Link href="/assistant?prompt=Show+me+the+top+recompete+opportunities+I+should+target+in+Pittsburgh"
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-2 rounded-lg transition">
            <Bot className="w-4 h-4" />AI Analysis
          </Link>
          <button onClick={() => mutate()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Expiring Within</label>
          <div className="flex flex-wrap gap-1">
            {DAYS_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => { setDays(o.value); setPage(0); }}
                className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                  days === o.value ? 'bg-amber-500 text-white border-amber-500' : 'text-gray-600 border-gray-200 hover:border-amber-300'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 items-end ml-auto flex-wrap">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">NAICS</label>
            <input type="text" value={naicsInput} onChange={(e) => { setNaicsInput(e.target.value); setPage(0); }}
              placeholder="e.g. 541512"
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 w-28 focus:outline-none focus:ring-1 focus:ring-amber-400" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Agency</label>
            <input type="text" value={agencyInput} onChange={(e) => { setAgencyInput(e.target.value); setPage(0); }}
              placeholder="Filter agency…"
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-amber-400" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Sort</label>
            <select value={sort} onChange={(e) => { setSort(e.target.value as any); setPage(0); }}
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {!isLoading && !error && (
          <p className="text-sm text-gray-400 w-full">{total.toLocaleString()} contract{total !== 1 ? 's' : ''} expiring within {days} days</p>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /><span className="text-sm">Loading recompetes…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /><span className="text-sm">{error.message}</span>
        </div>
      )}

      {!isLoading && !error && recompetes.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No expiring contracts found</p>
          <p className="text-xs mt-1">Try expanding the time window or broadening your filters</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {recompetes.map((c) => (
          <RecompeteCard key={c.id} contract={c} onAddToPipeline={handleAddToPipeline} onWatch={handleWatch} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
