'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { EventFilters } from '../../lib/api/events';

// ============================================================
// EVENT FILTER PANEL — sidebar filter controls
// ============================================================

const EVENT_TYPES = [
  { value: 'city_council',   label: 'City Council' },
  { value: 'planning',       label: 'City Planning' },
  { value: 'ura',            label: 'URA Board' },
  { value: 'county_council', label: 'County Council' },
  { value: 'networking',     label: 'Networking' },
  { value: 'conference',     label: 'Conference' },
  { value: 'workshop',       label: 'Workshop' },
];

const WHY_RELEVANT_OPTIONS = [
  { value: 'contracts_announced', label: '📋 Contracts' },
  { value: 'grants_discussed',    label: '💰 Grants' },
  { value: 'networking',          label: '🤝 Networking' },
  { value: 'development_plans',   label: '🏗️ Development' },
  { value: 'budget_decisions',    label: '💼 Budget' },
];

interface Props {
  filters: EventFilters;
  onChange: (f: EventFilters) => void;
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

export function EventFilterPanel({ filters, onChange }: Props) {
  const hasFilters = !!(
    filters.event_type || filters.why_relevant || filters.is_virtual !== undefined ||
    filters.is_free !== undefined || filters.date_from || filters.date_to || filters.source
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Filters</h2>
        {hasFilters && (
          <button
            onClick={() => onChange({})}
            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Date range */}
      <FilterSection title="Date Range">
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">From</label>
            <input
              type="date"
              value={filters.date_from ?? ''}
              onChange={(e) => onChange({ ...filters, date_from: e.target.value || undefined, page: 0 })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">To</label>
            <input
              type="date"
              value={filters.date_to ?? ''}
              onChange={(e) => onChange({ ...filters, date_to: e.target.value || undefined, page: 0 })}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </FilterSection>

      {/* Event type */}
      <FilterSection title="Event Type">
        {EVENT_TYPES.map((t) => (
          <CheckOption
            key={t.value}
            label={t.label}
            checked={filters.event_type === t.value}
            onChange={() => onChange({ ...filters, event_type: filters.event_type === t.value ? undefined : t.value, page: 0 })}
          />
        ))}
      </FilterSection>

      {/* Why relevant */}
      <FilterSection title="Relevance">
        {WHY_RELEVANT_OPTIONS.map((r) => (
          <CheckOption
            key={r.value}
            label={r.label}
            checked={filters.why_relevant === r.value}
            onChange={() => onChange({ ...filters, why_relevant: filters.why_relevant === r.value ? undefined : r.value, page: 0 })}
          />
        ))}
      </FilterSection>

      {/* Virtual / In-person */}
      <FilterSection title="Format">
        <CheckOption
          label="Virtual only"
          checked={filters.is_virtual === true}
          onChange={() => onChange({ ...filters, is_virtual: filters.is_virtual === true ? undefined : true, page: 0 })}
        />
        <CheckOption
          label="In-person only"
          checked={filters.is_virtual === false}
          onChange={() => onChange({ ...filters, is_virtual: filters.is_virtual === false ? undefined : false, page: 0 })}
        />
      </FilterSection>

      {/* Free / Paid */}
      <FilterSection title="Cost">
        <CheckOption
          label="Free events only"
          checked={filters.is_free === true}
          onChange={() => onChange({ ...filters, is_free: filters.is_free === true ? undefined : true, page: 0 })}
        />
      </FilterSection>
    </div>
  );
}
