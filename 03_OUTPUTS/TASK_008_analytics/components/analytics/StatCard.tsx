'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

// ============================================================
// STAT CARD — KPI metric tile
// ============================================================

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { direction: 'up' | 'down' | 'neutral'; label: string };
  urgent?: boolean;
}

export function StatCard({
  label, value, subtext, icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-100',
  trend,
  urgent = false,
}: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4 transition
      ${urgent ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200 hover:shadow-md'}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
        <p className={`text-2xl font-bold leading-tight ${urgent ? 'text-red-600' : 'text-gray-900'}`}>
          {value}
        </p>
        {subtext && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{subtext}</p>}
        {trend && (
          <p className={`text-xs font-medium mt-1 ${
            trend.direction === 'up' ? 'text-green-600' :
            trend.direction === 'down' ? 'text-red-500' : 'text-gray-400'
          }`}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
