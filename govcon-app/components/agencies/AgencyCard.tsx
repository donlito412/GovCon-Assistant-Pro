'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, ExternalLink, FileSearch, DollarSign } from 'lucide-react';
import {
  LEVEL_LABELS, LEVEL_COLORS, formatDollars,
  type Agency, type AgencyLevel,
} from '@/lib/api/agencies';

// ============================================================
// AGENCY CARD — used in the agency directory grid
// ============================================================

interface AgencyCardProps {
  agency: Agency;
}

export function AgencyCard({ agency }: AgencyCardProps) {
  const level = agency.level as AgencyLevel;
  const colors = LEVEL_COLORS[level] ?? LEVEL_COLORS.federal;

  return (
    <Link
      href={`/agencies/${agency.id}`}
      className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all p-4 group"
    >
      {/* Level badge + name */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
          <Building2 className={`w-5 h-5 ${colors.text}`} />
        </div>
        <div className="min-w-0">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold border mb-1 ${colors.bg} ${colors.text} ${colors.border}`}>
            {LEVEL_LABELS[level]}
          </span>
          <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition leading-snug line-clamp-2">
            {agency.name}
          </h3>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <FileSearch className="w-3.5 h-3.5 text-blue-500" />
          <strong className="text-gray-800">{agency.active_count ?? 0}</strong> active
        </span>
        {(agency.active_value_cents ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-green-500" />
            <strong className="text-gray-800">{formatDollars(agency.active_value_cents)}</strong>
          </span>
        )}
        {agency.total_spend && (
          <span className="text-gray-400">
            {formatDollars(agency.total_spend)} historical
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-blue-600 font-medium group-hover:underline">
          View Profile →
        </span>
        {agency.website && (
          <a
            href={agency.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-gray-400 hover:text-blue-600 transition"
            title="Agency website"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </Link>
  );
}
