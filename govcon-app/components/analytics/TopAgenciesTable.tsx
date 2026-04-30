'use client';

import React from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { fmt, type AgencyStat } from '@/lib/api/analytics';

// ============================================================
// TOP AGENCIES TABLE — top 10 by active opportunity count
// ============================================================

interface Props {
  data: AgencyStat[];
}

export function TopAgenciesTable({ data }: Props) {
  if (!data.length) {
    return <p className="text-center text-sm text-gray-400 py-6">No agency data</p>;
  }

  const maxCount = data[0]?.count ?? 1;

  return (
    <div className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            <th className="text-left pb-2 font-semibold">#</th>
            <th className="text-left pb-2 font-semibold">Agency</th>
            <th className="text-right pb-2 font-semibold">Active</th>
            <th className="text-right pb-2 font-semibold">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((agency, i) => (
            <tr key={agency.name} className="group hover:bg-gray-50 transition">
              <td className="py-2.5 pr-2 text-xs text-gray-400 font-medium">{i + 1}</td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Building2 className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  <Link
                    href={`/contracts?agency=${encodeURIComponent(agency.name)}`}
                    className="text-xs font-medium text-gray-800 group-hover:text-blue-600 transition truncate max-w-[180px]"
                    title={agency.name}
                  >
                    {agency.name}
                  </Link>
                </div>
                {/* Mini progress bar */}
                <div className="mt-1 h-1 bg-gray-100 rounded-full w-full max-w-[160px]">
                  <div
                    className="h-1 bg-blue-400 rounded-full"
                    style={{ width: `${(agency.count / maxCount) * 100}%` }}
                  />
                </div>
              </td>
              <td className="py-2.5 text-right">
                <span className="text-xs font-bold text-blue-700">{agency.count}</span>
              </td>
              <td className="py-2.5 text-right">
                <span className="text-xs font-medium text-green-700">{fmt(agency.totalCents)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
