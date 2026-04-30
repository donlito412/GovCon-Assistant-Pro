'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { fmt, type PipelineStageStat } from '@/lib/api/analytics';

// ============================================================
// PIPELINE VALUE CHART — Bar chart, $ value per stage
// ============================================================

const STAGE_COLORS: Record<string, string> = {
  Identified:           '#94a3b8',
  Qualifying:           '#3b82f6',
  Pursuing:             '#6366f1',
  Proposal_In_Progress: '#8b5cf6',
  Submitted:            '#f59e0b',
  Won:                  '#10b981',
  Lost:                 '#ef4444',
  No_Bid:               '#d1d5db',
};

const STAGE_LABELS: Record<string, string> = {
  Identified:           'ID\'d',
  Qualifying:           'Qualifying',
  Pursuing:             'Pursuing',
  Proposal_In_Progress: 'Proposal',
  Submitted:            'Submitted',
  Won:                  'Won',
  Lost:                 'Lost',
  No_Bid:               'No Bid',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PipelineStageStat;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      <p className="text-green-700 font-bold">{fmt(d.totalCents)}</p>
      <p className="text-gray-500">{d.count} opportunit{d.count !== 1 ? 'ies' : 'y'}</p>
    </div>
  );
}

function fmtAxis(cents: number): string {
  if (cents >= 100_000_000_000) return `$${(cents / 100_000_000_000).toFixed(0)}B`;
  if (cents >= 100_000_000) return `$${(cents / 100_000_000).toFixed(0)}M`;
  if (cents >= 100_000) return `$${(cents / 100_000).toFixed(0)}K`;
  return `$${cents}`;
}

interface Props {
  data: PipelineStageStat[];
}

export function PipelineValueChart({ data }: Props) {
  const nonEmpty = data.filter((d) => d.count > 0);

  if (!nonEmpty.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-gray-400">Pipeline is empty.</p>
        <a href="/contracts" className="text-xs text-blue-500 hover:underline mt-1">Add opportunities →</a>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: STAGE_LABELS[d.stage] ?? d.stage,
  }));

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Pipeline value ($) by stage</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtAxis}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="totalCents" radius={[4, 4, 0, 0]} name="Value">
            {chartData.map((entry) => (
              <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
