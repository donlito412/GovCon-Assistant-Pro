// ============================================================
// CLIENT HOOKS — FORECAST OPPORTUNITIES
// ============================================================

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

export interface ForecastOpportunity {
  id:                           number;
  source:                       string;
  sam_notice_id:                string | null;
  title:                        string;
  agency_name:                  string | null;
  naics_code:                   string | null;
  estimated_solicitation_date:  string | null;
  estimated_award_date:         string | null;
  estimated_value:              number | null;  // cents
  set_aside_type:               string | null;
  description:                  string | null;
  poc_name:                     string | null;
  poc_email:                    string | null;
  poc_phone:                    string | null;
  place_of_performance_city:    string | null;
  place_of_performance_state:   string | null;
  linked_opportunity_id:        number | null;
  status:                       'active' | 'solicited' | 'awarded' | 'cancelled';
  created_at:                   string;
  updated_at:                   string;
}

export interface ForecastFilters {
  q?:         string;
  naics?:     string;
  agency?:    string;
  status?:    'active' | 'solicited' | 'awarded' | 'cancelled';
  days?:      number;
  min_value?: number;
  sort?:      'soonest' | 'highest_value' | 'latest';
  page?:      number;
  per_page?:  number;
}

export function useForecasts(filters: ForecastFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q)         params.set('q',         filters.q);
  if (filters.naics)     params.set('naics',     filters.naics);
  if (filters.agency)    params.set('agency',    filters.agency);
  if (filters.status)    params.set('status',    filters.status);
  if (filters.days)      params.set('days',      String(filters.days));
  if (filters.min_value) params.set('min_value', String(filters.min_value));
  if (filters.sort)      params.set('sort',      filters.sort);
  if (filters.page)      params.set('page',      String(filters.page));
  if (filters.per_page)  params.set('per_page',  String(filters.per_page));
  return useSWR<{ forecasts: ForecastOpportunity[]; total: number; total_pages: number }>(
    `/api/forecasts?${params.toString()}`, fetcher,
  );
}

// ── Helpers ──────────────────────────────────────────────

export function daysUntilSolicitation(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export function formatForecastValue(cents: number | null): string {
  if (!cents) return 'TBD';
  const n = cents / 100;
  if (n >= 1_000_000) return `~$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `~$${(n / 1_000).toFixed(0)}K`;
  return `~$${n.toLocaleString()}`;
}

export function solicitationLabel(dateStr: string | null): string {
  if (!dateStr) return 'Date TBD';
  const d = new Date(dateStr);
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days <= 0)   return 'Solicitation overdue';
  if (days <= 30)  return `RFP expected in ~${days} days`;
  const month = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return `RFP expected ${month}`;
}

export function statusColor(status: ForecastOpportunity['status']): string {
  switch (status) {
    case 'active':    return 'bg-green-100 text-green-700';
    case 'solicited': return 'bg-blue-100 text-blue-700';
    case 'awarded':   return 'bg-gray-100 text-gray-500';
    case 'cancelled': return 'bg-red-100 text-red-600';
    default:          return 'bg-gray-100 text-gray-600';
  }
}
