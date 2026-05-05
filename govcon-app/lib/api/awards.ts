'use client';

// ============================================================
// CLIENT-SIDE AWARDS DATA FETCHING — SWR HOOKS
// For historical contract awards (separate from opportunities)
// ============================================================

import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';

// ---- Types ----

export interface AwardItem {
  id: number;
  source: string;
  title: string;
  agency_name: string | null;
  solicitation_number: string | null;
  naics_code: number | null;
  naics_sector: string | null;
  contract_type: string | null;
  set_aside_type: string | null;
  award_date: string | null;
  award_amount: number | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  awardee_name: string | null;
  awardee_uei: string | null;
  place_of_performance_city: string | null;
  place_of_performance_state: string | null;
  place_of_performance_zip: string | null;
  description: string | null;
  url: string | null;
  usaspending_award_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AwardsResponse {
  data: AwardItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AwardFilters {
  q?: string;
  source?: string;
  naics?: string;
  agency?: string;
  awardee?: string;
  min_value?: string;
  max_value?: string;
  awarded_after?: string;
  awarded_before?: string;
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

export function buildAwardsUrl(filters: AwardFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }
  return `/api/awards?${params.toString()}`;
}

// ---- Main hook: reads from URL search params ----

export function useAwards(overrides?: Partial<AwardFilters>) {
  const searchParams = useSearchParams();

  const filters: AwardFilters = {
    q: searchParams.get('q') ?? undefined,
    source: searchParams.get('source') ?? undefined,
    naics: searchParams.get('naics') ?? undefined,
    agency: searchParams.get('agency') ?? undefined,
    awardee: searchParams.get('awardee') ?? undefined,
    min_value: searchParams.get('min_value') ?? undefined,
    max_value: searchParams.get('max_value') ?? undefined,
    awarded_after: searchParams.get('awarded_after') ?? undefined,
    awarded_before: searchParams.get('awarded_before') ?? undefined,
    sort: searchParams.get('sort') ?? 'award_date:desc',
    page: searchParams.get('page') ?? '1',
    limit: searchParams.get('limit') ?? '25',
    ...overrides,
  };

  const url = buildAwardsUrl(filters);

  const { data, error, isLoading, mutate } = useSWR<AwardsResponse>(url, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  return { data, error, isLoading, mutate, filters, url };
}

// ---- Utility: format dollar value from cents ----

export function formatAwardValue(cents: number | null | undefined): string {
  if (cents == null) return 'N/A';
  const dollars = cents / 100;
  if (dollars >= 1_000_000_000) return `$${(dollars / 1_000_000_000).toFixed(1)}B`;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toLocaleString()}`;
}

// ---- Utility: format date ----

export function formatAwardDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
