'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, Clock, DollarSign } from 'lucide-react';
import { formatDollars, type ActiveOpportunity } from '../../lib/api/agencies';

// ============================================================
// ACTIVE CONTRACTS LIST
// Shows recent active opportunities from this agency.
// ============================================================

function deadlineLabel(deadline: string | null): { label: string; className: string } {
  if (!deadline) return { label: 'No deadline', className: 'text-gray-400' };
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: 'Closed', className: 'text-gray-400' };
  if (days === 0) return { label: 'Due today', className: 'text-red-600 font-semibold' };
  if (days < 7) return { label: `${days}d left`, className: 'text-red-600 font-semibold' };
  if (days < 14) return { label: `${days}d left`, className: 'text-yellow-600 font-medium' };
  return {
    label: new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    className: 'text-green-700',
  };
}

interface ActiveContractsListProps {
  contracts: ActiveOpportunity[];
  agencyName: string;
  totalActive: number;
}

export function ActiveContractsList({ contracts, agencyName, totalActive }: ActiveContractsListProps) {
  if (contracts.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        No active contracts from this agency right now.
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs text-left border-b border-gray-200">
              <th className="px-4 py-2.5 font-semibold">Title</th>
              <th className="px-4 py-2.5 font-semibold">Type</th>
              <th className="px-4 py-2.5 font-semibold">Value</th>
              <th className="px-4 py-2.5 font-semibold">Deadline</th>
              <th className="px-4 py-2.5 font-semibold text-right">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contracts.map((c) => {
              const dl = deadlineLabel(c.deadline);
              return (
                <tr key={c.id} className="hover:bg-gray-50 transition group">
                  <td className="px-4 py-3">
                    <Link
                      href={`/contracts/${c.id}`}
                      className="font-medium text-gray-900 group-hover:text-blue-600 transition line-clamp-1"
                    >
                      {c.title}
                    </Link>
                    {c.solicitation_number && (
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">#{c.solicitation_number}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {c.contract_type ?? '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-1 text-sm font-medium text-green-700">
                      <DollarSign className="w-3.5 h-3.5" />
                      {formatDollars(c.value_max ?? c.value_min)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`flex items-center gap-1 text-xs ${dl.className}`}>
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      {dl.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-600 transition"
                        title="View original"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalActive > contracts.length && (
        <div className="mt-3 text-center">
          <Link
            href={`/contracts?agency=${encodeURIComponent(agencyName)}`}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            View all {totalActive} active contracts from this agency →
          </Link>
        </div>
      )}
    </div>
  );
}
