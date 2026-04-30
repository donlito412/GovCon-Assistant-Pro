'use client';

export const dynamic = 'force-dynamic';


import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { Bell, Plus, Loader2, AlertCircle, Search } from 'lucide-react';
import { SavedSearchCard } from '@/components/saved-searches/SavedSearchCard';
import { SaveSearchModal } from '@/components/saved-searches/SaveSearchModal';
import { useSavedSearches } from '@/lib/api/saved-searches';

// ============================================================
// SAVED SEARCHES PAGE — /saved-searches
// Lists all saved searches with last-run info, match counts,
// alert toggles, and delete actions.
// ============================================================

function SavedSearchesPageInner() {
  const { searches, isLoading, error, mutate } = useSavedSearches();
  const [modalOpen, setModalOpen] = useState(false);

  const alertEnabledCount = searches.filter((s) => s.alert_enabled).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Saved Searches
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Save filter combinations and get email alerts when new matches are posted.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          New Saved Search
        </button>
      </div>

      {/* Alert summary banner */}
      {searches.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 flex items-center gap-3">
          <Bell className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            <strong>{alertEnabledCount}</strong> of <strong>{searches.length}</strong> saved{' '}
            search{searches.length !== 1 ? 'es have' : ' has'} email alerts enabled.
            Alerts run daily at <strong>8:00 AM ET</strong> after ingestion completes.
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading saved searches…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">Failed to load saved searches: {error.message}</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && searches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved searches yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            Apply filters on the contracts page and save your search to get daily email alerts
            when new matches are posted.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/contracts"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Browse Contracts →
            </Link>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Save a Search
            </button>
          </div>
        </div>
      )}

      {/* Search grid */}
      {!isLoading && searches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {searches.map((search) => (
            <SavedSearchCard
              key={search.id}
              search={search}
              onDeleted={() => mutate()}
            />
          ))}
        </div>
      )}

      {/* How alerts work info box */}
      {!isLoading && searches.length > 0 && (
        <section className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">How Alerts Work</h2>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Federal contracts are ingested at <strong>6:00 AM ET</strong></li>
            <li>State &amp; local contracts are ingested at <strong>7:00 AM ET</strong></li>
            <li>Alert emails are sent at <strong>8:00 AM ET</strong> for any new matches</li>
            <li>Each opportunity is only emailed once per saved search (no duplicates)</li>
            <li>Alerts are sent to <strong>jon@murphreeenterprises.com</strong></li>
          </ul>
        </section>
      )}

      {/* Save Search Modal */}
      <SaveSearchModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { mutate(); setModalOpen(false); }}
      />
    </div>
  );
}

export default function SavedSearchesPage() {
  return (
    <Suspense fallback={null}>
      <SavedSearchesPageInner />
    </Suspense>
  );
}
