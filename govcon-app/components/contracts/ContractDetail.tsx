'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2, MapPin, Hash, ExternalLink, PlusCircle,
  Bookmark, ChevronDown, ChevronUp, Calendar, DollarSign,
  FileText, Tag, Clock,
} from 'lucide-react';
import { Badge, sourceBadgeVariant, sourceLabel, contractTypeBadgeVariant, thresholdBadgeVariant, thresholdLabel } from '../ui/Badge';
import { DeadlineChip } from '../ui/DeadlineChip';
import { formatValue, type ContractListItem } from '@/lib/api/contracts';

// ============================================================
// CONTRACT DETAIL
// Full detail view used on /contracts/[id] page.
// All fields, expandable description, CTAs.
// ============================================================

interface ContractDetailProps {
  contract: ContractListItem;
  onAddToPipeline?: (contract: ContractListItem) => void;
}

function MetaRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 w-40 flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="text-sm text-gray-900 font-medium">{value}</div>
    </div>
  );
}

export function ContractDetail({ contract, onAddToPipeline }: ContractDetailProps) {
  const [descExpanded, setDescExpanded] = useState(false);

  const longDescription = (contract.description?.length ?? 0) > 400;
  const descriptionDisplay = longDescription && !descExpanded
    ? contract.description!.slice(0, 400) + '…'
    : contract.description;

  const postedDate = contract.posted_date
    ? new Date(contract.posted_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const deadlineDate = contract.deadline
    ? new Date(contract.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const location = [
    contract.place_of_performance_city,
    contract.place_of_performance_state,
    contract.place_of_performance_zip,
  ].filter(Boolean).join(', ');

  return (
    <article className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
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
        </div>
        <h1 className="text-xl font-bold text-white leading-snug">{contract.title}</h1>
        {contract.agency_name && (
          <p className="mt-1 text-blue-200 text-sm flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            {contract.agency_name}
          </p>
        )}
      </div>

      {/* CTAs */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-3">
        <button
          onClick={() => onAddToPipeline?.(contract)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <PlusCircle className="w-4 h-4" />
          Add to Pipeline
        </button>
        <Link
          href={`/contracts?q=${encodeURIComponent(contract.agency_name ?? '')}`}
          className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Bookmark className="w-4 h-4" />
          Save Search
        </Link>
        {contract.url && (
          <a
            href={contract.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition ml-auto"
          >
            <ExternalLink className="w-4 h-4" />
            View Original
          </a>
        )}
      </div>

      {/* Main content */}
      <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: metadata */}
        <div className="lg:col-span-1 space-y-0">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Details</h2>

          {contract.solicitation_number && (
            <MetaRow icon={FileText} label="Solicitation #" value={contract.solicitation_number} />
          )}
          {deadlineDate && (
            <MetaRow
              icon={Clock}
              label="Response Due"
              value={
                <div className="flex flex-col gap-1">
                  <DeadlineChip deadline={contract.deadline} />
                  <span className="text-xs text-gray-500">{deadlineDate}</span>
                </div>
              }
            />
          )}
          {postedDate && (
            <MetaRow icon={Calendar} label="Posted" value={postedDate} />
          )}
          {(contract.value_max != null || contract.value_min != null) && (
            <MetaRow
              icon={DollarSign}
              label="Est. Value"
              value={
                <span className="text-green-700 font-bold">
                  {formatValue(contract.value_max ?? contract.value_min)}
                </span>
              }
            />
          )}
          {contract.naics_code && (
            <MetaRow
              icon={Hash}
              label="NAICS"
              value={
                <span>
                  {contract.naics_code}
                  {contract.naics_sector && (
                    <span className="text-gray-500 font-normal"> · {contract.naics_sector}</span>
                  )}
                </span>
              }
            />
          )}
          {location && (
            <MetaRow icon={MapPin} label="Location" value={location} />
          )}
          {contract.set_aside_type && (
            <MetaRow
              icon={Tag}
              label="Set-Aside"
              value={<Badge variant="set_aside">{contract.set_aside_type.replace(/_/g, ' ').toUpperCase()}</Badge>}
            />
          )}

          {/* Canonical sources */}
          {contract.canonical_sources && contract.canonical_sources.length > 1 && (
            <div className="py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500 mb-1.5">Also listed on:</p>
              <div className="flex flex-wrap gap-1">
                {contract.canonical_sources.map((s) => (
                  <Badge key={s} variant={sourceBadgeVariant(s)}>{sourceLabel(s)}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: description */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Description</h2>
          {contract.description ? (
            <div className="text-sm text-gray-700 leading-relaxed">
              <p className="whitespace-pre-wrap">{descriptionDisplay}</p>
              {longDescription && (
                <button
                  onClick={() => setDescExpanded((e) => !e)}
                  className="mt-2 flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium transition"
                >
                  {descExpanded ? (
                    <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                  ) : (
                    <><ChevronDown className="w-3.5 h-3.5" /> Show full description</>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-400 text-center">
              No description available. View the original solicitation for full details.
              {contract.url && (
                <div className="mt-2">
                  <a
                    href={contract.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Open on source site →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <Link href="/contracts" className="text-sm text-gray-500 hover:text-gray-800 transition">
          ← Back to Contracts
        </Link>
        <span className="text-xs text-gray-400">
          Last updated: {new Date(contract.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </article>
  );
}
