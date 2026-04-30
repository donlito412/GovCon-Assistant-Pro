'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, DollarSign, ExternalLink, Building2, Users } from 'lucide-react';
import {
  fmtAmountRange, CATEGORY_LABELS, CATEGORY_COLORS,
  GRANT_TYPE_LABELS, GRANT_TYPE_COLORS, type Grant,
} from '@/lib/api/grants';

// ============================================================
// GRANT CARD — listing card for grants directory
// ============================================================

function DeadlineChip({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-xs text-gray-400">No deadline</span>;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  const dateStr = new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let color = 'text-gray-500';
  if (days < 0)  color = 'text-gray-400 line-through';
  else if (days <= 7)  color = 'text-red-600 font-semibold';
  else if (days <= 30) color = 'text-amber-600';

  return (
    <span className={`text-xs ${color}`}>
      {days < 0 ? 'Closed' : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `${dateStr} (${days}d)`}
    </span>
  );
}

interface Props {
  grant: Grant;
}

export function GrantCard({ grant }: Props) {
  const catColor  = CATEGORY_COLORS[grant.category]  ?? 'bg-gray-100 text-gray-600';
  const typeColor = GRANT_TYPE_COLORS[grant.grant_type] ?? 'bg-gray-100 text-gray-600';
  const amtRange  = fmtAmountRange(grant.min_amount, grant.max_amount);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-2 flex-wrap mb-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${catColor}`}>
            {CATEGORY_LABELS[grant.category] ?? grant.category}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColor}`}>
            {GRANT_TYPE_LABELS[grant.grant_type] ?? grant.grant_type}
          </span>
        </div>

        <Link href={`/grants/${grant.id}`} className="block hover:text-blue-600 transition">
          <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{grant.title}</h3>
        </Link>

        <div className="flex items-center gap-1.5 mt-1.5">
          <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 line-clamp-1">{grant.agency}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        <div className="flex items-start gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Amount</p>
            <p className="text-xs font-bold text-green-700">{amtRange}</p>
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-gray-400">Deadline</p>
            <DeadlineChip deadline={grant.application_deadline} />
          </div>
        </div>
      </div>

      {/* Eligibility */}
      {grant.eligible_entities?.length > 0 && !grant.eligible_entities.includes('any') && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <div className="flex flex-wrap gap-1">
              {grant.eligible_entities.slice(0, 3).map((e) => (
                <span key={e} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {e.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {grant.description && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-500 line-clamp-2">{grant.description}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <Link href={`/grants/${grant.id}`} className="text-xs text-blue-600 hover:underline font-medium">
          View details →
        </Link>
        {grant.url && (
          <a
            href={grant.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition"
          >
            <ExternalLink className="w-3 h-3" />
            Apply
          </a>
        )}
      </div>
    </div>
  );
}
