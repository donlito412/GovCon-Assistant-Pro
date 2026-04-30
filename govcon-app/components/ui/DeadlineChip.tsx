'use client';

import React from 'react';
import { formatDistanceToNowStrict, isPast, differenceInDays } from 'date-fns';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

// ============================================================
// DEADLINE CHIP
// Color-coded deadline display:
//   Red    — due in < 7 days (or overdue)
//   Yellow — due in 7–14 days
//   Green  — due in > 14 days
//   Gray   — no deadline
// ============================================================

interface DeadlineChipProps {
  deadline: string | null | undefined;
  className?: string;
}

export function DeadlineChip({ deadline, className = '' }: DeadlineChipProps) {
  if (!deadline) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-gray-400 ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        No deadline
      </span>
    );
  }

  const date = new Date(deadline);
  const isOverdue = isPast(date);
  const daysUntil = differenceInDays(date, new Date());

  let colorClass: string;
  let Icon: React.ElementType;

  if (isOverdue || daysUntil < 7) {
    colorClass = 'text-red-700 bg-red-50 border border-red-200';
    Icon = AlertTriangle;
  } else if (daysUntil < 14) {
    colorClass = 'text-yellow-700 bg-yellow-50 border border-yellow-200';
    Icon = Clock;
  } else {
    colorClass = 'text-green-700 bg-green-50 border border-green-200';
    Icon = CheckCircle;
  }

  const label = isOverdue
    ? `Closed ${formatDistanceToNowStrict(date, { addSuffix: true })}`
    : `Due ${formatDistanceToNowStrict(date, { addSuffix: true })}`;

  const fullDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <span
      title={fullDate}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${colorClass} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {label}
    </span>
  );
}
