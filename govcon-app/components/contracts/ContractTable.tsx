'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, PlusCircle } from 'lucide-react';
import { Badge, sourceBadgeVariant, sourceLabel, contractTypeBadgeVariant, thresholdBadgeVariant, thresholdLabel } from '../ui/Badge';
import { DeadlineChip } from '../ui/DeadlineChip';
import { formatValue, type ContractListItem } from '../../lib/api/contracts';

// ============================================================
// CONTRACT TABLE
// Dense table view — good for scanning many records at once.
// ============================================================

interface ContractTableProps {
  contracts: ContractListItem[];
  onAddToPipeline?: (contract: ContractListItem) => void;
}

export function ContractTable({ contracts, onAddToPipeline }: ContractTableProps) {
  if (contracts.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-[35%]">
              Title / Agency
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Source
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Value
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Deadline
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {contracts.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50 transition group">
              {/* Title + Agency */}
              <td className="px-4 py-3">
                <Link
                  href={`/contracts/${c.id}`}
                  className="font-medium text-gray-900 hover:text-blue-600 transition line-clamp-1 block leading-snug"
                >
                  {c.title}
                </Link>
                {c.agency_name && (
                  <span className="text-xs text-gray-500 block mt-0.5 line-clamp-1">{c.agency_name}</span>
                )}
                {c.solicitation_number && (
                  <span className="text-xs text-gray-400">#{c.solicitation_number}</span>
                )}
              </td>

              {/* Source */}
              <td className="px-4 py-3 whitespace-nowrap">
                <Badge variant={sourceBadgeVariant(c.source)}>
                  {sourceLabel(c.source)}
                </Badge>
              </td>

              {/* Type + Threshold */}
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  {c.contract_type && (
                    <Badge variant={contractTypeBadgeVariant(c.contract_type)}>
                      {c.contract_type}
                    </Badge>
                  )}
                  {c.threshold_category && (
                    <Badge variant={thresholdBadgeVariant(c.threshold_category)}>
                      {thresholdLabel(c.threshold_category)}
                    </Badge>
                  )}
                </div>
              </td>

              {/* Value */}
              <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-700">
                {formatValue(c.value_max ?? c.value_min)}
              </td>

              {/* Deadline */}
              <td className="px-4 py-3 whitespace-nowrap">
                <DeadlineChip deadline={c.deadline} />
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
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
                  <button
                    onClick={() => onAddToPipeline?.(c)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Pipeline
                  </button>
                  <Link
                    href={`/contracts/${c.id}`}
                    className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition"
                  >
                    Details
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
