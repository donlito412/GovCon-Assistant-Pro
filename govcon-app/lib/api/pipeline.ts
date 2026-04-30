'use client';

// ============================================================
// PIPELINE CLIENT-SIDE HOOKS & TYPES
// SWR-based fetching + optimistic mutation helpers
// ============================================================

import useSWR, { mutate as globalMutate } from 'swr';

// ---- Types ----

export type PipelineStage =
  | 'Identified'
  | 'Qualifying'
  | 'Pursuing'
  | 'Proposal_In_Progress'
  | 'Submitted'
  | 'Won'
  | 'Lost'
  | 'No_Bid';

export const PIPELINE_STAGES: PipelineStage[] = [
  'Identified',
  'Qualifying',
  'Pursuing',
  'Proposal_In_Progress',
  'Submitted',
  'Won',
  'Lost',
  'No_Bid',
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  Identified:           'Identified',
  Qualifying:           'Qualifying',
  Pursuing:             'Pursuing',
  Proposal_In_Progress: 'Proposal In Progress',
  Submitted:            'Submitted',
  Won:                  'Won ✓',
  Lost:                 'Lost',
  No_Bid:               'No Bid',
};

export const STAGE_COLORS: Record<PipelineStage, { bg: string; text: string; border: string; header: string }> = {
  Identified:           { bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-200', header: 'bg-slate-100' },
  Qualifying:           { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  header: 'bg-blue-100' },
  Pursuing:             { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200',header: 'bg-indigo-100' },
  Proposal_In_Progress: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200',header: 'bg-violet-100' },
  Submitted:            { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', header: 'bg-amber-100' },
  Won:                  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200', header: 'bg-green-100' },
  Lost:                 { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   header: 'bg-red-100' },
  No_Bid:               { bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200',  header: 'bg-gray-100' },
};

export interface PipelineNote {
  text: string;
  created_at: string;
}

export interface PipelineOpportunity {
  id: number;
  source: string;
  title: string;
  agency_name: string | null;
  solicitation_number: string | null;
  contract_type: string | null;
  threshold_category: string | null;
  set_aside_type: string | null;
  value_min: number | null;
  value_max: number | null;
  deadline: string | null;
  posted_date: string | null;
  place_of_performance_city: string | null;
  place_of_performance_state: string | null;
  url: string | null;
  status: string;
}

export interface PipelineItem {
  id: number;
  opportunity_id: number;
  stage: PipelineStage;
  notes_json: PipelineNote[] | null;
  created_at: string;
  updated_at: string;
  opportunity: PipelineOpportunity | null;
}

// ---- Fetcher ----

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const PIPELINE_KEY = '/api/pipeline';

// ---- Hooks ----

export function usePipeline() {
  const { data, error, isLoading, mutate } = useSWR<PipelineItem[]>(PIPELINE_KEY, fetcher, {
    revalidateOnFocus: false,
  });

  // Group items by stage, sorted by deadline asc within each stage
  const byStage: Record<PipelineStage, PipelineItem[]> = {} as Record<PipelineStage, PipelineItem[]>;
  for (const stage of PIPELINE_STAGES) {
    byStage[stage] = (data ?? [])
      .filter((item) => item.stage === stage)
      .sort((a, b) => {
        const da = a.opportunity?.deadline ?? '';
        const db = b.opportunity?.deadline ?? '';
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da < db ? -1 : 1;
      });
  }

  // Total value tracked (sum of value_max across all items)
  const totalValueCents = (data ?? []).reduce((sum, item) => {
    return sum + (item.opportunity?.value_max ?? item.opportunity?.value_min ?? 0);
  }, 0);

  // Value by stage
  const valueByStage: Record<PipelineStage, number> = {} as Record<PipelineStage, number>;
  for (const stage of PIPELINE_STAGES) {
    valueByStage[stage] = byStage[stage].reduce((sum, item) => {
      return sum + (item.opportunity?.value_max ?? item.opportunity?.value_min ?? 0);
    }, 0);
  }

  return {
    items: data ?? [],
    byStage,
    totalValueCents,
    valueByStage,
    isLoading,
    error,
    mutate,
  };
}

// ---- Mutations ----

/** Add an opportunity to the pipeline (Identified stage). */
export async function addToPipeline(opportunityId: number): Promise<PipelineItem> {
  const res = await fetch(PIPELINE_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opportunity_id: opportunityId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const item = await res.json() as PipelineItem;
  await globalMutate(PIPELINE_KEY);
  return item;
}

/** Move a pipeline item to a new stage. Returns updated item. */
export async function moveStage(
  itemId: number,
  stage: PipelineStage,
  optimisticUpdate?: (items: PipelineItem[]) => PipelineItem[],
): Promise<void> {
  // Optimistic update
  await globalMutate(
    PIPELINE_KEY,
    (current: PipelineItem[] | undefined) => {
      if (!current) return current;
      return optimisticUpdate
        ? optimisticUpdate(current)
        : current.map((item) => (item.id === itemId ? { ...item, stage } : item));
    },
    false,
  );

  // Persist to server
  const res = await fetch(`/api/pipeline/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage }),
  });

  if (!res.ok) {
    // Revert on failure
    await globalMutate(PIPELINE_KEY);
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  // Revalidate to sync server truth
  await globalMutate(PIPELINE_KEY);
}

/** Remove an item from the pipeline. */
export async function removeFromPipeline(itemId: number): Promise<void> {
  // Optimistic remove
  await globalMutate(
    PIPELINE_KEY,
    (current: PipelineItem[] | undefined) => (current ?? []).filter((i) => i.id !== itemId),
    false,
  );

  const res = await fetch(`/api/pipeline/${itemId}`, { method: 'DELETE' });
  if (!res.ok) {
    await globalMutate(PIPELINE_KEY);
    throw new Error(`HTTP ${res.status}`);
  }
  await globalMutate(PIPELINE_KEY);
}

/** Append a note to a pipeline item. */
export async function addNote(itemId: number, text: string): Promise<PipelineNote[]> {
  const res = await fetch(`/api/pipeline/${itemId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const notes = await res.json() as PipelineNote[];
  await globalMutate(PIPELINE_KEY);
  return notes;
}

// ---- Formatting helpers ----

export function formatValueCents(cents: number | null | undefined): string {
  if (!cents) return '—';
  const d = cents / 100;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(1)}M`;
  if (d >= 1_000) return `$${(d / 1_000).toFixed(0)}K`;
  return `$${d.toLocaleString()}`;
}

export function daysUntilDeadline(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
