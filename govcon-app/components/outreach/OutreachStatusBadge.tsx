'use client';

import React from 'react';
import { STATUS_LABELS, STATUS_COLORS, type OutreachStatus } from '@/lib/api/outreach';

interface Props {
  status: OutreachStatus;
  size?: 'sm' | 'md';
}

export function OutreachStatusBadge({ status, size = 'md' }: Props) {
  const color = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500';
  const px = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${color} ${px}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
