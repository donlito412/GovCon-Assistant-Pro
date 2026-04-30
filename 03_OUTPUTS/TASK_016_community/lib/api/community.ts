'use client';

import useSWR from 'swr';

// ── Types ──────────────────────────────────────────────────

export type BusinessType = 'LLC' | 'sole_prop' | 'corp' | 'partnership' | 'nonprofit' | 'other';
export type EmployeeRange = '1' | '2-5' | '6-10' | '11-50' | '50+';
export type CommunitySource = 'self_registered' | 'pa_corps_import';
export type TeamingPostStatus = 'open' | 'filled' | 'expired';
export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

export interface CommunityProfile {
  id: number;
  user_id: string | null;
  business_name: string;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  neighborhood: string | null;
  city: string | null;
  zip: string | null;
  business_type: BusinessType | null;
  industry: string | null;
  naics_codes: string[];
  services_offered: string[];
  years_in_business: number | null;
  employee_count_range: EmployeeRange | null;
  certifications: Record<string, boolean>;
  sam_registered: boolean;
  sam_uei: string | null;
  bio: string | null;
  looking_for: string[];
  profile_photo_url: string | null;
  is_verified: boolean;
  source: CommunitySource;
  created_at: string;
  updated_at: string;
}

export interface TeamingPost {
  id: number;
  author_profile_id: number;
  linked_opportunity_id: number | null;
  title: string;
  description: string | null;
  contract_value_range: string | null;
  naics_needed: string[];
  certifications_needed: string[];
  response_deadline: string | null;
  status: TeamingPostStatus;
  created_at: string;
  community_profiles?: Pick<CommunityProfile, 'business_name' | 'neighborhood' | 'certifications' | 'sam_registered'>;
}

export interface ConnectionRequest {
  id: number;
  from_profile_id: number;
  to_profile_id: number;
  message: string | null;
  status: ConnectionStatus;
  created_at: string;
  from_profile?: Pick<CommunityProfile, 'id' | 'business_name' | 'neighborhood'>;
  to_profile?: Pick<CommunityProfile, 'id' | 'business_name' | 'neighborhood'>;
}

export interface CommunityMessage {
  id: number;
  from_profile_id: number;
  to_profile_id: number;
  body: string;
  read_at: string | null;
  created_at: string;
}

// ── Fetcher ────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

// ── Profile Hooks ──────────────────────────────────────────

export interface ProfileFilters {
  q?: string; neighborhood?: string; industry?: string;
  sam_registered?: boolean; verified?: boolean;
  looking_for?: string; sort?: string; page?: number;
}

export function useCommunityProfiles(filters: ProfileFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q)            params.set('q', filters.q);
  if (filters.neighborhood) params.set('neighborhood', filters.neighborhood);
  if (filters.industry)     params.set('industry', filters.industry);
  if (filters.sam_registered) params.set('sam_registered', 'true');
  if (filters.verified)     params.set('verified', 'true');
  if (filters.looking_for)  params.set('looking_for', filters.looking_for);
  if (filters.sort)         params.set('sort', filters.sort);
  if (filters.page)         params.set('page', String(filters.page));

  return useSWR(`/api/community/profiles?${params.toString()}`, fetcher, { revalidateOnFocus: false });
}

export function useCommunityProfile(id: number | null) {
  return useSWR<CommunityProfile>(
    id ? `/api/community/profiles/${id}` : null, fetcher, { revalidateOnFocus: false }
  );
}

export async function createCommunityProfile(body: Partial<CommunityProfile>): Promise<CommunityProfile> {
  const res = await fetch('/api/community/profiles', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`); }
  return res.json();
}

export async function updateCommunityProfile(id: number, patch: Partial<CommunityProfile>): Promise<CommunityProfile> {
  const res = await fetch(`/api/community/profiles/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`); }
  return res.json();
}

// ── Teaming Hooks ──────────────────────────────────────────

export function useTeamingPosts(filters: { status?: string; naics?: string; cert_needed?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status)      params.set('status', filters.status);
  if (filters.naics)       params.set('naics', filters.naics);
  if (filters.cert_needed) params.set('cert_needed', filters.cert_needed);
  if (filters.page)        params.set('page', String(filters.page));
  return useSWR(`/api/community/teaming?${params.toString()}`, fetcher, { revalidateOnFocus: false });
}

export async function createTeamingPost(body: Partial<TeamingPost>): Promise<TeamingPost> {
  const res = await fetch('/api/community/teaming', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`); }
  return res.json();
}

export async function closeTeamingPost(id: number, status: 'filled' | 'expired'): Promise<TeamingPost> {
  const res = await fetch('/api/community/teaming', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`); }
  return res.json();
}

// ── Connection Hooks ───────────────────────────────────────

export function useConnections() {
  return useSWR('/api/community/connections', fetcher, { revalidateOnFocus: false });
}

export async function sendConnectionRequest(toProfileId: number, message?: string) {
  const res = await fetch('/api/community/connections', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to_profile_id: toProfileId, message }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`); }
  return res.json();
}

export async function respondToConnection(requestId: number, status: 'accepted' | 'declined') {
  const res = await fetch('/api/community/connections', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ request_id: requestId, status }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`); }
  return res.json();
}

// ── Message Hooks ──────────────────────────────────────────

export function useMessageThread(withProfileId: number | null) {
  return useSWR(
    withProfileId ? `/api/community/messages?with=${withProfileId}` : null,
    fetcher, { revalidateOnFocus: false, refreshInterval: 30_000 }
  );
}

export async function sendMessage(toProfileId: number, bodyText: string) {
  const res = await fetch('/api/community/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to_profile_id: toProfileId, bodyText }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`); }
  return res.json();
}

// ── Display helpers ────────────────────────────────────────

export const CERT_LABELS: Record<string, string> = {
  mwbe: 'MBE/WBE', veteran_owned: 'Veteran', minority_owned: 'MBE',
  woman_owned: 'WBE', disabled_owned: 'Disabled', lgbtq_owned: 'LGBTQ+',
};

export function activeCertLabels(certs: Record<string, boolean> | null | undefined): string[] {
  if (!certs) return [];
  return Object.entries(certs).filter(([, v]) => v).map(([k]) => CERT_LABELS[k] ?? k);
}

export const LOOKING_FOR_LABELS: Record<string, string> = {
  subcontractor_work: 'Sub Work',
  prime_teaming:      'Prime Teaming',
  suppliers:          'Suppliers',
  mentorship:         'Mentorship',
  partnerships:       'Partnerships',
};
