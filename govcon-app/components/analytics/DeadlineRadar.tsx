'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Clock, AlertTriangle, DollarSign } from 'lucide-react';
import { fmt, type DeadlineBuckets, type DeadlineItem } from '@/lib/api/analytics';

// ============================================================
// DEADLINE RADAR — Timeline of upcoming deadlines (next 90 days)
// Shows bucket summary + expandable item list per bucket.
// ============================================================

const BUCKETS = [
  { key: 'week',   label: 'This Week',   days: '0–7 days',  color: 'border-red-300 bg-red-50',    text: 'text-red-700',   badge: 'bg-red-100 text-red-700' },
  { key: 'month',  label: 'This Month',  days: '8–30 days', color: 'border-amber-200 bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  { key: 'sixty',  label: '60 Days',     days: '31–60 days',color: 'border-blue-200 bg-blue-50',   text: 'text-blue-700',  badge: 'bg-blue-100 text-blue-700' },
  { key: 'ninety', label: '90 Days',     days: '61–90 days',color: 'border-gray-200 bg-gray-50',   text: 'text-gray-600',  badge: 'bg-gray-100 text-gray-600' },
] as const;

function DeadlineRow({ item }: { item: DeadlineItem }) {
  const days = Math.ceil((new Date(item.deadline).getTime() - Date.now()) / 86400000);
  const dateStr = new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <Link href={`/contracts/${item.id}`} className="text-xs font-medium text-gray-800 hover:text-blue-600 line-clamp-1 transition">
          {item.title}
        </Link>
        {item.agency_name && (
          <p className="text-xs text-gray-400 line-clamp-1">{item.agency_name}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {(item.value_max ?? item.value_min) != null && (
          <span className="text-xs text-green-700 font-medium">{fmt(item.value_max ?? item.value_min)}</span>
        )}
        <span className={`text-xs font-semibold whitespace-nowrap ${days <= 7 ? 'text-red-600' : days <= 14 ? 'text-amber-600' : 'text-gray-500'}`}>
          {dateStr}
        </span>
      </div>
    </div>
  );
}

interface Props {
  buckets: DeadlineBuckets;
}

export function DeadlineRadar({ buckets }: Props) {
  const [expanded, setExpanded] = useState<string | null>('week');

  // Group items by bucket
  const now = Date.now();
  const in7  = now + 7  * 86400000;
  const in30 = now + 30 * 86400000;
  const in60 = now + 60 * 86400000;
  const itemsByBucket: Record<string, DeadlineItem[]> = {
    week:   buckets.items.filter((i) => new Date(i.deadline).getTime() <= in7),
    month:  buckets.items.filter((i) => { const t = new Date(i.deadline).getTime(); return t > in7 && t <= in30; }),
    sixty:  buckets.items.filter((i) => { const t = new Date(i.deadline).getTime(); return t > in30 && t <= in60; }),
    ninety: buckets.items.filter((i) => new Date(i.deadline).getTime() > in60),
  };

  const counts: Record<string, number> = {
    week: buckets.week, month: buckets.month, sixty: buckets.sixty, ninety: buckets.ninety,
  };

  return (
    <div className="space-y-2">
      {BUCKETS.map((bucket) => {
        const count = counts[bucket.key];
        const items = itemsByBucket[bucket.key];
        const isExpanded = expanded === bucket.key;

        return (
          <div key={bucket.key} className={`rounded-lg border ${bucket.color} overflow-hidden`}>
            <button
              onClick={() => setExpanded(isExpanded ? null : bucket.key)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left"
            >
              <div className="flex items-center gap-2">
                {bucket.key === 'week'
                  ? <AlertTriangle className={`w-4 h-4 ${bucket.text}`} />
                  : <Clock className={`w-4 h-4 ${bucket.text}`} />
                }
                <span className={`text-sm font-semibold ${bucket.text}`}>{bucket.label}</span>
                <span className="text-xs text-gray-400">({bucket.days})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bucket.badge}`}>
                  {count}
                </span>
                <span className={`text-xs ${bucket.text}`}>{isExpanded ? '▲' : '▼'}</span>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-3">
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No contracts in this window.</p>
                ) : (
                  <div>
                    {items.slice(0, 10).map((item) => (
                      <DeadlineRow key={item.id} item={item} />
                    ))}
                    {count > 10 && (
                      <p className="text-xs text-gray-400 pt-2">
                        + {count - 10} more. <Link href="/contracts?sort=deadline:asc" className="text-blue-500 hover:underline">View all →</Link>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
