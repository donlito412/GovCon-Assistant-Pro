'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, ExternalLink, FileSearch, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import {
  LEVEL_LABELS, LEVEL_COLORS, formatDollars,
  type Agency, type AgencyStats, type AgencyLevel,
} from '../../lib/api/agencies';

// ============================================================
// AGENCY HEADER
// Profile banner: name, level, live stats, website link
// ============================================================

interface AgencyHeaderProps {
  agency: Agency;
  stats: AgencyStats;
}

function StatBadge({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 min-w-[120px]">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
        <p className="text-xs text-blue-200">{label}</p>
      </div>
    </div>
  );
}

export function AgencyHeader({ agency, stats }: AgencyHeaderProps) {
  const level = agency.level as AgencyLevel;
  const colors = LEVEL_COLORS[level];

  return (
    <div className="bg-gradient-to-r from-blue-700 to-blue-600 rounded-2xl overflow-hidden shadow-lg">
      <div className="px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-blue-200 text-xs mb-4">
          <Link href="/agencies" className="hover:text-white transition">Agencies</Link>
          <span>/</span>
          <span className="text-white font-medium truncate max-w-xs">{agency.name}</span>
        </div>

        {/* Name + level + website */}
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
              <Building2 className={`w-7 h-7 ${colors.text}`} />
            </div>
            <div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border mb-1.5 ${colors.bg} ${colors.text} ${colors.border}`}>
                {LEVEL_LABELS[level]}
              </span>
              <h1 className="text-2xl font-bold text-white leading-tight">{agency.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {agency.website && (
              <a
                href={agency.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-3 py-2 rounded-lg transition"
              >
                <ExternalLink className="w-4 h-4" />
                Website
              </a>
            )}
            <Link
              href={`/contracts?agency=${encodeURIComponent(agency.name)}`}
              className="flex items-center gap-1.5 bg-white text-blue-700 hover:bg-blue-50 text-sm font-semibold px-3 py-2 rounded-lg transition"
            >
              <FileSearch className="w-4 h-4" />
              View All Contracts
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3">
          <StatBadge
            icon={FileSearch}
            label="Active Opportunities"
            value={String(stats.active_count)}
            color="bg-blue-500/60"
          />
          <StatBadge
            icon={DollarSign}
            label="Active Value"
            value={formatDollars(stats.active_value_cents)}
            color="bg-green-500/60"
          />
          <StatBadge
            icon={TrendingUp}
            label="Avg. Value"
            value={formatDollars(stats.avg_value_cents)}
            color="bg-indigo-500/60"
          />
          <StatBadge
            icon={BarChart3}
            label="Total on Record"
            value={String(stats.total_opportunities)}
            color="bg-purple-500/60"
          />
        </div>
      </div>
    </div>
  );
}
