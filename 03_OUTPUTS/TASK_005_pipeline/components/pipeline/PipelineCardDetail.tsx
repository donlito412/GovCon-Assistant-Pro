'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  X, ExternalLink, Trash2, Building2, MapPin, Hash,
  Calendar, DollarSign, Clock, StickyNote, Tag,
} from 'lucide-react';
import { StageSelector } from './StageSelector';
import { AddNoteForm } from './AddNoteForm';
import {
  removeFromPipeline,
  formatValueCents,
  daysUntilDeadline,
  STAGE_LABELS,
  type PipelineItem,
  type PipelineStage,
  type PipelineNote,
} from '../../lib/api/pipeline';

// ============================================================
// PIPELINE CARD DETAIL — slide-out panel
// Full opportunity details, stage selector, notes log, add note.
// ============================================================

interface PipelineCardDetailProps {
  item: PipelineItem | null;
  onClose: () => void;
  onRemoved?: (itemId: number) => void;
}

function NoteEntry({ note }: { note: PipelineNote }) {
  const date = new Date(note.created_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
  return (
    <div className="border-l-2 border-blue-200 pl-3 py-1">
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.text}</p>
      <p className="text-xs text-gray-400 mt-1">{date}</p>
    </div>
  );
}

export function PipelineCardDetail({ item, onClose, onRemoved }: PipelineCardDetailProps) {
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [localNotes, setLocalNotes] = useState<PipelineNote[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalNotes(item?.notes_json ?? []);
  }, [item]);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleRemove() {
    if (!item) return;
    if (!confirm('Remove this opportunity from your pipeline?')) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await removeFromPipeline(item.id);
      onRemoved?.(item.id);
      onClose();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Failed to remove');
      setRemoving(false);
    }
  }

  const opp = item?.opportunity;
  const days = daysUntilDeadline(opp?.deadline);

  const deadlineLabel = opp?.deadline
    ? new Date(opp.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const location = [opp?.place_of_performance_city, opp?.place_of_performance_state]
    .filter(Boolean).join(', ');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Pipeline item details"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 bg-gray-50">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
              Pipeline Item
            </p>
            <h2 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
              {opp?.title ?? 'Untitled'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Stage selector */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stage</p>
            {item && (
              <StageSelector
                itemId={item.id}
                currentStage={item.stage as PipelineStage}
                size="md"
              />
            )}
          </section>

          {/* Key metadata */}
          <section className="space-y-2.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</p>

            {opp?.agency_name && (
              <div className="flex items-start gap-2 text-sm">
                <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{opp.agency_name}</span>
              </div>
            )}
            {location && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{location}</span>
              </div>
            )}
            {opp?.solicitation_number && (
              <div className="flex items-start gap-2 text-sm">
                <Hash className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 font-mono text-xs">{opp.solicitation_number}</span>
              </div>
            )}
            {deadlineLabel && (
              <div className="flex items-start gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className={`font-medium ${days !== null && days < 7 ? 'text-red-600' : days !== null && days < 14 ? 'text-yellow-600' : 'text-gray-700'}`}>
                  {deadlineLabel}
                  {days !== null && days >= 0 && (
                    <span className="ml-1 font-normal text-gray-500">({days}d remaining)</span>
                  )}
                  {days !== null && days < 0 && (
                    <span className="ml-1 font-normal text-gray-400">(Overdue)</span>
                  )}
                </span>
              </div>
            )}
            {(opp?.value_max ?? opp?.value_min) != null && (
              <div className="flex items-start gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-green-700 font-semibold">
                  {formatValueCents(opp?.value_max ?? opp?.value_min)}
                </span>
              </div>
            )}
            {opp?.naics_code && (
              <div className="flex items-start gap-2 text-sm">
                <Tag className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600">NAICS {opp.naics_code}</span>
              </div>
            )}
            {item && (
              <div className="flex items-start gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-500">
                  Added {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
          </section>

          {/* Notes */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" />
              Notes ({localNotes.length})
            </p>

            {localNotes.length > 0 ? (
              <div className="space-y-3 mb-4">
                {[...localNotes].reverse().map((note, i) => (
                  <NoteEntry key={i} note={note} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic mb-3">No notes yet. Add your first note below.</p>
            )}

            {item && (
              <AddNoteForm
                itemId={item.id}
                onNoteAdded={(notes) => setLocalNotes(notes)}
              />
            )}
          </section>
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-200 px-5 py-3 bg-gray-50 flex items-center justify-between gap-3">
          <button
            onClick={handleRemove}
            disabled={removing}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {removing ? 'Removing…' : 'Remove from Pipeline'}
          </button>
          {removeError && <p className="text-xs text-red-500">{removeError}</p>}

          <div className="flex items-center gap-2">
            {opp?.id && (
              <Link
                href={`/contracts/${opp.id}`}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded-lg transition"
                onClick={onClose}
              >
                <ExternalLink className="w-4 h-4" />
                Full Detail
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
