'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { GrantFilters } from '@/lib/api/grants';

// ============================================================
// GRANT FILTER PANEL — sidebar filter controls
// ============================================================

const CATEGORIES = [
  { value: 'federal',    label: 'Federal' },
  { value: 'state',      label: 'State (PA)' },
  { value: 'local',      label: 'Local (Pittsburgh)' },
];

const GRANT_TYPES = [
  { value: 'grant',      label: 'Grant' },
  { value: 'loan',       label: 'Loan / Lending' },
  { value: 'tax_credit', label: 'Tax Credit' },
  { value: 'rebate',     label: 'Rebate' },
];

const ELIGIBILITY = [
  { value: 'small_business', label: 'Small Business' },
  { value: 'nonprofit',      label: 'Nonprofit' },
  { value: 'individual',     label: 'Individual' },
  { value: 'municipality',   label: 'Municipality' },
];

const SORT_OPTIONS = [
  { value: 'deadline_asc', label: 'Deadline (soonest)' },
  { value: 'amount_desc',  label: 'Amount (largest)' },
  { value: 'recent',       label: 'Recently added' },
];

interface Props {
  filters: GrantFilters;
  onChange: (f: GrantFilters) => void;
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 pb-4 mb-4 last:border-0 last:mb-0">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
      {children}
    </div>
  );
}

function CheckOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900 py-0.5">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-blue-600 w-3.5 h-3.5" />
      {label}
    </label>
  );
}

export function GrantFilterPanel({ filters, onChange }: Props) {
  const hasFilters = !!(filters.category || filters.grant_type || filters.eligible_entity ||
    filters.min_amount || filters.max_amount || filters.deadline_after || filters.deadline_before);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Filters</h2>
        {hasFilters && (
          <button
            onClick={() => onChange({ sort: filters.sort })}
            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Sort */}
      <FilterSection title="Sort by">
        <select
          value={filters.sort ?? 'deadline_asc'}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as GrantFilters['sort'], page: 0 })}
          className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FilterSection>

      {/* Category */}
      <FilterSection title="Source">
        {CATEGORIES.map((cat) => (
          <CheckOption
            key={cat.value}
            label={cat.label}
            checked={filters.category === cat.value}
            onChange={() => onChange({ ...filters, category: filters.category === cat.value ? undefined : cat.value, page: 0 })}
          />
        ))}
      </FilterSection>

      {/* Type */}
      <FilterSection title="Funding Type">
        {GRANT_TYPES.map((t) => (
          <CheckOption
            key={t.value}
            label={t.label}
            checked={filters.grant_type === t.value}
            onChange={() => onChange({ ...filters, grant_type: filters.grant_type === t.value ? undefined : t.value, page: 0 })}
          />
        ))}
      </FilterSection>

      {/* Eligibility */}
      <FilterSection title="Eligible Applicants">
        {ELIGIBILITY.map((e) => (
          <CheckOption
            key={e.value}
            label={e.label}
            checked={filters.eligible_entity === e.value}
            onChange={() => onChange({ ...filters, eligible_entity: filters.eligible_entity === e.value ? undefined : e.value, page: 0 })}
          />
        ))}
      </FilterSection>

      {/* Amount range */}
      <FilterSection title="Award Amount">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min $"
            value={filters.min_amount ? filters.min_amount / 100 : ''}
            onChange={(e) => onChange({ ...filters, min_amount: e.target.value ? parseInt(e.target.value) * 100 : undefined, page: 0 })}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="number"
            placeholder="Max $"
            value={filters.max_amount ? filters.max_amount / 100 : ''}
            onChange={(e) => onChange({ ...filters, max_amount: e.target.value ? parseInt(e.target.value) * 100 : undefined, page: 0 })}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </FilterSection>

      {/* Deadline range */}
      <FilterSection title="Deadline">
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">After</label>
            <input
              type="date"
              value={filters.deadline_after?.slice(0, 10) ?? ''}
              onChange={(e) => onChange({ ...filters, deadline_after: e.target.value || undefined, page: 0 })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Before</label>
            <input
              type="date"
              value={filters.deadline_before?.slice(0, 10) ?? ''}
              onChange={(e) => onChange({ ...filters, deadline_before: e.target.value || undefined, page: 0 })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </FilterSection>
    </div>
  );
}
