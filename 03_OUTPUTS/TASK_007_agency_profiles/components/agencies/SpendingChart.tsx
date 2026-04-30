'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { type AgencyStats } from '../../lib/api/agencies';

// ============================================================
// SPENDING CHART
// Bar chart of contract type breakdown or NAICS distribution.
// Uses recharts with interactive tooltips.
// ============================================================

interface SpendingChartProps {
  stats: AgencyStats;
}

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  RFP: '#3b82f6',
  RFQ: '#8b5cf6',
  IFB: '#06b6d4',
  RFI: '#f59e0b',
  IDIQ: '#6366f1',
  BPA: '#ec4899',
  Sources_Sought: '#84cc16',
  SBSA: '#14b8a6',
  Other: '#94a3b8',
};

export function SpendingChart({ stats }: SpendingChartProps) {
  const typeData = Object.entries(stats.type_breakdown)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  if (typeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        No contract type data available
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">Number of opportunities by contract type</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={typeData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="type"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
            {typeData.map((entry) => (
              <Cell key={entry.type} fill={TYPE_COLORS[entry.type] ?? '#6366f1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
