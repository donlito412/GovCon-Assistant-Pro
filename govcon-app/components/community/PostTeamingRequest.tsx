'use client';

import React, { useState } from 'react';
import { Loader2, Handshake, Plus, X } from 'lucide-react';
import { createTeamingPost, type TeamingPost } from '@/lib/api/community';

// ============================================================
// POST TEAMING REQUEST FORM
// ============================================================

interface Props {
  opportunityId?: number;
  opportunityTitle?: string;
  onCreated?: (post: TeamingPost) => void;
  onClose?: () => void;
}

const CERT_OPTIONS = ['8(a)', 'HUBZone', 'SDVOSB', 'WOSB', 'EDWOSB', 'MBE/WBE'];

export function PostTeamingRequest({ opportunityId, opportunityTitle = '', onCreated, onClose }: Props) {
  const [title,        setTitle]        = useState(opportunityTitle ? `Looking for partner — ${opportunityTitle}` : '');
  const [description,  setDescription]  = useState('');
  const [valueRange,   setValueRange]   = useState('');
  const [naicsInput,   setNaicsInput]   = useState('');
  const [naicsList,    setNaicsList]    = useState<string[]>([]);
  const [certNeeded,   setCertNeeded]   = useState<string[]>([]);
  const [deadline,     setDeadline]     = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const addNaics = () => {
    const code = naicsInput.trim();
    if (code && !naicsList.includes(code)) setNaicsList((l) => [...l, code]);
    setNaicsInput('');
  };

  const toggleCert = (c: string) => {
    setCertNeeded((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const post = await createTeamingPost({
        linked_opportunity_id: opportunityId,
        title:                 title.trim(),
        description:           description.trim() || undefined,
        contract_value_range:  valueRange || undefined,
        naics_needed:          naicsList,
        certifications_needed: certNeeded,
        response_deadline:     deadline || undefined,
      });
      onCreated?.(post);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
        <Handshake className="w-5 h-5 text-blue-600" />
        <h2 className="text-base font-bold text-gray-900">Post Teaming Request</h2>
        {onClose && (
          <button type="button" onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Post Title *</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
          placeholder='e.g. "Looking for IT sub — CCAC RFP #2026-045"'
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
          placeholder="What capability do you need? What are you offering? What's the opportunity?"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Contract Value Range</label>
          <input type="text" value={valueRange} onChange={(e) => setValueRange(e.target.value)}
            placeholder='e.g. "$100K–$500K"'
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Response Deadline</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">NAICS Codes Needed</label>
        <div className="flex gap-2">
          <input type="text" value={naicsInput} onChange={(e) => setNaicsInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNaics())}
            placeholder="e.g. 541512"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
          <button type="button" onClick={addNaics}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-50">
            <Plus className="w-3.5 h-3.5" />Add
          </button>
        </div>
        {naicsList.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {naicsList.map((n) => (
              <span key={n} className="flex items-center gap-1 text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                {n}
                <button type="button" onClick={() => setNaicsList((l) => l.filter((x) => x !== n))}
                  className="text-gray-400 hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Certifications Needed</label>
        <div className="flex flex-wrap gap-2">
          {CERT_OPTIONS.map((c) => (
            <label key={c} className="flex items-center gap-1.5 text-xs cursor-pointer text-gray-700">
              <input type="checkbox" checked={certNeeded.includes(c)} onChange={() => toggleCert(c)} className="accent-blue-600" />
              {c}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={submitting}
          className="flex items-center gap-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg disabled:opacity-50 transition">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Handshake className="w-4 h-4" />}
          {submitting ? 'Posting…' : 'Post Request'}
        </button>
        {onClose && (
          <button type="button" onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-4 py-2.5 rounded-lg">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
