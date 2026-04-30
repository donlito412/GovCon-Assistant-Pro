'use client';

import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { addNote, type PipelineNote } from '@/lib/api/pipeline';

// ============================================================
// ADD NOTE FORM
// Appends a timestamped note to a pipeline item.
// ============================================================

interface AddNoteFormProps {
  itemId: number;
  onNoteAdded?: (notes: PipelineNote[]) => void;
}

export function AddNoteForm({ itemId, onNoteAdded }: AddNoteFormProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const notes = await addNote(itemId, text.trim());
      setText('');
      onNoteAdded?.(notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a note… (strategy, contacts, questions, next steps)"
        rows={3}
        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
        disabled={loading}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? 'Saving…' : 'Add Note'}
        </button>
      </div>
    </form>
  );
}
