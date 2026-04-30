'use client';

import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { WeeklyVolume } from '@/lib/api/analytics';

// ============================================================
// CONTRACT VOLUME OVER TIME — Line chart, new per week (12 weeks)
// ============================================================

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">Week of {label}</p>
      <p className="text-blue-600"><strong>{payload[0].value}</strong> new contracts</p>
    </div>
  );
}

interface Props {
  data: WeeklyVolume[];
}

export function ContractVolumeChart({ data }: Props) {
  const avg = data.length ? Math.round(data.reduce((s, d) => s + d.count, 0) / data.length) : 0;

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">New contracts posted per week · last 12 weeks</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {avg > 0 && (
            <ReferenceLine
              y={avg}
              stroke="#e5e7eb"
              strokeDasharray="4 2"
              label={{ value: `avg ${avg}`, fill: '#9ca3af', fontSize: 10, position: 'right' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
