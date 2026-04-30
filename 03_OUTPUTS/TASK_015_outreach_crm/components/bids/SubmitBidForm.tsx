'use client';

import React, { useState } from 'react';
import { Loader2, FileCheck } from 'lucide-react';
import { createBid, type BidRecord, type TeamMember } from '../../lib/api/bids';
import { BidTeamBuilder } from './BidTeamBuilder';

// ============================================================
// SUBMIT BID FORM
// Triggered from Pipeline card when moving to "Submitted" stage.
// Can also be used standalone.
// ============================================================

interface Props {
  opportunityId?: number;
  pipelineItemId?: number;
  contractTitle?: string;
  agency?: string;
  solicitationNumber?: string;
  source?: string;
  onCreated?: (bid: BidRecord) => void;
  onClose?: () => void;
}

export function SubmitBidForm({
  opportunityId, pipelineItemId, contractTitle = '', agency = '',
  solicitationNumber = '', source = '', onCreated, onClose,
}: Props) {
  const [title,     setTitle]     = useState(contractTitle);
  const [agencyVal, setAgency]    = useState(agency);
  const [solNum,    setSolNum]    = useState(solicitationNumber);
  const [srcVal,    setSrc]       = useState(source);
  const [bidDate,   setBidDate]   = useState(new Date().toISOString().slice(0, 10));
  const [bidAmt,    setBidAmt]    = useState('');
  const [narrative, setNarrative] = useState('');
  const [team,      setTeam]      = useState<TeamMember[]>([]);
  const [docs,      setDocs]      = useState('');  // comma-separated doc names
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !agencyVal) { setError('Contract title and agency are required'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const amtCents = bidAmt ? Math.round(parseFloat(bidAmt.replace(/,/g, '')) * 100) : null;
      const docList = docs.split(',').map((d) => d.trim()).filter(Boolean).map((name) => ({
        name, type: 'other', submitted_at: new Date().toISOString(),
      }));
      const bid = await createBid({
        opportunity_id:      opportunityId,
        pipeline_item_id:    pipelineItemId,
        contract_title:      title,
        agency:              agencyVal,
        solicitation_number: solNum || undefined,
        source:              srcVal || undefined,
        bid_submitted_date:  bidDate,
        bid_amount:          amtCents ?? undefined,
        bid_narrative:       narrative || undefined,
        team_composition:    team,
        documents_submitted: docList,
        status:              'pending',
      });
      onCreated?.(bid);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <FileCheck className="w-5 h-5 text-blue-600" />
        <h2 className="text-base font-bold text-gray-900">Log Bid Submission</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Contract Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Agency *</label>
          <input type="text" value={agencyVal} onChange={(e) => setAgency(e.target.value)} required
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Solicitation #</label>
          <input type="text" value={solNum} onChange={(e) => setSolNum(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Date Submitted</label>
          <input type="date" value={bidDate} onChange={(e) => setBidDate(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Bid Amount ($)</label>
          <input type="text" placeholder="e.g. 125,000" value={bidAmt} onChange={(e) => setBidAmt(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Bid Narrative / Strategy Notes</label>
        <textarea value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={4}
          placeholder="Key differentiators, pricing strategy, win themes…"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      <BidTeamBuilder value={team} onChange={setTeam} />

      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Documents Submitted (comma-separated names)</label>
        <input type="text" value={docs} onChange={(e) => setDocs(e.target.value)}
          placeholder="Technical Proposal, Price Proposal, Past Performance"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      {error && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

      <div className="flex gap-3">
        <button type="submit" disabled={submitting}
          className="flex items-center gap-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg disabled:opacity-50 transition">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
          {submitting ? 'Saving…' : 'Log Bid'}
        </button>
        {onClose && (
          <button type="button" onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-4 py-2.5 rounded-lg transition">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
