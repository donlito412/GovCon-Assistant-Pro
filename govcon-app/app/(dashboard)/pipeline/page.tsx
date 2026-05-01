'use client';
export const dynamic = 'force-dynamic';


import React from 'react';
import { KanbanSquare, Plus } from 'lucide-react';
import Link from 'next/link';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';

// ============================================================
// PIPELINE PAGE — /pipeline
// Renders the full Kanban board.
// Client component — all data via SWR in PipelineBoard.
// ============================================================

export default function PipelinePage() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <KanbanSquare className="w-6 h-6 text-blue-600" />
            Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track opportunities from discovery through award. Drag cards between stages.
          </p>
        </div>
        <Link
          href="/contracts"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Add Opportunity
        </Link>
      </div>

      {/* Board */}
      <PipelineBoard />
    </div>
  );
}
