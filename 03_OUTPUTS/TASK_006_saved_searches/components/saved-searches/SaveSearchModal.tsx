'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, Bell, BellOff, Bookmark, Loader2 } from 'lucide-react';
import { createSavedSearch, buildFiltersJson, filterSummary } from '../../lib/api/saved-searches';

// ============================================================
// SAVE SEARCH MODAL
// Triggered from FilterPanel or ContractList toolbar.
// Shows current active filters, asks for a name, saves.
// ============================================================

interface SaveSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SaveSearchModal({ isOpen, onClose, onSaved }: SaveSearchModalProps) {
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build filters preview from current URL params
  const filtersJson = buildFiltersJson(new URLSearchParams(searchParams.toString()));
  const summary = filterSummary(filtersJson);
  const hasFilters = Object.keys(filtersJson).length > 0;

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
      setSuccess(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter a name for this search.'); return; }
    setLoading(true);
    setError(null);
    try {
      await createSavedSearch(name.trim(), filtersJson, alertEnabled);
      setSuccess(true);
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save search');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed z-50 inset-0 flex items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-search-title"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-600" />
              <h2 id="save-search-title" className="text-base font-bold text-gray-900">
                Save This Search
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
            {/* Active filters preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Active Filters
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {hasFilters ? summary : 'No filters active — this will match all contracts.'}
              </p>
              {!hasFilters && (
                <p className="text-xs text-amber-600 mt-1">
                  Tip: apply some filters first to make this search more targeted.
                </p>
              )}
            </div>

            {/* Name input */}
            <div>
              <label htmlFor="search-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Search Name
              </label>
              <input
                ref={inputRef}
                id="search-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. IT contracts > $100K, Construction RFPs…"
                maxLength={80}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                disabled={loading || success}
              />
            </div>

            {/* Alert toggle */}
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                {alertEnabled
                  ? <Bell className="w-4 h-4 text-blue-600" />
                  : <BellOff className="w-4 h-4 text-gray-400" />
                }
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {alertEnabled ? 'Email alerts enabled' : 'Email alerts off'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {alertEnabled
                      ? 'You\'ll be emailed when new matches are posted'
                      : 'Turn on to receive daily email alerts'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAlertEnabled((a) => !a)}
                disabled={loading || success}
                className={`relative inline-flex w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  ${alertEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                aria-checked={alertEnabled}
                role="switch"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${alertEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Error */}
            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {success ? '✓ Saved!' : loading ? 'Saving…' : 'Save Search'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
