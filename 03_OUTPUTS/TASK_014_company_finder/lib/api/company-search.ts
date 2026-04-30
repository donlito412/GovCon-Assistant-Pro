'use client';

// ============================================================
// CLIENT-SIDE HOOKS — Company Search + Contacts
// ============================================================

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import type { CompanyResult } from '../search/company_search';

// ---- Re-export CompanyResult type for consumers ----
export type { CompanyResult };

// ---- Contact type ----

export interface Contact {
  id: number;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source: 'samgov' | 'google_places' | 'web_search' | 'manual';
  uei: string | null;
  naics_codes: string[];
  certifications: Record<string, boolean> | null;
  sam_registered: boolean;
  notes: string | null;
  linked_bid_ids: number[];
  status: 'saved' | 'contacted' | 'teaming' | 'declined';
  created_at: string;
  updated_at: string;
}

export interface ContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ---- Fetcher ----

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

// ---- Search hook ----

export interface SearchState {
  results: CompanyResult[];
  isLoading: boolean;
  error: string | null;
  sources: { samgov: number; google_places: number; web_search: number } | null;
  query: string;
}

export function useCompanySearch() {
  const [state, setState] = useState<SearchState>({
    results: [], isLoading: false, error: null, sources: null, query: '',
  });

  const search = useCallback(async (params: {
    query: string;
    naicsCode?: string;
    location?: string;
    requireCertified?: boolean;
    certificationTypes?: string[];
    limit?: number;
  }) => {
    setState((s) => ({ ...s, isLoading: true, error: null, query: params.query }));
    try {
      const res = await fetch('/api/company-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setState({ results: data.results ?? [], isLoading: false, error: null, sources: data.sources ?? null, query: params.query });
    } catch (err) {
      setState((s) => ({ ...s, isLoading: false, error: err instanceof Error ? err.message : String(err) }));
    }
  }, []);

  const clear = useCallback(() => {
    setState({ results: [], isLoading: false, error: null, sources: null, query: '' });
  }, []);

  return { ...state, search, clear };
}

// ---- Contacts list hook ----

export interface ContactFilters {
  q?: string;
  status?: string;
  source?: string;
  sam_registered?: boolean;
  page?: number;
}

export function useContacts(filters: ContactFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q)             params.set('q', filters.q);
  if (filters.status)        params.set('status', filters.status);
  if (filters.source)        params.set('source', filters.source);
  if (filters.sam_registered !== undefined) params.set('sam_registered', String(filters.sam_registered));
  if (filters.page)          params.set('page', String(filters.page));

  const { data, error, isLoading, mutate } = useSWR<ContactsResponse>(
    `/api/contacts?${params.toString()}`, fetcher, { revalidateOnFocus: false }
  );
  return { data, error, isLoading, mutate };
}

// ---- Save contact ----

export async function saveContact(result: CompanyResult, extra?: { notes?: string; linked_bid_ids?: number[] }): Promise<Contact> {
  const res = await fetch('/api/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_name:   result.company_name,
      contact_name:   result.contact_name,
      email:          result.email,
      phone:          result.phone,
      website:        result.website,
      address:        result.address,
      city:           result.city,
      state:          result.state,
      zip:            result.zip,
      source:         result.source,
      uei:            result.uei,
      naics_codes:    result.naics_codes ?? [],
      certifications: result.certifications ?? null,
      sam_registered: result.sam_registered,
      notes:          extra?.notes ?? null,
      linked_bid_ids: extra?.linked_bid_ids ?? [],
      status:         'saved',
    }),
  });
  if (!res.ok) throw new Error(`Save failed: HTTP ${res.status}`);
  return res.json();
}

// ---- Update contact status ----

export async function updateContactStatus(id: number, status: Contact['status']): Promise<Contact> {
  const res = await fetch(`/api/contacts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Update failed: HTTP ${res.status}`);
  return res.json();
}

// ---- Cert display helpers ----

export const CERT_LABELS: Record<string, string> = {
  '8a':     '8(a)',
  hubzone:  'HUBZone',
  sdvosb:   'SDVOSB',
  wosb:     'WOSB',
  edwosb:   'EDWOSB',
  mwdbe:    'MBE/WBE',
};

export function activeCerts(certs: Record<string, boolean> | null | undefined): string[] {
  if (!certs) return [];
  return Object.entries(certs).filter(([, v]) => v).map(([k]) => CERT_LABELS[k] ?? k.toUpperCase());
}

export const STATUS_COLORS: Record<string, string> = {
  saved:     'bg-gray-100 text-gray-600',
  contacted: 'bg-blue-100 text-blue-700',
  teaming:   'bg-green-100 text-green-700',
  declined:  'bg-red-100 text-red-600',
};

export const SOURCE_LABELS: Record<string, string> = {
  samgov:        'SAM.gov',
  google_places: 'Google',
  web_search:    'Web',
  manual:        'Manual',
};
