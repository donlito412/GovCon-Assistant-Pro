'use client';

import React, { useState } from 'react';
import { Trophy, XCircle, Loader2 } from 'lucide-react';
import { updateBid, type BidRecord, type BidStatus } from '../../lib/api/bids';

// ============================================================
// BID OUTCOME FORM — record win/loss/withdrawal
// ============================================================

interface Props {
  bid: BidRecord;
  onUpdated?: (bid: BidRecord) => void;
  onClose?: () => void;
}

export function BidOutcomeForm({ bid, onUpdated, onClose }: Props) {
  const [outcome,       setOutcome]       = useState<BidStatus>(bid.status === 'pending' ? 'won' : bid.status);
  const [awardDate,     setAwardDate]     = useState(bid.award_date ?? new Date().toISOString().slice(0, 10));
  const [awardAmt,      setAwardAmt]      = useState(bid.award_amount ? String(bid.award_amount / 100) : '');
  const [winnerName,    setWinnerName]    = useState(bid.if_lost_winner_name ?? '');
  const [winnerAmt,     setWinnerAmt]     = useState(bid.if_lost_winner_amount ? String(bid.if_lost_winner_amount / 100) : '');
  const [reason,        setReason]        = useState(bid.if_lost_reason ?? '');
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const parseCents = (val: string) => val ? Math.round(parseFloat(val.replace(/,/g, '')) * 100) : null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const patch: Partial<BidRecord> = { status: outcome, award_date: awardDate || null };
      if (outcome === 'won') {
        patch.award_amount = parseCents(awardAmt) ?? undefined;
      } else if (outcome === 'lost') {
        patch.if_lost_winner_name   = winnerName || null;
        patch.if_lost_winner_amount = parseCents(winnerAmt) ?? undefined;
        patch.if_lost_reason        = reason || null;
      }
      const updated = await updateBid(bid.id, patch);
      onUpdated?.(updated);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
        {outcome === 'won'
          ? <Trophy className="w-5 h-5 text-green-500" />
          : <XCircle className="w-5 h-5 text-red-400" />}
        Record Bid Outcome
      </h2>

      {/* Outcome selector */}
      <div className="flex gap-2 flex-wrap">
        {(['won','lost','withdrawn','cancelled','no_award'] as BidStatus[]).map((s) => (
          <button key={s} type="button" onClick={() => setOutcome(s)}
            className={`text-sm px-3 py-1.5 rounded-lg font-semibold border transition ${
              outcome === s
                ? s === 'won' ? 'bg-green-600 text-white border-green-600'
                  : s === 'lost' ? 'bg-red-600 text-white border-red-600'
                  : 'bg-gray-700 text-white border-gray-700'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}>
            {s === 'no_award' ? 'No Award' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Won fields */}
      {outcome === 'won' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Award Date</label>
            <input type="date" value={awardDate} onChange={(e) => setAwardDate(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Award Amount ($)</label>
            <input type="text" placeholder="e.g. 125,000" value={awardAmt} onChange={(e) => setAwardAmt(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
          </div>
        </div>
      )}

      {/* Lost fields */}
      {outcome === 'lost' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Award Date</label>
              <input type="date" value={awardDate} onChange={(e) => setAwardDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Winner Company</label>
              <input type="text" placeholder="Who won?" value={winnerName} onChange={(e) => setWinnerName(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Winner Amount ($ if disclosed)</label>
            <input type="text" placeholder="e.g. 118,000" value={winnerAmt} onChange={(e) => setWinnerAmt(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Lessons Learned / Debriefing Notes</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
              placeholder="Why we lost, what we could improve, debriefing feedback…"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-y focus:outline-none" />
          </div>
        </div>
      )}

      {/* Withdrawn / No Award: notes only */}
      {(outcome === 'withdrawn' || outcome === 'cancelled' || outcome === 'no_award') && (
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            placeholder="Reason for withdrawal, cancellation details, etc."
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-y focus:outline-none" />
        </div>
      )}

      {error && <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg disabled:opacity-50 transition">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save Outcome'}
        </button>
        {onClose && (
          <button onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-4 py-2.5 rounded-lg">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
