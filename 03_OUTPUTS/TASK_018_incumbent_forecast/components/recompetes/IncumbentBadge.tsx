'use client';

import React from 'react';
import { Building2, CheckCircle2, ExternalLink } from 'lucide-react';

// ============================================================
// INCUMBENT BADGE — shows current contract holder
// ============================================================

interface Props {
  name:  string;
  uei?:  string | null;
  small?: boolean;
}

export function IncumbentBadge({ name, uei, small }: Props) {
  const samLink = uei
    ? `https://sam.gov/entity/${uei}`
    : `https://sam.gov/content/entity-information?text=${encodeURIComponent(name)}`;

  if (small) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
        <Building2 className="w-3 h-3 text-gray-400" />
        <span className="font-medium truncate max-w-[180px]">{name}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-4 h-4 text-amber-600" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Current Incumbent</p>
        <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
        {uei && <p className="text-[10px] text-gray-400 font-mono">{uei}</p>}
      </div>
      <a
        href={samLink}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto text-amber-500 hover:text-amber-700 flex-shrink-0"
        title="View on SAM.gov"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
