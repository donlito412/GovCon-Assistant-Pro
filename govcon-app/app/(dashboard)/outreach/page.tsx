'use client';

import React, { useState, useCallback } from 'react';
import { Search, Loader2, AlertCircle, MessageSquare, RefreshCw, Plus } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import {
  useOutreachContacts, updateOutreachStatus,
  STATUS_LABELS, type OutreachStatus,
} from '@/lib/api/outreach';
import { OutreachContactCard } from '@/components/outreach/ContactCard';

// ============================================================
// OUTREACH CRM PAGE — /outreach
// ============================================================

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '',               label: 'All' },
  { value: 'not_contacted',  label: 'Not Contacted' },
  { value: 'sent',           label: 'Sent' },
  { value: 'replied',        label: 'Replied' },
  { value: 'meeting_set',    label: 'Meeting Set' },
  { value: 'teaming_agreed', label: 'Teaming Agreed' },
  { value: 'declined',       label: 'Declined' },
];

export default function OutreachPage() {
  const [searchInput, setSearchInput]   = useState('');
  const [debouncedQ] = useDebounce(searchInput, 400);
  const [statusTab,   setStatusTab]     = useState('');
  const [page,        setPage]          = useState(0);

  const { data, isLoading, error, mutate } = useOutreachContacts({
    q:      debouncedQ || undefined,
    status: statusTab  || undefined,
    page,
  });

  const contacts   = data?.contacts   ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = data?.total_pages ?? 0;

  const handleStatusChange = useCallback(async (id: number, status: OutreachStatus) => {
    await updateOutreachStatus(id, status);
    mutate();
  }, [mutate]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            Outreach CRM
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Track every conversation with subcontractors and teaming partners</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search contacts by name or company…"
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); setPage(0); }}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap border-b border-gray-200 pb-0">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setStatusTab(t.value); setPage(0); }}
            className={`px-3 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              statusTab === t.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Count */}
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
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No contacts yet</p>
          <p className="text-xs mt-1">Save a company from the Company Finder to start outreach</p>
        </div>
      )}

      {/* Grid */}
      {contacts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((c: any) => (
            <OutreachContactCard key={c.id} contact={c} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => p - 1)} disabled={page === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
