'use client';

import useSWR from 'swr';

// ---- Types ----

export type BidStatus = 'pending' | 'won' | 'lost' | 'withdrawn' | 'cancelled' | 'no_award';

export interface TeamMember {
  subcontractor_id?: number;
  company_name: string;
  role: 'prime' | 'sub' | 'joint_venture';
  naics?: string;
  percentage_of_work: number;
  certifications?: string[];
}

export interface BidDocument {
  name: string;
  type: string;    // e.g. 'technical_proposal', 'price_proposal', 'past_performance'
  submitted_at: string;
}

export interface BidRecord {
  id: number;
  user_id: string;
  opportunity_id: number | null;
  pipeline_item_id: number | null;
  contract_title: string;
  agency: string;
  solicitation_number: string | null;
  source: string | null;
  bid_submitted_date: string | null;
  bid_amount: number | null;        // cents
  bid_narrative: string | null;
  team_composition: TeamMember[];
  documents_submitted: BidDocument[];
  status: BidStatus;
  award_date: string | null;
  award_amount: number | null;      // cents
  if_lost_winner_name: string | null;
  if_lost_winner_amount: number | null; // cents
  if_lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface BidStats {
  total_bids: number;
  wins: number;
  losses: number;
  pending: number;
  win_rate: number;        // 0–100
  total_won_cents: number;
  total_pending_cents: number;
  avg_bid_cents: number;
}

// ---- Fetcher ----

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

// ---- Hooks ----

export interface BidFilters {
  status?: string; agency?: string; date_from?: string; date_to?: string;
  sort?: string; page?: number;
}

export function useBids(filters: BidFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status)    params.set('status', filters.status);
  if (filters.agency)    params.set('agency', filters.agency);
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to)   params.set('date_to', filters.date_to);
  if (filters.sort)      params.set('sort', filters.sort);
  if (filters.page)      params.set('page', String(filters.page));

  const { data, error, isLoading, mutate } = useSWR(
    `/api/bids?${params.toString()}`, fetcher, { revalidateOnFocus: false, keepPreviousData: true }
  );
  return { data, error, isLoading, mutate };
}

export function useBid(id: number | null) {
  const { data, error, isLoading, mutate } = useSWR<BidRecord>(
    id ? `/api/bids/${id}` : null, fetcher, { revalidateOnFocus: false }
  );
  return { bid: data, error, isLoading, mutate };
}

// ---- Mutations ----

export async function createBid(body: Partial<BidRecord>): Promise<BidRecord> {
  const res = await fetch('/api/bids', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateBid(id: number, patch: Partial<BidRecord>): Promise<BidRecord> {
  const res = await fetch(`/api/bids/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---- Stat computation (client-side from fetched bids) ----

export function computeBidStats(bids: BidRecord[]): BidStats {
  const resolved = bids.filter((b) => b.status === 'won' || b.status === 'lost');
  const wins     = bids.filter((b) => b.status === 'won');
  const pending  = bids.filter((b) => b.status === 'pending');

  return {
    total_bids:          bids.length,
    wins:                wins.length,
    losses:              bids.filter((b) => b.status === 'lost').length,
    pending:             pending.length,
    win_rate:            resolved.length >= 3 ? Math.round((wins.length / resolved.length) * 100) : 0,
    total_won_cents:     wins.reduce((s, b) => s + (b.award_amount ?? b.bid_amount ?? 0), 0),
    total_pending_cents: pending.reduce((s, b) => s + (b.bid_amount ?? 0), 0),
    avg_bid_cents:       bids.length > 0
      ? Math.round(bids.reduce((s, b) => s + (b.bid_amount ?? 0), 0) / bids.length) : 0,
  };
}

// ---- Formatters ----

export function fmtCents(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}

export const BID_STATUS_LABELS: Record<BidStatus, string> = {
  pending:   'Pending', won: 'Won', lost: 'Lost',
  withdrawn: 'Withdrawn', cancelled: 'Cancelled', no_award: 'No Award',
};

export const BID_STATUS_COLORS: Record<BidStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  won:       'bg-green-100 text-green-700',
  lost:      'bg-red-100 text-red-600',
  withdrawn: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-100 text-gray-500',
  no_award:  'bg-slate-100 text-slate-500',
};
