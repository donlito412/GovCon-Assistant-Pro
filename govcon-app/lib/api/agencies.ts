'use client';

// ============================================================
// AGENCIES — CLIENT HOOKS & TYPES
// ============================================================

import useSWR from 'swr';

// ---- Types ----

export type AgencyLevel = 'federal' | 'state' | 'local' | 'education';

export interface Agency {
  id: number;
  name: string;
  level: AgencyLevel;
  website: string | null;
  total_spend: number | null;
  created_at: string;
  // Augmented
  active_count?: number;
  active_value_cents?: number;
}

export interface AgencyStats {
  active_count: number;
  active_value_cents: number;
  avg_value_cents: number;
  total_opportunities: number;
  type_breakdown: Record<string, number>;
  source_breakdown: Record<string, number>;
}

export interface NaicsStat {
  code: number;
  sector: string;
  count: number;
  totalCents: number;
}

export interface ActiveOpportunity {
  id: number;
  title: string;
  source: string;
  contract_type: string | null;
  threshold_category: string | null;
  value_max: number | null;
  value_min: number | null;
  deadline: string | null;
  posted_date: string | null;
  url: string | null;
  solicitation_number: string | null;
}

export interface AgencyDetail {
  agency: Agency;
  stats: AgencyStats;
  top_naics: NaicsStat[];
  recent_active: ActiveOpportunity[];
}

export interface Award {
  award_id: string | null;
  recipient_name: string | null;
  start_date: string | null;
  end_date: string | null;
  amount_dollars: number | null;
  description: string | null;
  award_type: string | null;
}

export interface AgencyAwardsResponse {
  awards: Award[];
  agency: string;
  total: number;
  source: string;
  error?: string;
}

export interface AgencyListResponse {
  data: Agency[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---- Fetcher ----

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ---- Hooks ----

export function useAgencies(params: {
  level?: string;
  sort?: string;
  q?: string;
  page?: number;
  limit?: number;
} = {}) {
  const { level = '', sort = 'active_count:desc', q = '', page = 1, limit = 30 } = params;
  const urlParams = new URLSearchParams();
  if (level) urlParams.set('level', level);
  if (sort) urlParams.set('sort', sort);
  if (q) urlParams.set('q', q);
  urlParams.set('page', String(page));
  urlParams.set('limit', String(limit));

  const url = `/api/agencies?${urlParams.toString()}`;
  const { data, error, isLoading } = useSWR<AgencyListResponse>(url, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });
  return { data, error, isLoading };
}

export function useAgencyDetail(id: number | string | null) {
  const url = id != null ? `/api/agencies/${id}` : null;
  const { data, error, isLoading } = useSWR<AgencyDetail>(url, fetcher, {
    revalidateOnFocus: false,
  });
  return { detail: data, error, isLoading };
}

export function useAgencyAwards(id: number | string | null) {
  const url = id != null ? `/api/agencies/${id}/awards` : null;
  const { data, error, isLoading } = useSWR<AgencyAwardsResponse>(url, fetcher, {
    revalidateOnFocus: false,
  });
  return { awardsData: data, error, isLoading };
}

// ---- Helpers ----

export const LEVEL_LABELS: Record<AgencyLevel, string> = {
  federal: 'Federal',
  state: 'State',
  local: 'Local',
  education: 'Education',
};

export const LEVEL_COLORS: Record<AgencyLevel, { bg: string; text: string; border: string }> = {
  federal:   { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200' },
  state:     { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  local:     { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-200' },
  education: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
};

export function formatDollars(cents: number | null | undefined): string {
  if (!cents) return '—';
  const d = cents / 100;
  if (d >= 1_000_000_000) return `$${(d / 1_000_000_000).toFixed(1)}B`;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(1)}M`;
  if (d >= 1_000) return `$${(d / 1_000).toFixed(0)}K`;
  return `$${d.toLocaleString()}`;
}

export function formatAwardDollars(dollars: number | null | undefined): string {
  if (!dollars) return '—';
  if (dollars >= 1_000_000_000) return `$${(dollars / 1_000_000_000).toFixed(1)}B`;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toLocaleString()}`;
}
