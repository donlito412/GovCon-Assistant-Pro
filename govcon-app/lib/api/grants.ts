'use client';

// ============================================================
// GRANTS DATA HOOKS — SWR client hooks + types
// ============================================================

import useSWR from 'swr';

// ---- Types ----

export interface Grant {
  id: number;
  source: string;
  category: 'federal' | 'state' | 'local' | 'university' | 'foundation';
  title: string;
  agency: string;
  grant_type: 'grant' | 'loan' | 'tax_credit' | 'rebate' | 'other';
  eligible_entities: string[];
  min_amount: number | null;
  max_amount: number | null;
  application_deadline: string | null;
  posted_date: string | null;
  description: string | null;
  requirements: string | null;
  how_to_apply: string | null;
  url: string | null;
  external_id: string | null;
  status: string;
  created_at: string;
}

export interface GrantsResponse {
  grants: Grant[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface GrantFilters {
  q?: string;
  category?: string;
  grant_type?: string;
  eligible_entity?: string;
  source?: string;
  min_amount?: number;
  max_amount?: number;
  deadline_before?: string;
  deadline_after?: string;
  sort?: 'deadline_asc' | 'amount_desc' | 'recent';
  page?: number;
}

// ---- Fetcher ----

const fetcher = async (url: string): Promise<GrantsResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ---- Hook ----

export function useGrants(filters: GrantFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q)               params.set('q', filters.q);
  if (filters.category)        params.set('category', filters.category);
  if (filters.grant_type)      params.set('grant_type', filters.grant_type);
  if (filters.eligible_entity) params.set('eligible_entity', filters.eligible_entity);
  if (filters.source)          params.set('source', filters.source);
  if (filters.min_amount)      params.set('min_amount', String(filters.min_amount));
  if (filters.max_amount)      params.set('max_amount', String(filters.max_amount));
  if (filters.deadline_before) params.set('deadline_before', filters.deadline_before);
  if (filters.deadline_after)  params.set('deadline_after', filters.deadline_after);
  if (filters.sort)            params.set('sort', filters.sort);
  if (filters.page)            params.set('page', String(filters.page));

  const url = `/api/grants?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<GrantsResponse>(url, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  return { data, error, isLoading, mutate };
}

// ---- Formatting ----

export function fmtGrantAmount(cents: number | null | undefined): string {
  if (!cents) return '—';
  const d = cents / 100;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(1)}M`;
  if (d >= 1_000)     return `$${(d / 1_000).toFixed(0)}K`;
  return `$${d.toLocaleString()}`;
}

export function fmtAmountRange(min: number | null, max: number | null): string {
  if (!min && !max) return 'Amount varies';
  if (!min) return `Up to ${fmtGrantAmount(max)}`;
  if (!max) return `From ${fmtGrantAmount(min)}`;
  if (min === max) return fmtGrantAmount(min);
  return `${fmtGrantAmount(min)} – ${fmtGrantAmount(max)}`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  federal:    'Federal',
  state:      'State',
  local:      'Local',
  university: 'University',
  foundation: 'Foundation',
};

export const CATEGORY_COLORS: Record<string, string> = {
  federal:    'bg-blue-100 text-blue-700',
  state:      'bg-purple-100 text-purple-700',
  local:      'bg-green-100 text-green-700',
  university: 'bg-yellow-100 text-yellow-700',
  foundation: 'bg-pink-100 text-pink-700',
};

export const GRANT_TYPE_LABELS: Record<string, string> = {
  grant:      'Grant',
  loan:       'Loan',
  tax_credit: 'Tax Credit',
  rebate:     'Rebate',
  other:      'Program',
};

export const GRANT_TYPE_COLORS: Record<string, string> = {
  grant:      'bg-emerald-100 text-emerald-700',
  loan:       'bg-orange-100 text-orange-700',
  tax_credit: 'bg-cyan-100 text-cyan-700',
  rebate:     'bg-teal-100 text-teal-700',
  other:      'bg-gray-100 text-gray-600',
};
