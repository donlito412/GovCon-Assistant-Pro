'use client';

import React, { useState, useRef } from 'react';
import { Search, SlidersHorizontal, Loader2, AlertCircle, Building2, X } from 'lucide-react';
import { useCompanySearch } from '../../lib/api/company-search';
import { CompanySearchResult } from './CompanySearchResult';

// ============================================================
// COMPANY SEARCH PANEL
// Embeddable in Pipeline card OR used standalone at /contacts/search
// ============================================================

interface Props {
  bidId?: number;          // if embedded in a pipeline card
  initialQuery?: string;   // pre-fill query (e.g. "IT subcontractor NAICS 541512")
  compact?: boolean;        // compact mode for pipeline card embed
  onClose?: () => void;    // close handler when embedded
}

const CERT_OPTIONS = [
  { value: '8a',     label: '8(a)' },
  { value: 'hubzone', label: 'HUBZone' },
  { value: 'sdvosb', label: 'SDVOSB' },
  { value: 'wosb',   label: 'WOSB' },
];

export function CompanySearchPanel({ bidId, initialQuery = '', compact = false, onClose }: Props) {
  const [query,           setQuery]           = useState(initialQuery);
  const [naicsCode,       setNaicsCode]       = useState('');
  const [requireCertified, setRequireCertified] = useState(false);
  const [certTypes,       setCertTypes]       = useState<string[]>([]);
  const [showFilters,     setShowFilters]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, isLoading, error, sources, search, clear } = useCompanySearch();

  const handleSearch = () => {
    if (!query.trim()) return;
    search({
      query:              query.trim(),
      naicsCode:          naicsCode || undefined,
      location:           'Pittsburgh, PA',
      requireCertified,
      certificationTypes: certTypes,
      limit:              20,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const toggleCert = (val: string) => {
    setCertTypes((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    );
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-5'}>
      {/* Header (standalone mode) */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Find Companies
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Search SAM.gov, Google, and web for subcontractors, suppliers, and teaming partners
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder='e.g. "janitorial supply Pittsburgh" or "8(a) IT subcontractor"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowFilters((f) => !f)}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-xl transition ${
            showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
        <button
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">NAICS Code</label>
              <input
                type="text"
                placeholder="e.g. 541512"
                value={naicsCode}
                onChange={(e) => setNaicsCode(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">SAM.gov Certifications</label>
              <div className="flex flex-wrap gap-2">
                {CERT_OPTIONS.map((c) => (
                  <label key={c.value} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={certTypes.includes(c.value)}
                      onChange={() => toggleCert(c.value)}
                      className="accent-blue-600"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={requireCertified}
              onChange={(e) => setRequireCertified(e.target.checked)}
              className="accent-blue-600"
            />
            Show SAM-registered companies first
          </label>
        </div>
      )}

      {/* Source summary */}
      {sources && !isLoading && (
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>SAM.gov: <strong className="text-gray-700">{sources.samgov}</strong></span>
          <span>Google: <strong className="text-gray-700">{sources.google_places}</strong></span>
          <span>Web: <strong className="text-gray-700">{sources.web_search}</strong></span>
          <button onClick={clear} className="ml-auto text-gray-400 hover:text-gray-700">Clear results</button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Searching SAM.gov, Google, and web…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && results.length === 0 && sources !== null && (
        <div className="text-center py-10 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No companies found</p>
          <p className="text-xs mt-1">Try different keywords or a broader search</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className={compact ? 'space-y-3 max-h-96 overflow-y-auto pr-1' : 'space-y-3'}>
          {results.map((result) => (
            <CompanySearchResult
              key={result.id}
              result={result}
              bidId={bidId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
