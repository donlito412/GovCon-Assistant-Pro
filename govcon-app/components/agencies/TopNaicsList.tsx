'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDollars, type NaicsStat } from '@/lib/api/agencies';

// ============================================================
// TOP NAICS LIST
// Horizontal bar chart of NAICS categories this agency buys in,
// ranked by opportunity count. Shows code + sector label + value.
// ============================================================

interface TopNaicsListProps {
  naics: NaicsStat[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload as NaicsStat;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs max-w-[220px]">
      <p className="font-semibold text-gray-800 mb-1">{data.sector}</p>
      <p className="text-gray-600">NAICS: <strong>{data.code}</strong></p>
      <p className="text-blue-600">Opportunities: <strong>{data.count}</strong></p>
      {data.totalCents > 0 && (
        <p className="text-green-600">Value: <strong>{formatDollars(data.totalCents)}</strong></p>
      )}
    </div>
  );
}

export function TopNaicsList({ naics }: TopNaicsListProps) {
  if (!naics.length) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        No NAICS data available
      </div>
    );
  }

  const chartData = naics.map((n) => ({
    ...n,
    label: `${n.code}`,
  }));

  return (
    <div className="space-y-4">
      {/* Horizontal bar chart */}
      <ResponsiveContainer width="100%" height={Math.max(160, naics.length * 32)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Opportunities" />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend table */}
      <div className="overflow-hidden rounded-lg border border-gray-100">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-left">
              <th className="px-3 py-2 font-semibold">NAICS</th>
              <th className="px-3 py-2 font-semibold">Sector</th>
              <th className="px-3 py-2 font-semibold text-right">#</th>
              <th className="px-3 py-2 font-semibold text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {naics.map((n) => (
              <tr key={n.code} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-gray-600">{n.code}</td>
                <td className="px-3 py-2 text-gray-700">{n.sector}</td>
                <td className="px-3 py-2 text-right font-medium text-blue-700">{n.count}</td>
                <td className="px-3 py-2 text-right text-green-700 font-medium">
                  {formatDollars(n.totalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
