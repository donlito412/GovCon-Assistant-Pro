'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Calendar, Users, DollarSign, ChevronRight } from 'lucide-react';
import { BID_STATUS_LABELS, BID_STATUS_COLORS, fmtCents, type BidRecord } from '@/lib/api/bids';

// ============================================================
// BID CARD — listing card
// ============================================================

interface Props { bid: BidRecord; }

export function BidCard({ bid }: Props) {
  const statusColor = BID_STATUS_COLORS[bid.status] ?? 'bg-gray-100 text-gray-500';
  const dateStr = bid.bid_submitted_date
    ? new Date(bid.bid_submitted_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date TBD';

  return (
    <Link href={`/bids/${bid.id}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">
        <div className="h-1 w-full" style={{
          background: bid.status === 'won' ? '#16a34a' : bid.status === 'lost' ? '#dc2626' : '#f59e0b'
        }} />

        <div className="px-4 pt-3 pb-2">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
              {BID_STATUS_LABELS[bid.status]}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition flex-shrink-0 mt-0.5" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{bid.contract_title}</h3>
        </div>

        <div className="px-4 pb-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
            {bid.agency}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            {dateStr}
          </div>
          <div className="flex items-center gap-4 mt-1">
            {bid.bid_amount != null && (
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                {fmtCents(bid.bid_amount)}
              </div>
            )}
            {bid.team_composition?.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                {bid.team_composition.length} team member{bid.team_composition.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
