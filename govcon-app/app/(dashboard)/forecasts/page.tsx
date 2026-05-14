'use client';
export const dynamic = 'force-dynamic';


import React, { useState } from 'react';
import { Search, Loader2, AlertCircle, RefreshCw, Telescope, Bot } from 'lucide-react';
import Link from 'next/link';
import { useDebounce } from 'use-debounce';
import {
  useForecasts, type ForecastFilters, type ForecastOpportunity,
} from '@/lib/api/forecasts';
import { ForecastCard } from '@/components/forecasts/ForecastCard';

// ============================================================
// FORECAST OPPORTUNITIES PAGE — /forecasts
// ============================================================

const STATUS_TABS = [
  { label: 'Active',    value: 'active'    },
  { label: 'Solicited', value: 'solicited' },
  { label: 'Awarded',   value: 'awarded'   },
] as const;

const DAYS_OPTIONS = [
  { label: 'All upcoming',  value: undefined },
  { label: '30 days',       value: 30  },
  { label: '60 days',       value: 60  },
  { label: '6 months',      value: 180 },
  { label: '1 year',        value: 365 },
];

const SORT_OPTIONS = [
  { label: 'Soonest RFP',    value: 'soonest'        },
  { label: 'Highest Value',  value: 'highest_value'  },
  { label: 'Latest RFP',     value: 'latest'         },
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

export default function ForecastsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ]  = useDebounce(searchInput, 400);
  const [naicsInput,  setNaicsInput]  = useState('');
  const [debouncedNaics] = useDebounce(naicsInput, 500);
  const [agencyInput, setAgencyInput] = useState('');
  const [debouncedAgency] = useDebounce(agencyInput, 500);
  const [status,      setStatus]      = useState<'active' | 'solicited' | 'awarded'>('active');
  const [days,        setDays]        = useState<number | undefined>(undefined);
  const [sort,        setSort]        = useState<'soonest' | 'highest_value' | 'latest'>('soonest');
  const [page,        setPage]        = useState(0);

  const filters: ForecastFilters = {
    q:      debouncedQ || undefined,
    naics:  debouncedNaics || undefined,
    agency: debouncedAgency || undefined,
    status,
    days,
    sort,
    page,
    per_page: 20,
  };

  const { data, isLoading, error, mutate } = useForecasts(filters);
  const forecasts  = data?.forecasts ?? [];
  const total      = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;

  const handleAddToPipeline = async (forecast: ForecastOpportunity) => {
    if (!forecast.linked_opportunity_id) {
      window.alert('This forecast does not have a live linked solicitation yet, so it cannot be added to the contract pipeline.');
      return;
    }

    await fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opportunity_id: forecast.linked_opportunity_id,
        stage: 'Identified',
      }),
    });
  };

  const handleWatch = (forecast: ForecastOpportunity) => {
    const aiUrl = `/assistant?prompt=${encodeURIComponent(
      `Help me prepare for this forecast opportunity: "${forecast.title}" from ${forecast.agency_name ?? 'an agency'}. What should I do now before the RFP drops?`
    )}`;
    window.open(aiUrl, '_blank');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Telescope className="w-6 h-6 text-indigo-600" />Forecast Opportunities
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Planned acquisitions before the formal RFP drops — get your foot in the door early
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/assistant?prompt=Find+forecast+opportunities+in+Pittsburgh+that+match+my+capabilities"
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-2 rounded-lg transition">
            <Bot className="w-4 h-4" />AI Analysis
          </Link>
          <button onClick={() => mutate()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search forecast opportunities…"
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); setPage(0); }}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map((t) => (
          <button key={t.value} onClick={() => { setStatus(t.value); setPage(0); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              status === t.value ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-wrap gap-1">
          {DAYS_OPTIONS.map((o) => (
            <button key={String(o.value)} onClick={() => { setDays(o.value); setPage(0); }}
              className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                days === o.value ? 'bg-indigo-500 text-white border-indigo-500' : 'text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
        <input type="text" value={naicsInput} onChange={(e) => { setNaicsInput(e.target.value); setPage(0); }}
          placeholder="NAICS filter…"
          className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 w-28 focus:outline-none" />
        <input type="text" value={agencyInput} onChange={(e) => { setAgencyInput(e.target.value); setPage(0); }}
          placeholder="Agency filter…"
          className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 w-36 focus:outline-none" />
        <select value={sort} onChange={(e) => { setSort(e.target.value as any); setPage(0); }}
          className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {!isLoading && !error && (
          <span className="text-sm text-gray-400 ml-auto">{total.toLocaleString()} forecast{total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /><span className="text-sm">Loading forecasts…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /><span className="text-sm">{error.message}</span>
        </div>
      )}

      {!isLoading && !error && forecasts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Telescope className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No forecast opportunities found</p>
          <p className="text-xs mt-1">SAM.gov forecasts are refreshed daily — check back tomorrow</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {forecasts.map((f) => (
          <ForecastCard key={f.id} forecast={f} onWatch={handleWatch} onAddToPipeline={handleAddToPipeline} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
