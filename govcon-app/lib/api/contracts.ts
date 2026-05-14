'use client';

// ============================================================
// CLIENT-SIDE CONTRACTS DATA FETCHING — SWR HOOKS
// All filter state is URL-param driven (shareable links).
// ============================================================

import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';

// ---- Types ----

export interface ContractListItem {
  id: number;
  source: string;
  title: string;
  agency_name: string | null;
  solicitation_number: string | null;
  naics_code: number | null;
  naics_sector: string | null;
  contract_type: string | null;
  threshold_category: string | null;
  set_aside_type: string | null;
  value_min: number | null;
  value_max: number | null;
  deadline: string | null;
  posted_date: string | null;
  place_of_performance_city: string | null;
  place_of_performance_state: string | null;
  place_of_performance_zip: string | null;
  description: string | null;
  url: string | null;
  status: string;
  canonical_sources: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ContractsResponse {
  data: ContractListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContractFilters {
  q?: string;
  source?: string;
  naics?: string;
  naics_sector?: string;
  agency?: string;
  threshold?: string;
  contract_type?: string;
  set_aside?: string;
  min_value?: string;
  max_value?: string;
  deadline_after?: string;
  deadline_before?: string;
  status?: string;
  ai_only?: string;
  sort?: string;
  page?: string;
  limit?: string;
}

// ---- Fetcher ----

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
};

// ---- Build URL from filters ----

export function buildContractsUrl(filters: ContractFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }
  return `/api/contracts?${params.toString()}`;
}

// ---- Main hook: reads from URL search params ----

export function useContracts(overrides?: Partial<ContractFilters>) {
  const searchParams = useSearchParams();

  const filters: ContractFilters = {
    q: searchParams.get('q') ?? undefined,
    source: searchParams.get('source') ?? undefined,
    naics: searchParams.get('naics') ?? undefined,
    naics_sector: searchParams.get('naics_sector') ?? undefined,
    agency: searchParams.get('agency') ?? undefined,
    threshold: searchParams.get('threshold') ?? undefined,
    contract_type: searchParams.get('contract_type') ?? undefined,
    set_aside: searchParams.get('set_aside') ?? undefined,
    min_value: searchParams.get('min_value') ?? undefined,
    max_value: searchParams.get('max_value') ?? undefined,
    deadline_after: searchParams.get('deadline_after') ?? undefined,
    deadline_before: searchParams.get('deadline_before') ?? undefined,
    status: searchParams.get('status') ?? 'active',  // Default to active opportunities only
    ai_only: searchParams.get('ai_only') ?? undefined,
    sort: searchParams.get('sort') ?? 'deadline:asc',
    page: searchParams.get('page') ?? '1',
    limit: searchParams.get('limit') ?? '25',
    ...overrides,
  };

  const url = buildContractsUrl(filters);

  const { data, error, isLoading, mutate } = useSWR<ContractsResponse>(url, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  return { data, error, isLoading, mutate, filters, url };
}

// ---- Hook: single contract by ID ----

export function useContract(id: number | string | null) {
  const url = id != null ? `/api/contracts/${id}` : null;
  const { data, error, isLoading } = useSWR<ContractListItem>(url, fetcher, {
    revalidateOnFocus: false,
  });
  return { contract: data, error, isLoading };
}

// ---- Utility: format dollar value from cents ----

export function formatValue(cents: number | null | undefined): string {
  if (cents == null) return 'N/A';
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toLocaleString()}`;
}

// ---- Utility: update URL params without full navigation ----

export function updateSearchParam(
  searchParams: URLSearchParams,
  updates: Record<string, string | null>,
): string {
  const next = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  // Reset page to 1 on any filter change (except explicit page set)
  if (!('page' in updates)) {
    next.delete('page');
  }
  return next.toString();
}
