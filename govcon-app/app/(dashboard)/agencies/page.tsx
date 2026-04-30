'use client';

import React, { useState } from 'react';
import { Building2, Loader2, AlertCircle, Search } from 'lucide-react';
import { AgencyCard } from '@/components/agencies/AgencyCard';
import { useAgencies, LEVEL_LABELS, type AgencyLevel } from '@/lib/api/agencies';

// ============================================================
// AGENCY DIRECTORY PAGE — /agencies
// ============================================================

const LEVELS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Levels' },
  { value: 'federal', label: 'Federal' },
  { value: 'state', label: 'State' },
  { value: 'local', label: 'Local' },
  { value: 'education', label: 'Education' },
];

const SORT_OPTIONS = [
  { value: 'active_count:desc', label: 'Most Active Opportunities' },
  { value: 'total_spend:desc', label: 'Highest Total Spend' },
  { value: 'name:asc', label: 'Name: A → Z' },
];

export default function AgenciesPage() {
  const [level, setLevel] = useState('');
  const [sort, setSort] = useState('active_count:desc');
  const [q, setQ] = useState('');
  const [inputQ, setInputQ] = useState('');

  const { data, isLoading, error } = useAgencies({ level, sort, q });
  const agencies = data?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-600" />
          Agency Directory
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Pittsburgh-area government agencies posting contracts — federal, state, local, and educational.
        </p>
      </div>

      {/* Filters toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <form
          onSubmit={(e) => { e.preventDefault(); setQ(inputQ.trim()); }}
          className="relative flex items-center flex-1 min-w-[200px] max-w-sm"
        >
          <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            placeholder="Search agencies…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        {/* Level filter tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => setLevel(l.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                level === l.value
                  ? 'bg-white shadow-sm text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg py-2 pl-3 pr-8 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Result count */}
        {data && (
          <span className="text-sm text-gray-500 ml-auto">
            <strong className="text-gray-900">{data.total}</strong> agencies
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading agencies…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">Failed to load agencies: {error.message}</span>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && agencies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-700 mb-1">No agencies found</h3>
          <p className="text-sm text-gray-400">
            Agencies are auto-created during contract ingestion. Run the ingestion pipeline first.
          </p>
        </div>
      )}

      {/* Agency grid */}
      {!isLoading && agencies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agencies.map((agency) => (
            <AgencyCard key={agency.id} agency={agency} />
          ))}
        </div>
      )}
    </div>
  );
}
