'use client';

// ============================================================
// SAVED SEARCHES — CLIENT HOOKS & TYPES
// ============================================================

import useSWR, { mutate as globalMutate } from 'swr';

// ---- Types ----

export interface SavedSearch {
  id: number;
  name: string;
  filters_json: Record<string, string>;
  alert_enabled: boolean;
  last_checked_at: string | null;
  created_at: string;
  // Augmented at fetch time
  match_count?: number;
}

// ---- Fetcher ----

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const KEY = '/api/saved-searches';

// ---- Hook ----

export function useSavedSearches() {
  const { data, error, isLoading, mutate } = useSWR<SavedSearch[]>(KEY, fetcher, {
    revalidateOnFocus: false,
  });
  return { searches: data ?? [], error, isLoading, mutate };
}

// ---- Mutations ----

export async function createSavedSearch(
  name: string,
  filtersJson: Record<string, string>,
  alertEnabled: boolean,
): Promise<SavedSearch> {
  const res = await fetch(KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, filters_json: filtersJson, alert_enabled: alertEnabled }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const saved = await res.json() as SavedSearch;
  await globalMutate(KEY);
  return saved;
}

export async function toggleAlert(id: number, alertEnabled: boolean): Promise<void> {
  // Optimistic
  await globalMutate(
    KEY,
    (current: SavedSearch[] | undefined) =>
      (current ?? []).map((s) => (s.id === id ? { ...s, alert_enabled: alertEnabled } : s)),
    false,
  );
  const res = await fetch(`/api/saved-searches/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alert_enabled: alertEnabled }),
  });
  if (!res.ok) {
    await globalMutate(KEY);
    throw new Error(`HTTP ${res.status}`);
  }
  await globalMutate(KEY);
}

export async function deleteSavedSearch(id: number): Promise<void> {
  // Optimistic
  await globalMutate(
    KEY,
    (current: SavedSearch[] | undefined) => (current ?? []).filter((s) => s.id !== id),
    false,
  );
  const res = await fetch(`/api/saved-searches/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    await globalMutate(KEY);
    throw new Error(`HTTP ${res.status}`);
  }
  await globalMutate(KEY);
}

// ---- Helpers ----

/** Convert URLSearchParams or Record to a clean filters_json (omit page/sort/limit) */
export function buildFiltersJson(
  searchParams: URLSearchParams | Record<string, string>,
): Record<string, string> {
  const EXCLUDED_KEYS = new Set(['page', 'limit', 'sort']);
  const params = searchParams instanceof URLSearchParams
    ? searchParams
    : new URLSearchParams(Object.entries(searchParams));

  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    if (!EXCLUDED_KEYS.has(key) && value) result[key] = value;
  });
  return result;
}

/** Convert a filters_json back to a URL query string for /contracts */
export function filtersToQueryString(filters: Record<string, string>): string {
  return new URLSearchParams(Object.entries(filters)).toString();
}

/** Human-readable summary of active filters */
export function filterSummary(filters: Record<string, string>): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`"${filters.q}"`);
  if (filters.source) parts.push(filters.source.split(',').length + ' sources');
  if (filters.threshold) parts.push(filters.threshold.replace(/_/g, ' '));
  if (filters.contract_type) parts.push(filters.contract_type.split(',').join('/'));
  if (filters.naics_sector) parts.push(filters.naics_sector.split(',')[0]);
  if (filters.set_aside) parts.push(filters.set_aside.split(',')[0].replace(/_/g, ' '));
  if (filters.min_value || filters.max_value) {
    const lo = filters.min_value ? `$${(+filters.min_value / 1000).toFixed(0)}K` : '';
    const hi = filters.max_value ? `$${(+filters.max_value / 1000).toFixed(0)}K` : '';
    parts.push([lo, hi].filter(Boolean).join('–'));
  }
  if (filters.deadline_after || filters.deadline_before) parts.push('deadline range');
  if (parts.length === 0) return 'All active opportunities';
  return parts.join(' · ');
}
