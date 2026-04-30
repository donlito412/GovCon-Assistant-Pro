'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Building2, Hash, ExternalLink, PlusCircle } from 'lucide-react';
import { Badge, sourceBadgeVariant, sourceLabel, contractTypeBadgeVariant, thresholdBadgeVariant, thresholdLabel } from '../ui/Badge';
import { DeadlineChip } from '../ui/DeadlineChip';
import { formatValue, type ContractListItem } from '@/lib/api/contracts';

// ============================================================
// CONTRACT CARD
// Used in grid/list view on the contracts page.
// ============================================================

interface ContractCardProps {
  contract: ContractListItem;
  onAddToPipeline?: (contract: ContractListItem) => void;
}

export function ContractCard({ contract, onAddToPipeline }: ContractCardProps) {
  const descriptionExcerpt = contract.description
    ? contract.description.replace(/\s+/g, ' ').trim().slice(0, 180) +
      (contract.description.length > 180 ? '…' : '')
    : null;

  const location = [contract.place_of_performance_city, contract.place_of_performance_state]
    .filter(Boolean)
    .join(', ');

  return (
    <article className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all p-4 flex flex-col gap-3">
      {/* Top row: badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={sourceBadgeVariant(contract.source)}>
          {sourceLabel(contract.source)}
        </Badge>
        {contract.contract_type && (
          <Badge variant={contractTypeBadgeVariant(contract.contract_type)}>
            {contract.contract_type}
          </Badge>
        )}
        {contract.threshold_category && (
          <Badge variant={thresholdBadgeVariant(contract.threshold_category)}>
            {thresholdLabel(contract.threshold_category)}
          </Badge>
        )}
        {contract.set_aside_type && contract.set_aside_type !== 'unrestricted' && (
          <Badge variant="set_aside">{contract.set_aside_type.toUpperCase()}</Badge>
        )}
        {contract.status !== 'active' && (
          <Badge variant={contract.status as 'closed' | 'awarded' | 'cancelled'}>
            {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
          </Badge>
        )}
      </div>

      {/* Title */}
      <Link
        href={`/contracts/${contract.id}`}
        className="text-gray-900 font-semibold text-sm leading-snug hover:text-blue-600 transition line-clamp-2"
      >
        {contract.title}
      </Link>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        {contract.agency_name && (
          <span className="flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate max-w-[200px]">{contract.agency_name}</span>
          </span>
        )}
        {location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            {location}
          </span>
        )}
        {contract.naics_code && (
          <span className="flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 flex-shrink-0" />
            NAICS {contract.naics_code}
            {contract.naics_sector && ` · ${contract.naics_sector}`}
          </span>
        )}
      </div>

      {/* Description excerpt */}
      {descriptionExcerpt && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{descriptionExcerpt}</p>
      )}

      {/* Bottom row: deadline + value + actions */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-3">
          <DeadlineChip deadline={contract.deadline} />
          {(contract.value_max != null || contract.value_min != null) && (
            <span className="text-sm font-semibold text-gray-700">
              {formatValue(contract.value_max ?? contract.value_min)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {contract.url && (
            <a
              href={contract.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-600 transition"
              title="View on source site"
              aria-label="View original"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={() => onAddToPipeline?.(contract)}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition"
            title="Add to Pipeline"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Pipeline
          </button>
          <Link
            href={`/contracts/${contract.id}`}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-2 py-1 rounded-lg transition"
          >
            Details →
          </Link>
        </div>
      </div>
    </article>
  );
}
