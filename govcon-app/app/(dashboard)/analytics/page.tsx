'use client';

import React from 'react';
import {
  BarChart3, TrendingUp, DollarSign, Clock, Target,
  AlertTriangle, Award, RefreshCw, Loader2, AlertCircle,
} from 'lucide-react';
import { StatCard } from '@/components/analytics/StatCard';
import { ContractsBySourceChart } from '@/components/analytics/ContractsBySourceChart';
import { ContractVolumeChart } from '@/components/analytics/ContractVolumeChart';
import { SpendingByNaicsChart } from '@/components/analytics/SpendingByNaicsChart';
import { DeadlineRadar } from '@/components/analytics/DeadlineRadar';
import { PipelineValueChart } from '@/components/analytics/PipelineValueChart';
import { TopAgenciesTable } from '@/components/analytics/TopAgenciesTable';
import { useAnalytics, fmt } from '@/lib/api/analytics';

// ============================================================
// ANALYTICS DASHBOARD PAGE — /analytics
// Auto-refreshes every 5 minutes via SWR.
// ============================================================

function SectionCard({ title, children, className = '' }: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, error, isLoading, mutate } = useAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading analytics…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 max-w-xl">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">{error ? `Failed to load: ${error.message}` : 'No data'}</span>
      </div>
    );
  }

  const { kpis, source_breakdown, weekly_volume, top_naics, deadline_buckets, top_agencies, pipeline_by_stage } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pittsburgh government contracting market intelligence · auto-refreshes every 5 min
          </p>
        </div>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-3 py-2 rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Total Active"
          value={kpis.total_active.toLocaleString()}
          icon={TrendingUp}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
          subtext="All sources"
        />
        <StatCard
          label="New This Week"
          value={kpis.new_this_week.toLocaleString()}
          icon={RefreshCw}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-100"
        />
        <StatCard
          label="Total Active Value"
          value={fmt(kpis.total_value_cents)}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-100"
          subtext="All active opps"
        />
        <StatCard
          label="Soonest Deadline"
          value={kpis.soonest_deadline_days != null ? `${kpis.soonest_deadline_days}d` : '—'}
          subtext={kpis.soonest_deadline_title ?? undefined}
          icon={Clock}
          iconColor={kpis.soonest_deadline_days != null && kpis.soonest_deadline_days <= 7 ? 'text-red-600' : 'text-amber-600'}
          iconBg={kpis.soonest_deadline_days != null && kpis.soonest_deadline_days <= 7 ? 'bg-red-100' : 'bg-amber-100'}
          urgent={kpis.soonest_deadline_days != null && kpis.soonest_deadline_days <= 7}
        />
        <StatCard
          label="Pipeline Value"
          value={fmt(kpis.pipeline_total_cents)}
          icon={Target}
          iconColor="text-violet-600"
          iconBg="bg-violet-100"
          subtext="All stages"
        />
        <StatCard
          label="Win Rate"
          value={kpis.win_rate_pct != null ? `${kpis.win_rate_pct}%` : '—'}
          icon={Award}
          iconColor={
            kpis.win_rate_pct == null ? 'text-gray-400' :
            kpis.win_rate_pct >= 50 ? 'text-green-600' : 'text-amber-600'
          }
          iconBg={
            kpis.win_rate_pct == null ? 'bg-gray-100' :
            kpis.win_rate_pct >= 50 ? 'bg-green-100' : 'bg-amber-100'
          }
          subtext={kpis.win_rate_pct == null ? 'Need ≥3 outcomes' : 'Won / (Won+Lost)'}
        />
      </div>

      {/* Row 2: Source donut + Volume line */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard title="Contracts by Source">
          <ContractsBySourceChart data={source_breakdown} />
        </SectionCard>
        <SectionCard title="Contract Volume — Last 12 Weeks">
          <ContractVolumeChart data={weekly_volume} />
        </SectionCard>
      </div>

      {/* Row 3: NAICS bar + Deadline radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Top NAICS Codes by Value">
          <SpendingByNaicsChart data={top_naics} />
        </SectionCard>
        <SectionCard title="Deadline Radar — Next 90 Days">
          <DeadlineRadar buckets={deadline_buckets} />
        </SectionCard>
      </div>

      {/* Row 4: Pipeline chart + Top agencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Pipeline Value by Stage">
          <PipelineValueChart data={pipeline_by_stage} />
        </SectionCard>
        <SectionCard title="Top 10 Agencies — Active Opportunities">
          <TopAgenciesTable data={top_agencies} />
        </SectionCard>
      </div>
    </div>
  );
}
