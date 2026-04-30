'use client';

import React from 'react';
import { CheckCircle2, Circle, Clock, Flag, AlertTriangle } from 'lucide-react';

// ============================================================
// RECOMPETE TIMELINE — contract lifecycle visualization
// ============================================================

interface Props {
  awardDate:       string | null;
  endDate:         string | null;
  recompeteDate:   string | null;
}

interface Phase {
  label:    string;
  date:     Date | null;
  icon:     React.ElementType;
  color:    string;
  isPast:   boolean;
  isToday?: boolean;
}

export function RecompeteTimeline({ awardDate, endDate, recompeteDate }: Props) {
  const today = new Date();

  const phases: Phase[] = [
    {
      label:  'Contract Awarded',
      date:   awardDate ? new Date(awardDate) : null,
      icon:   CheckCircle2,
      color:  'text-green-600',
      isPast: awardDate ? new Date(awardDate) <= today : true,
    },
    {
      label:  'Recompete Window Opens',
      date:   recompeteDate ? new Date(recompeteDate) : null,
      icon:   AlertTriangle,
      color:  'text-amber-500',
      isPast: recompeteDate ? new Date(recompeteDate) <= today : false,
    },
    {
      label:  'Contract Expires',
      date:   endDate ? new Date(endDate) : null,
      icon:   Flag,
      color:  'text-red-500',
      isPast: endDate ? new Date(endDate) <= today : false,
    },
  ];

  const totalSpan = phases[2].date && phases[0].date
    ? phases[2].date.getTime() - phases[0].date.getTime()
    : null;

  const progressPct = totalSpan && phases[0].date
    ? Math.max(0, Math.min(100, ((today.getTime() - phases[0].date.getTime()) / totalSpan) * 100))
    : 0;

  const fmtDate = (d: Date | null) => d
    ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'TBD';

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-amber-400 rounded-full transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Phase dots */}
      <div className="flex items-start justify-between gap-1">
        {phases.map((phase, i) => {
          const Icon = phase.icon;
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                phase.isPast ? 'bg-white border-gray-400' : 'bg-gray-50 border-gray-200'
              }`}>
                <Icon className={`w-2.5 h-2.5 ${phase.isPast ? phase.color : 'text-gray-300'}`} />
              </div>
              <span className="text-[9px] font-medium text-gray-500 text-center leading-tight">
                {phase.label}
              </span>
              <span className={`text-[9px] font-bold ${phase.isPast ? 'text-gray-700' : 'text-gray-400'}`}>
                {fmtDate(phase.date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
