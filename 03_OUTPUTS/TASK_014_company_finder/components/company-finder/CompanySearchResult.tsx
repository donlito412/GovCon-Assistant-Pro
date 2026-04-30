'use client';

import React, { useState } from 'react';
import {
  Building2, MapPin, Phone, Globe, CheckCircle2, AlertTriangle,
  Star, UserPlus, Bookmark, ChevronDown, ChevronUp, X, Check,
} from 'lucide-react';
import { activeCerts, CERT_LABELS, SOURCE_LABELS, saveContact, type CompanyResult } from '../../lib/api/company-search';

// ============================================================
// COMPANY SEARCH RESULT CARD
// Every action requires Jon's explicit approval before executing.
// ============================================================

interface Props {
  result: CompanyResult;
  bidId?: number;       // if invoked from a pipeline card
  onSaved?: (result: CompanyResult) => void;
}

type PendingAction = 'save' | 'add_to_bid' | null;

export function CompanySearchResult({ result, bidId, onSaved }: Props) {
  const [expanded,       setExpanded]       = useState(false);
  const [pendingAction,  setPendingAction]  = useState<PendingAction>(null);
  const [notes,          setNotes]          = useState('');
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  const certs = activeCerts(result.certifications);
  const hasCerts = certs.length > 0;

  const confirmSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveContact(result, {
        notes:          notes || undefined,
        linked_bid_ids: bidId ? [bidId] : [],
      });
      setSaved(true);
      setPendingAction(null);
      onSaved?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition overflow-hidden ${
      saved ? 'border-green-300' : 'border-gray-200 hover:shadow-md'
    }`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {result.sam_registered ? (
                <span className="flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />SAM Registered
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />Not SAM Registered
                </span>
              )}
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {SOURCE_LABELS[result.source] ?? result.source}
              </span>
              {result.rating && (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {result.rating.toFixed(1)}
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-gray-900 leading-tight">{result.company_name}</h3>

            {result.contact_name && (
              <p className="text-xs text-gray-500 mt-0.5">Contact: {result.contact_name}</p>
            )}
          </div>

          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-semibold flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />Saved
            </span>
          )}
        </div>
      </div>

      {/* Details row */}
      <div className="px-4 pb-2 flex flex-wrap gap-x-4 gap-y-1">
        {(result.city || result.address) && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3 text-gray-400" />
            {[result.address, result.city, result.state].filter(Boolean).join(', ')}
          </div>
        )}
        {result.phone && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Phone className="w-3 h-3 text-gray-400" />
            <a href={`tel:${result.phone}`} className="hover:text-blue-600">{result.phone}</a>
          </div>
        )}
        {result.website && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Globe className="w-3 h-3 text-gray-400" />
            <a href={result.website} target="_blank" rel="noopener noreferrer"
               className="hover:text-blue-600 truncate max-w-[180px]">
              {result.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>

      {/* Certifications */}
      {hasCerts && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {certs.map((c) => (
            <span key={c} className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">{c}</span>
          ))}
        </div>
      )}

      {/* NAICS codes (expandable) */}
      {result.naics_codes && result.naics_codes.length > 0 && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {result.naics_codes.length} NAICS code{result.naics_codes.length !== 1 ? 's' : ''}
          </button>
          {expanded && (
            <div className="mt-1 flex flex-wrap gap-1">
              {result.naics_codes.map((n) => (
                <span key={n} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{n}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
      )}

      {/* Approval confirmation panel */}
      {pendingAction === 'save' && !saved && (
        <div className="mx-4 mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-900">
            Save <strong>{result.company_name}</strong> to your contacts?
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes (optional)…"
            rows={2}
            className="w-full text-xs border border-blue-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={confirmSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-60 transition"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Confirm Save'}
            </button>
            <button
              onClick={() => setPendingAction(null)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded-lg border border-gray-300 transition"
            >
              <X className="w-3.5 h-3.5" />Cancel
            </button>
          </div>
        </div>
      )}

      {/* Footer actions */}
      {!saved && pendingAction === null && (
        <div className="border-t border-gray-100 px-4 py-2.5 flex gap-2">
          <button
            onClick={() => setPendingAction('save')}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-700 border border-gray-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition"
          >
            <Bookmark className="w-3.5 h-3.5" />Save Contact
          </button>
          {bidId && (
            <button
              onClick={() => setPendingAction('add_to_bid')}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-green-700 border border-gray-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition"
            >
              <UserPlus className="w-3.5 h-3.5" />Add to Bid Team
            </button>
          )}
        </div>
      )}
    </div>
  );
}
