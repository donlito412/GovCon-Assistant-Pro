// ============================================================
// CLIENT HOOKS — RECOMPETES
// ============================================================

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

export interface IncumbentContract {
  id:                             number;
  opportunity_id:                 number | null;
  solicitation_number:            string | null;
  current_awardee_name:           string;
  current_awardee_uei:            string | null;
  award_date:                     string | null;
  award_amount:                   number | null;  // cents
  period_of_performance_end_date: string | null;
  base_period_months:             number | null;
  option_periods:                 OptionPeriod[];
  recompete_likely_date:          string | null;
  agency_name:                    string | null;
  naics_code:                     string | null;
  usaspending_award_id:           string | null;
  created_at:                     string;
  updated_at:                     string;
  opportunities?: {
    title: string; source: string; set_aside_type: string | null; status: string | null;
  } | null;
}

export interface OptionPeriod {
  label:     string;
  months:    number;
  exercised: boolean;
}

export interface RecompeteFilters {
  days?:      number;
  naics?:     string;
  agency?:    string;
  min_value?: number;
  max_value?: number;
  sort?:      'soonest' | 'highest_value' | 'oldest';
  page?:      number;
  per_page?:  number;
}

export function useRecompetes(filters: RecompeteFilters = {}) {
  const params = new URLSearchParams();
  if (filters.days)      params.set('days',      String(filters.days));
  if (filters.naics)     params.set('naics',     filters.naics);
  if (filters.agency)    params.set('agency',    filters.agency);
  if (filters.min_value) params.set('min_value', String(filters.min_value));
  if (filters.max_value) params.set('max_value', String(filters.max_value));
  if (filters.sort)      params.set('sort',      filters.sort);
  if (filters.page)      params.set('page',      String(filters.page));
  if (filters.per_page)  params.set('per_page',  String(filters.per_page));
  return useSWR<{ recompetes: IncumbentContract[]; total: number; total_pages: number }>(
    `/api/recompetes?${params.toString()}`, fetcher,
  );
}

// ── Helpers ──────────────────────────────────────────────

export function daysUntilExpiry(endDate: string | null): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

export function formatValue(cents: number | null): string {
  if (!cents) return 'Not disclosed';
  const n = cents / 100;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export function recompeteLikelyLabel(date: string | null): string {
  if (!date) return 'Unknown';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function urgencyLevel(days: number | null): 'critical' | 'warning' | 'moderate' | 'low' {
  if (days === null) return 'low';
  if (days <= 30)   return 'critical';
  if (days <= 90)   return 'warning';
  if (days <= 180)  return 'moderate';
  return 'low';
}
