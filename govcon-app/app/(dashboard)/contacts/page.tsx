'use client';

import React, { useState, useCallback } from 'react';
import { Search, Loader2, AlertCircle, BookUser, RefreshCw, Plus } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { useContacts, type ContactFilters, type Contact } from '@/lib/api/company-search';
import { ContactCard } from '@/components/contacts/ContactCard';
import { CompanySearchPanel } from '@/components/company-finder/CompanySearchPanel';

// ============================================================
// CONTACTS PAGE — /contacts
// Saved contact book + embedded company search
// ============================================================

const STATUS_OPTIONS = [
  { value: '',          label: 'All Statuses' },
  { value: 'saved',     label: 'Saved' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'teaming',   label: 'Teaming' },
  { value: 'declined',  label: 'Declined' },
];

const SOURCE_OPTIONS = [
  { value: '',             label: 'All Sources' },
  { value: 'samgov',       label: 'SAM.gov' },
  { value: 'google_places', label: 'Google' },
  { value: 'web_search',   label: 'Web Search' },
  { value: 'manual',       label: 'Manual' },
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

export default function ContactsPage() {
  const [searchInput,    setSearchInput]    = useState('');
  const [debouncedQ]   = useDebounce(searchInput, 400);
  const [statusFilter,   setStatusFilter]   = useState('');
  const [sourceFilter,   setSourceFilter]   = useState('');
  const [samOnly,        setSamOnly]        = useState(false);
  const [page,           setPage]           = useState(0);
  const [showSearch,     setShowSearch]     = useState(false);

  const filters: ContactFilters = {
    q:             debouncedQ || undefined,
    status:        statusFilter || undefined,
    source:        sourceFilter || undefined,
    sam_registered: samOnly ? true : undefined,
    page,
  };

  const { data, isLoading, error, mutate } = useContacts(filters);

  const contacts     = data?.contacts ?? [];
  const total        = data?.total    ?? 0;
  const totalPages   = data?.total_pages ?? 0;

  const handleDeleted = useCallback((id: number) => mutate(), [mutate]);
  const handleUpdated = useCallback((c: Contact) => mutate(), [mutate]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookUser className="w-6 h-6 text-blue-600" />
            Contact Book
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Companies you've found, saved, and worked with
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSearch((s) => !s)}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border transition ${
              showSearch ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
            }`}
          >
            <Plus className="w-4 h-4" />
            Find Company
          </button>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline search panel */}
      {showSearch && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <CompanySearchPanel
            onClose={() => setShowSearch(false)}
          />
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts…"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={samOnly} onChange={(e) => { setSamOnly(e.target.checked); setPage(0); }}
            className="accent-blue-600" />
          SAM only
        </label>
      </div>

      {/* Result count */}
      {!isLoading && !error && (
        <p className="text-sm text-gray-500">{total.toLocaleString()} contact{total !== 1 ? 's' : ''}</p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading contacts…</span>
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
      {!isLoading && !error && contacts.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <BookUser className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No contacts yet</p>
          <p className="text-xs mt-1">Use "Find Company" to search and save companies</p>
        </div>
      )}

      {/* Grid */}
      {contacts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
