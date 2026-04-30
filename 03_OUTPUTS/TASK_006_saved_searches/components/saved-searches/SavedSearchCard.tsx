'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Trash2, ExternalLink, Clock, Search } from 'lucide-react';
import { AlertPreferences } from './AlertPreferences';
import { deleteSavedSearch, filterSummary, filtersToQueryString, type SavedSearch } from '../../lib/api/saved-searches';

// ============================================================
// SAVED SEARCH CARD
// Shows: name, filter summary, last checked, alert toggle,
// run results count, browse + delete actions.
// ============================================================

interface SavedSearchCardProps {
  search: SavedSearch;
  onDeleted: (id: number) => void;
}

export function SavedSearchCard({ search, onDeleted }: SavedSearchCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const summary = filterSummary(search.filters_json);
  const browseUrl = `/contracts?${filtersToQueryString(search.filters_json)}`;

  const lastChecked = search.last_checked_at
    ? new Date(search.last_checked_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : 'Never run';

  const createdDate = new Date(search.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  async function handleDelete() {
    if (!confirm(`Delete saved search "${search.name}"?`)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSavedSearch(search.id);
      onDeleted(search.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
      {/* Top row: name + alert toggle */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Search className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <h3 className="text-sm font-bold text-gray-900 truncate">{search.name}</h3>
        </div>
        <AlertPreferences
          searchId={search.id}
          alertEnabled={search.alert_enabled}
        />
      </div>

      {/* Filter summary */}
      <p className="text-xs text-gray-500 mb-3 leading-relaxed line-clamp-2">
        {summary}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Last checked: {lastChecked}
        </span>
        <span>Created {createdDate}</span>
      </div>

      {/* Match count badge */}
      {search.match_count !== undefined && search.match_count > 0 && (
        <div className="mb-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
            {search.match_count} active match{search.match_count !== 1 ? 'es' : ''}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <Link
          href={browseUrl}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Browse Matches
        </Link>

        <div className="flex items-center gap-2">
          {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
            aria-label="Delete saved search"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
