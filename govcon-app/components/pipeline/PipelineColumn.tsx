'use client';

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { PipelineCard } from './PipelineCard';
import {
  STAGE_LABELS,
  STAGE_COLORS,
  formatValueCents,
  type PipelineItem,
  type PipelineStage,
} from '../../lib/api/pipeline';

// ============================================================
// PIPELINE COLUMN
// Single Kanban column — droppable + shows card count + $ total
// ============================================================

interface PipelineColumnProps {
  stage: PipelineStage;
  items: PipelineItem[];
  totalValueCents: number;
  onCardClick: (item: PipelineItem) => void;
}

export function PipelineColumn({ stage, items, totalValueCents, onCardClick }: PipelineColumnProps) {
  const colors = STAGE_COLORS[stage];
  const label = STAGE_LABELS[stage];

  return (
    <div className={`flex flex-col rounded-xl border ${colors.border} min-w-[240px] w-[240px] flex-shrink-0`}>
      {/* Column header */}
      <div className={`${colors.header} rounded-t-xl px-3 py-2.5 border-b ${colors.border}`}>
        <div className="flex items-center justify-between mb-1">
          <h3 className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>{label}</h3>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
            {items.length}
          </span>
        </div>
        {totalValueCents > 0 && (
          <p className={`text-xs font-medium ${colors.text} opacity-70`}>
            {formatValueCents(totalValueCents)} tracked
          </p>
        )}
      </div>

      {/* Droppable card list */}
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 space-y-2 min-h-[120px] overflow-y-auto transition-colors rounded-b-xl
              ${snapshot.isDraggingOver ? `${colors.bg} ring-2 ring-inset ${colors.border}` : 'bg-gray-50'}`}
          >
            {items.map((item, index) => (
              <PipelineCard
                key={item.id}
                item={item}
                index={index}
                stage={stage}
                onClick={onCardClick}
              />
            ))}
            {provided.placeholder}

            {items.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-center text-xs text-gray-400 py-6 select-none">
                Drop opportunities here
              </p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
