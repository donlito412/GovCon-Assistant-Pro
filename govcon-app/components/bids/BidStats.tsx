'use client';

import React from 'react';
import { Trophy, TrendingUp, Clock, DollarSign, Target } from 'lucide-react';
import { fmtCents, type BidStats as BidStatsType } from '@/lib/api/bids';

// ============================================================
// BID STATS PANEL
// Only shows win rate when >= 3 resolved bids (per spec).
// ============================================================

interface Props {
  stats: BidStatsType;
}

function StatTile({ label, value, icon: Icon, color = 'text-gray-900' }: {
  label: string; value: string; icon: React.ElementType; color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export function BidStats({ stats }: Props) {
  const resolved = stats.wins + stats.losses;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatTile
        label="Total Bids"
        value={String(stats.total_bids)}
        icon={Target}
      />
      <StatTile
        label="Win Rate"
        value={resolved >= 3 ? `${stats.win_rate}%` : '—'}
        icon={Trophy}
        color={resolved >= 3 ? (stats.win_rate >= 50 ? 'text-green-600' : 'text-amber-600') : 'text-gray-400'}
      />
      <StatTile
        label="Total Won"
        value={fmtCents(stats.total_won_cents)}
        icon={DollarSign}
        color="text-green-600"
      />
      <StatTile
        label="Pending Value"
        value={fmtCents(stats.total_pending_cents)}
        icon={Clock}
        color="text-amber-600"
      />
      <StatTile
        label="Avg Bid"
        value={fmtCents(stats.avg_bid_cents)}
        icon={TrendingUp}
      />
    </div>
  );
}
