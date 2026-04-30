'use client';

import React from 'react';
import { Loader2, AlertCircle, Trophy } from 'lucide-react';
import { useAgencyAwards, formatAwardDollars, type Award } from '@/lib/api/agencies';

// ============================================================
// AWARD HISTORY
// Past contract awards from USASpending.gov.
// Shows: vendor, amount, dates, description.
// This is competitive intelligence — who won before.
// ============================================================

interface AwardHistoryProps {
  agencyId: number;
}

function AwardRow({ award }: { award: Award }) {
  const startDate = award.start_date
    ? new Date(award.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">{award.recipient_name ?? 'Unknown Vendor'}</p>
        {award.award_id && (
          <p className="text-xs text-gray-400 font-mono mt-0.5">{award.award_id}</p>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-sm font-bold text-green-700">
          {formatAwardDollars(award.amount_dollars)}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
        {startDate}
      </td>
      <td className="px-4 py-3">
        {award.description ? (
          <p className="text-xs text-gray-600 line-clamp-2">{award.description}</p>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {award.award_type && (
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
            {award.award_type}
          </span>
        )}
      </td>
    </tr>
  );
}

export function AwardHistory({ agencyId }: AwardHistoryProps) {
  const { awardsData, isLoading, error } = useAgencyAwards(agencyId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading award history from USASpending.gov…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm py-4">
        <AlertCircle className="w-4 h-4" />
        Failed to load award history: {error.message}
      </div>
    );
  }

  const awards = awardsData?.awards ?? [];

  if (awards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Trophy className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">
          No Pittsburgh-area awards found in USASpending.gov for this agency.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          This is common for state and local agencies not in the federal awards database.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Source: <a href="https://usaspending.gov" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">USASpending.gov</a>
        {' '}· Pittsburgh-area · Last 5 years · {awards.length} most recent awards shown
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs text-left border-b border-gray-200">
              <th className="px-4 py-2.5 font-semibold">Vendor / Recipient</th>
              <th className="px-4 py-2.5 font-semibold">Amount</th>
              <th className="px-4 py-2.5 font-semibold">Award Date</th>
              <th className="px-4 py-2.5 font-semibold">Description</th>
              <th className="px-4 py-2.5 font-semibold">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {awards.map((award, i) => (
              <AwardRow key={award.award_id ?? i} award={award} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
