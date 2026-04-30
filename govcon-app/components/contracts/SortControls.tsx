'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ArrowUpDown } from 'lucide-react';
import { updateSearchParam } from '../../lib/api/contracts';

// ============================================================
// SORT CONTROLS
// Dropdown to change sort field + direction.
// Persists selection in URL ?sort= param.
// ============================================================

const SORT_OPTIONS = [
  { value: 'deadline:asc',        label: 'Deadline: Soonest First' },
  { value: 'deadline:desc',       label: 'Deadline: Latest First' },
  { value: 'posted_date:desc',    label: 'Posted: Newest First' },
  { value: 'posted_date:asc',     label: 'Posted: Oldest First' },
  { value: 'value_max:desc',      label: 'Value: Highest First' },
  { value: 'value_max:asc',       label: 'Value: Lowest First' },
  { value: 'title:asc',           label: 'Title: A → Z' },
  { value: 'title:desc',          label: 'Title: Z → A' },
  { value: 'agency_name:asc',     label: 'Agency: A → Z' },
];

interface SortControlsProps {
  className?: string;
}

export function SortControls({ className = '' }: SortControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const current = searchParams.get('sort') ?? 'deadline:asc';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const qs = updateSearchParam(new URLSearchParams(searchParams.toString()), {
      sort: e.target.value,
      page: '1',
    });
    startTransition(() => {
      router.push(`${pathname}?${qs}`);
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <ArrowUpDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <select
        value={current}
        onChange={handleChange}
        className="text-sm border border-gray-300 rounded-lg py-2 pl-3 pr-8 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        aria-label="Sort contracts"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
