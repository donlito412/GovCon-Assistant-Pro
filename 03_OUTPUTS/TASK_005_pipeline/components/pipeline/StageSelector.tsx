'use client';

import React, { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { PIPELINE_STAGES, STAGE_LABELS, STAGE_COLORS, moveStage, type PipelineStage } from '../../lib/api/pipeline';

// ============================================================
// STAGE SELECTOR
// Dropdown to move a pipeline item between stages.
// Triggers optimistic update + persists to Supabase.
// ============================================================

interface StageSelectorProps {
  itemId: number;
  currentStage: PipelineStage;
  onStageChange?: (stage: PipelineStage) => void;
  size?: 'sm' | 'md';
}

export function StageSelector({ itemId, currentStage, onStageChange, size = 'md' }: StageSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = STAGE_COLORS[currentStage];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-2';

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const stage = e.target.value as PipelineStage;
    if (stage === currentStage) return;
    setLoading(true);
    setError(null);
    try {
      await moveStage(itemId, stage);
      onStageChange?.(stage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stage');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <select
          value={currentStage}
          onChange={handleChange}
          disabled={loading}
          className={`appearance-none w-full ${sizeClass} pr-8 rounded-lg border font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-60 ${colors.bg} ${colors.text} ${colors.border}`}
          aria-label="Change pipeline stage"
        >
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin opacity-60" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
