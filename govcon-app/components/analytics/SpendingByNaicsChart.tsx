'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { fmt, type NaicsStat } from '../../lib/api/analytics';

// ============================================================
// SPENDING BY NAICS — Horizontal bar chart, top 10 by $ value
// ============================================================

const BAR_COLORS = [
  '#6366f1','#3b82f6','#06b6d4','#10b981','#84cc16',
  '#f59e0b','#f97316','#ef4444','#ec4899','#8b5cf6',
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as NaicsStat;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs max-w-[200px]">
      <p className="font-semibold text-gray-800 mb-1">{d.sector}</p>
      <p className="text-gray-500">NAICS {d.code}</p>
      <p className="text-green-700 font-bold">{fmt(d.totalCents)}</p>
      <p className="text-gray-500">{d.count} opportunities</p>
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
  data: NaicsStat[];
}

export function SpendingByNaicsChart({ data }: Props) {
  if (!data.length) {
    return <p className="text-center text-sm text-gray-400 py-8">No NAICS data</p>;
  }

  const chartData = data.map((d) => ({
    ...d,
    label: String(d.code),
    shortSector: d.sector.length > 24 ? d.sector.slice(0, 22) + '…' : d.sector,
  }));

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Top 10 NAICS codes by total opportunity value</p>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 30)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 60, bottom: 0, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmtAxis}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="totalCents" radius={[0, 4, 4, 0]} name="Value">
            {chartData.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
