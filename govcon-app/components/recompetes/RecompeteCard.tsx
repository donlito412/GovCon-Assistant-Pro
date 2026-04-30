'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar, Tag, ChevronDown, ChevronUp, Eye, PlusCircle, ExternalLink, Clock,
} from 'lucide-react';
import { IncumbentBadge } from './IncumbentBadge';
import { RecompeteTimeline } from './RecompeteTimeline';
import {
  daysUntilExpiry, formatValue, recompeteLikelyLabel, urgencyLevel,
  type IncumbentContract,
} from '../../lib/api/recompetes';

// ============================================================
// RECOMPETE CARD — expiring contract with intelligence panel
// ============================================================

interface Props {
  contract: IncumbentContract;
  onAddToPipeline?: (contract: IncumbentContract) => void;
  onWatch?: (contract: IncumbentContract) => void;
}

const URGENCY_STYLES = {
  critical: 'border-l-4 border-l-red-500',
  warning:  'border-l-4 border-l-amber-400',
  moderate: 'border-l-4 border-l-yellow-300',
  low:      'border-gray-200',
};

const URGENCY_BADGE = {
  critical: 'bg-red-100 text-red-700',
  warning:  'bg-amber-100 text-amber-700',
  moderate: 'bg-yellow-50 text-yellow-700',
  low:      'bg-gray-100 text-gray-500',
};

export function RecompeteCard({ contract, onAddToPipeline, onWatch }: Props) {
  const [expanded, setExpanded] = useState(false);

  const days    = daysUntilExpiry(contract.period_of_performance_end_date);
  const urgency = urgencyLevel(days);
  const value   = formatValue(contract.award_amount);
  const likely  = recompeteLikelyLabel(contract.recompete_likely_date);

  const endDateStr = contract.period_of_performance_end_date
    ? new Date(contract.period_of_performance_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';

  const title = contract.opportunities?.title ?? `${contract.agency_name ?? 'Contract'} — ${contract.naics_code ?? 'Unknown NAICS'}`;

  const daysLabel = days === null ? 'Unknown'
    : days < 0  ? `Expired ${Math.abs(days)}d ago`
    : days === 0 ? 'Expires today'
    : `Expires in ${days} days`;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition hover:shadow-md ${URGENCY_STYLES[urgency]}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${URGENCY_BADGE[urgency]}`}>
            <Clock className="w-2.5 h-2.5 inline mr-0.5" />{daysLabel}
          </span>
          {contract.naics_code && (
            <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              NAICS {contract.naics_code}
            </span>
          )}
        </div>
        <h3 className="text-sm font-bold text-gray-900 leading-snug">{title}</h3>
        {contract.agency_name && (
          <p className="text-xs text-gray-500 mt-0.5">{contract.agency_name}</p>
        )}
      </div>

      {/* Incumbent badge */}
      <div className="px-4 pb-2">
        <IncumbentBadge name={contract.current_awardee_name} uei={contract.current_awardee_uei} />
      </div>

      {/* Key facts */}
      <div className="px-4 pb-2 flex flex-wrap gap-x-4 gap-y-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{value}</span>
          <span>contract value</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="w-3 h-3 text-gray-400" />
          <span>Expires {endDateStr}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
          <Tag className="w-3 h-3" />
          Expect RFP ~{likely}
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 pb-3">
        <RecompeteTimeline
          awardDate={contract.award_date}
          endDate={contract.period_of_performance_end_date}
          recompeteDate={contract.recompete_likely_date}
        />
      </div>

      {/* Intelligence panel (expanded) */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
          {contract.option_periods?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Option Periods</p>
              <div className="flex flex-wrap gap-1.5">
                {contract.option_periods.map((op, i) => (
                  <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    op.exercised ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {op.label} ({op.months}mo){op.exercised ? ' ✓' : ' —'}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <p className="font-bold text-gray-700 mb-1">Positioning Intelligence</p>
            {urgency === 'critical' || urgency === 'warning' ? (
              <p>Recompete window is open now. If the incumbent has held this contract for multiple terms, expect an entrenched bid — differentiate on price, local presence, and recent past performance.</p>
            ) : (
              <p>Recompete is approaching. Build a relationship with the agency POC and request a capability briefing before the RFP drops. Review the incumbent's SAM profile for weaknesses.</p>
            )}
          </div>

          {contract.opportunities?.title && (
            <Link href={`/contracts/${contract.opportunity_id}`}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800">
              <ExternalLink className="w-3 h-3" />View live solicitation
            </Link>
          )}

          {contract.usaspending_award_id && (
            <a
              href={`https://www.usaspending.gov/award/${contract.usaspending_award_id}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600">
              <ExternalLink className="w-3 h-3" />View on USASpending.gov
            </a>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <button onClick={() => onWatch?.(contract)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-700 border border-gray-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition">
          <Eye className="w-3.5 h-3.5" />Watch
        </button>
        <button onClick={() => onAddToPipeline?.(contract)}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg transition">
          <PlusCircle className="w-3.5 h-3.5" />Add to Pipeline
        </button>
        <button
          onClick={() => setExpanded((s) => !s)}
          className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Less' : 'Intelligence'}
        </button>
      </div>
    </div>
  );
}
