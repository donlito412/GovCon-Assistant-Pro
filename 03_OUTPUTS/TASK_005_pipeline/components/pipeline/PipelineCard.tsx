'use client';

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Building2, DollarSign, AlertTriangle, Clock, StickyNote } from 'lucide-react';
import {
  formatValueCents,
  daysUntilDeadline,
  STAGE_COLORS,
  type PipelineItem,
  type PipelineStage,
} from '../../lib/api/pipeline';

// ============================================================
// PIPELINE CARD
// Draggable card displayed in each Kanban column.
// Shows: title, agency, deadline countdown, value, source badge.
// Click → opens slide-out PipelineCardDetail.
// ============================================================

function sourceDotColor(source: string): string {
  if (source.startsWith('federal_')) return 'bg-blue-500';
  if (source.startsWith('state_')) return 'bg-purple-500';
  if (source.startsWith('local_')) return 'bg-green-500';
  if (source.startsWith('education_')) return 'bg-orange-500';
  return 'bg-gray-400';
}

function sourceShortLabel(source: string): string {
  if (source.startsWith('federal_')) return 'Federal';
  if (source === 'state_pa_emarketplace') return 'PA eMkt';
  if (source === 'state_pa_treasury') return 'PA Treasury';
  if (source.startsWith('state_')) return 'PA State';
  if (source === 'local_allegheny') return 'Allegheny Co.';
  if (source === 'local_pittsburgh') return 'Pittsburgh';
  if (source.startsWith('local_')) return 'Local';
  if (source.startsWith('education_')) return 'Education';
  return 'Other';
}

interface PipelineCardProps {
  item: PipelineItem;
  index: number;
  stage: PipelineStage;
  onClick: (item: PipelineItem) => void;
}

export function PipelineCard({ item, index, stage, onClick }: PipelineCardProps) {
  const opp = item.opportunity;
  const days = daysUntilDeadline(opp?.deadline);
  const noteCount = item.notes_json?.length ?? 0;
  const colors = STAGE_COLORS[stage];

  let deadlineDisplay: React.ReactNode = null;
  if (days !== null) {
    let cls = 'text-green-600';
    let Icon = Clock;
    if (days < 0) { cls = 'text-gray-400'; Icon = Clock; }
    else if (days < 7) { cls = 'text-red-600 font-semibold'; Icon = AlertTriangle; }
    else if (days < 14) { cls = 'text-yellow-600'; Icon = Clock; }

    deadlineDisplay = (
      <span className={`flex items-center gap-1 text-xs ${cls}`}>
        <Icon className="w-3 h-3 flex-shrink-0" />
        {days < 0 ? 'Overdue' : days === 0 ? 'Due today' : `${days}d left`}
      </span>
    );
  }

  return (
    <Draggable draggableId={String(item.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(item)}
          className={`rounded-lg border p-3 cursor-pointer select-none transition-shadow
            ${snapshot.isDragging
              ? 'shadow-xl rotate-1 bg-white border-blue-300 ring-2 ring-blue-200'
              : `bg-white border-gray-200 hover:border-blue-200 hover:shadow-md`
            }`}
        >
          {/* Source dot + label */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sourceDotColor(opp?.source ?? '')}`} />
            <span className="text-xs text-gray-500 font-medium">{sourceShortLabel(opp?.source ?? '')}</span>
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-2">
            {opp?.title ?? '(Unknown)'}
          </p>

          {/* Agency */}
          {opp?.agency_name && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mb-2 line-clamp-1">
              <Building2 className="w-3 h-3 flex-shrink-0" />
              {opp.agency_name}
            </p>
          )}

          {/* Value + deadline row */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
              {(opp?.value_max ?? opp?.value_min) ? (
                <>
                  <DollarSign className="w-3 h-3 text-green-600" />
                  {formatValueCents(opp?.value_max ?? opp?.value_min)}
                </>
              ) : (
                <span className="text-gray-400">No value</span>
              )}
            </div>
            {deadlineDisplay}
          </div>

          {/* Notes badge */}
          {noteCount > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
              <StickyNote className="w-3 h-3" />
              {noteCount} note{noteCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
