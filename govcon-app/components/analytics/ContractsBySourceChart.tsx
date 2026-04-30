'use client';

import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { SourceBreakdown } from '@/lib/api/analytics';

// ============================================================
// CONTRACTS BY SOURCE — Donut chart (Federal / State / Local / Education)
// ============================================================

const COLORS: Record<string, string> = {
  Federal:   '#3b82f6',
  State:     '#8b5cf6',
  Local:     '#10b981',
  Education: '#f59e0b',
  Other:     '#94a3b8',
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800">{name}</p>
      <p className="text-gray-600">{value} opportunities</p>
    </div>
  );
}

interface Props {
  data: SourceBreakdown[];
}

export function ContractsBySourceChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (!data.length) {
    return <p className="text-center text-sm text-gray-400 py-8">No data</p>;
  }

  const chartData = data.map((d) => ({ name: d.group, value: d.count }));

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2 text-center">{total} active opportunities</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] ?? '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
