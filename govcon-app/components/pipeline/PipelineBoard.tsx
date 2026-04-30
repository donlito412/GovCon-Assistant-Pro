'use client';

import React, { useState, useCallback } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { Loader2, AlertCircle, KanbanSquare } from 'lucide-react';
import { PipelineColumn } from './PipelineColumn';
import { PipelineCardDetail } from './PipelineCardDetail';
import {
  usePipeline,
  moveStage,
  formatValueCents,
  PIPELINE_STAGES,
  type PipelineItem,
  type PipelineStage,
} from '@/lib/api/pipeline';

// ============================================================
// PIPELINE BOARD
// Full Kanban board with DnD, optimistic updates, slide-out detail.
// ============================================================

export function PipelineBoard() {
  const { byStage, valueByStage, totalValueCents, isLoading, error } = usePipeline();
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, destination, source } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      const itemId = parseInt(draggableId, 10);
      const newStage = destination.droppableId as PipelineStage;

      setDragError(null);

      try {
        await moveStage(itemId, newStage);
      } catch (err) {
        setDragError(err instanceof Error ? err.message : 'Failed to move card');
        // SWR will auto-revalidate and revert
      }
    },
    [],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-500">Loading pipeline…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">Failed to load pipeline: {error.message}</span>
      </div>
    );
  }

  const totalItems = PIPELINE_STAGES.reduce((sum, s) => sum + byStage[s].length, 0);

  if (totalItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
          <KanbanSquare className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Your pipeline is empty</h3>
        <p className="text-sm text-gray-500 max-w-sm mb-4">
          Browse contracts and click <strong>Add to Pipeline</strong> to start tracking opportunities.
        </p>
        <a
          href="/contracts"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
        >
          Browse Contracts
        </a>
      </div>
    );
  }

  return (
    <>
      {/* Summary header */}
      <div className="flex items-center gap-6 mb-4 px-1 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <KanbanSquare className="w-4 h-4 text-blue-600" />
          <span><strong className="text-gray-900">{totalItems}</strong> opportunities tracked</span>
        </div>
        {totalValueCents > 0 && (
          <div className="text-sm text-gray-600">
            <strong className="text-gray-900">{formatValueCents(totalValueCents)}</strong> total pipeline value
          </div>
        )}
        {dragError && (
          <div className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {dragError} — card reverted
          </div>
        )}
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              items={byStage[stage]}
              totalValueCents={valueByStage[stage]}
              onCardClick={setSelectedItem}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Slide-out detail panel */}
      {selectedItem && (
        <PipelineCardDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onRemoved={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}
