'use client';

import React, { useState } from 'react';
import {
  Building2, Calendar, DollarSign, Users, FileText,
  Trophy, XCircle, Clock, PenLine,
} from 'lucide-react';
import {
  BID_STATUS_LABELS, BID_STATUS_COLORS, fmtCents,
  type BidRecord,
} from '../../lib/api/bids';
import { BidOutcomeForm } from './BidOutcomeForm';

// ============================================================
// BID DETAIL PANEL — full bid details
// ============================================================

interface Props {
  bid: BidRecord;
  onUpdated?: (bid: BidRecord) => void;
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
        <Icon className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export function BidDetailPanel({ bid, onUpdated }: Props) {
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);
  const statusColor = BID_STATUS_COLORS[bid.status] ?? 'bg-gray-100 text-gray-500';

  const submittedDate = bid.bid_submitted_date
    ? new Date(bid.bid_submitted_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  const awardDate = bid.award_date
    ? new Date(bid.award_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
            {BID_STATUS_LABELS[bid.status]}
          </span>
          {bid.status === 'pending' && (
            <button
              onClick={() => setShowOutcomeForm((s) => !s)}
              className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition"
            >
              <PenLine className="w-3.5 h-3.5" />Record Outcome
            </button>
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900 leading-snug mb-2">{bid.contract_title}</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Building2 className="w-4 h-4 text-gray-400" />
          {bid.agency}
        </div>
        {bid.solicitation_number && (
          <div className="text-xs text-gray-400 mt-1">Solicitation: {bid.solicitation_number}</div>
        )}

        {showOutcomeForm && (
          <div className="mt-5 border-t border-gray-100 pt-5">
            <BidOutcomeForm
              bid={bid}
              onUpdated={(updated) => { onUpdated?.(updated); setShowOutcomeForm(false); }}
              onClose={() => setShowOutcomeForm(false)}
            />
          </div>
        )}
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Calendar className="w-4 h-4 text-gray-400" /><span className="text-xs text-gray-500">Submitted</span></div>
          <p className="text-sm font-bold text-gray-900">{submittedDate}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-gray-400" /><span className="text-xs text-gray-500">Bid Amount</span></div>
          <p className="text-sm font-bold text-gray-900">{fmtCents(bid.bid_amount)}</p>
        </div>
        {bid.status === 'won' && (
          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><Trophy className="w-4 h-4 text-green-500" /><span className="text-xs text-green-600">Award Amount</span></div>
            <p className="text-sm font-bold text-green-700">{fmtCents(bid.award_amount)}</p>
          </div>
        )}
        {bid.status === 'lost' && bid.if_lost_winner_name && (
          <div className="bg-red-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1"><XCircle className="w-4 h-4 text-red-400" /><span className="text-xs text-red-500">Winner</span></div>
            <p className="text-sm font-bold text-red-700">{bid.if_lost_winner_name}</p>
            {bid.if_lost_winner_amount && (
              <p className="text-xs text-red-500">{fmtCents(bid.if_lost_winner_amount)}</p>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <Section title="Timeline" icon={Clock}>
        <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-px before:bg-gray-200">
          {bid.source && (
            <div className="relative">
              <span className="absolute -left-3.5 top-0.5 w-2.5 h-2.5 rounded-full bg-gray-300 border-2 border-white" />
              <p className="text-xs text-gray-500">Opportunity sourced from <strong>{bid.source}</strong></p>
            </div>
          )}
          {bid.bid_submitted_date && (
            <div className="relative">
              <span className="absolute -left-3.5 top-0.5 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-white" />
              <p className="text-xs text-gray-700 font-semibold">Bid submitted — {submittedDate}</p>
              {bid.bid_amount && <p className="text-xs text-gray-500">{fmtCents(bid.bid_amount)}</p>}
            </div>
          )}
          {awardDate && (
            <div className="relative">
              <span className={`absolute -left-3.5 top-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${bid.status === 'won' ? 'bg-green-500' : 'bg-red-400'}`} />
              <p className={`text-xs font-semibold ${bid.status === 'won' ? 'text-green-700' : 'text-red-600'}`}>
                {bid.status === 'won' ? '🏆 Award announced' : '❌ Award announced — not selected'} — {awardDate}
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* Team */}
      {bid.team_composition?.length > 0 && (
        <Section title={`Team (${bid.team_composition.length} members)`} icon={Users}>
          <div className="space-y-2">
            {bid.team_composition.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold text-gray-900">{m.company_name}</span>
                  {m.certifications?.map((c) => (
                    <span key={c} className="ml-1.5 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">{c}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <span className="text-xs capitalize">{m.role === 'joint_venture' ? 'JV' : m.role}</span>
                  <span className="text-xs font-semibold">{m.percentage_of_work}%</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Documents */}
      {bid.documents_submitted?.length > 0 && (
        <Section title="Documents Submitted" icon={FileText}>
          <ul className="space-y-1">
            {bid.documents_submitted.map((d, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-gray-400" />{d.name}
                <span className="text-xs text-gray-400">({d.type})</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Narrative */}
      {bid.bid_narrative && (
        <Section title="Bid Strategy Notes" icon={PenLine}>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{bid.bid_narrative}</p>
        </Section>
      )}

      {/* Lessons learned */}
      {bid.if_lost_reason && (
        <Section title="Lessons Learned" icon={PenLine}>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{bid.if_lost_reason}</p>
        </Section>
      )}
    </div>
  );
}
