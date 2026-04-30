'use client';

// ============================================================
// ANALYTICS DATA HOOK
// Single SWR call that fetches all dashboard data.
// Auto-refreshes every 5 minutes.
// ============================================================

import useSWR from 'swr';

// ---- Types ----

export interface AnalyticsKPIs {
  total_active: number;
  new_this_week: number;
  total_value_cents: number;
  soonest_deadline_days: number | null;
  soonest_deadline_title: string | null;
  pipeline_total_cents: number;
  win_rate_pct: number | null;
}

export interface SourceBreakdown {
  group: string;
  count: number;
}

export interface RawSourceBreakdown {
  source: string;
  count: number;
}

export interface WeeklyVolume {
  week: string;
  count: number;
}

export interface NaicsStat {
  code: number;
  sector: string;
  totalCents: number;
  count: number;
}

export interface DeadlineItem {
  id: number;
  title: string;
  deadline: string;
  agency_name: string | null;
  source: string;
  value_max: number | null;
  value_min: number | null;
  contract_type: string | null;
}

export interface DeadlineBuckets {
  week: number;
  month: number;
  sixty: number;
  ninety: number;
  items: DeadlineItem[];
}

export interface AgencyStat {
  name: string;
  count: number;
  totalCents: number;
}

export interface PipelineStageStat {
  stage: string;
  count: number;
  totalCents: number;
}

export interface AnalyticsData {
  kpis: AnalyticsKPIs;
  source_breakdown: SourceBreakdown[];
  raw_source_breakdown: RawSourceBreakdown[];
  weekly_volume: WeeklyVolume[];
  top_naics: NaicsStat[];
  deadline_buckets: DeadlineBuckets;
  top_agencies: AgencyStat[];
  pipeline_by_stage: PipelineStageStat[];
}

// ---- Fetcher ----

const fetcher = async (url: string): Promise<AnalyticsData> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ---- Hook ----

export function useAnalytics() {
  const { data, error, isLoading, mutate } = useSWR<AnalyticsData>(
    '/api/analytics',
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 5 * 60 * 1000, // 5 minutes
    },
  );
  return { data, error, isLoading, mutate };
}

// ---- Formatting ----

export function fmt(cents: number | null | undefined): string {
  if (!cents) return '—';
  const d = cents / 100;
  if (d >= 1_000_000_000) return `$${(d / 1_000_000_000).toFixed(1)}B`;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(1)}M`;
  if (d >= 1_000) return `$${(d / 1_000).toFixed(0)}K`;
  return `$${d.toLocaleString()}`;
}
