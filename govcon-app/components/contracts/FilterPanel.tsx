'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { X, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { updateSearchParam } from '../../lib/api/contracts';

// ============================================================
// FILTER PANEL
// Sidebar panel with all filter controls.
// All state persisted in URL query params.
// ============================================================

// ---- Filter config data ----

const SOURCE_GROUPS = [
  {
    label: 'Federal',
    options: [
      { value: 'federal_samgov', label: 'SAM.gov' },
      { value: 'federal_samgov_forecast', label: 'SAM.gov Forecast' },
      { value: 'federal_usaspending', label: 'USASpending' },
    ],
  },
  {
    label: 'Pennsylvania State',
    options: [
      { value: 'state_pa_emarketplace', label: 'PA eMarketplace' },
      { value: 'state_pa_treasury', label: 'PA Treasury' },
      { value: 'state_pa_bulletin', label: 'PA Bulletin' },
    ],
  },
  {
    label: 'Local',
    options: [
      { value: 'local_allegheny', label: 'Allegheny County' },
      { value: 'local_allegheny_publicworks', label: 'Allegheny Public Works' },
      { value: 'local_pittsburgh', label: 'City of Pittsburgh' },
      { value: 'local_ura', label: 'URA' },
    ],
  },
  {
    label: 'Education',
    options: [
      { value: 'education_pitt', label: 'University of Pittsburgh' },
      { value: 'education_cmu', label: 'Carnegie Mellon' },
      { value: 'education_ccac', label: 'CCAC' },
      { value: 'education_pgh_schools', label: 'PGH Public Schools' },
      { value: 'education_duquesne', label: 'Duquesne University' },
    ],
  },
];

const THRESHOLD_OPTIONS = [
  { value: '', label: 'All Sizes' },
  { value: 'micro_purchase', label: 'Micro-Purchase (≤ $15K)' },
  { value: 'simplified_acquisition', label: 'Simplified Acquisition ($15K–$350K)' },
  { value: 'large_acquisition', label: 'Large Acquisition (> $350K)' },
  { value: 'unknown', label: 'Value Unknown' },
];

const CONTRACT_TYPE_OPTIONS = [
  { value: 'RFP', label: 'RFP — Request for Proposal' },
  { value: 'RFQ', label: 'RFQ — Request for Quotation' },
  { value: 'RFI', label: 'RFI — Request for Information' },
  { value: 'IFB', label: 'IFB — Invitation for Bid' },
  { value: 'IDIQ', label: 'IDIQ' },
  { value: 'BPA', label: 'BPA — Blanket Purchase Agreement' },
  { value: 'Sources_Sought', label: 'Sources Sought' },
  { value: 'SBSA', label: 'Simplified Acquisition' },
  { value: 'Other', label: 'Other' },
];

const NAICS_SECTOR_OPTIONS = [
  { value: 'Information Technology', label: 'Information Technology' },
  { value: 'Construction', label: 'Construction' },
  { value: 'Professional Services', label: 'Professional Services' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Administrative Services', label: 'Administrative Services' },
  { value: 'Transportation', label: 'Transportation' },
  { value: 'Education & Training', label: 'Education & Training' },
  { value: 'Government & Public Admin', label: 'Government & Public Admin' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Finance & Insurance', label: 'Finance & Insurance' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Utilities', label: 'Utilities' },
  { value: 'Other Services', label: 'Other Services' },
];

const SET_ASIDE_OPTIONS = [
  { value: 'total_small_business', label: 'Total Small Business' },
  { value: '8a', label: '8(a)' },
  { value: 'hubzone', label: 'HUBZone' },
  { value: 'sdvosb', label: 'SDVOSB' },
  { value: 'wosb', label: 'WOSB' },
  { value: 'edwosb', label: 'EDWOSB' },
  { value: 'unrestricted', label: 'Unrestricted' },
];

// ---- Collapsible section ----

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-3 text-sm font-semibold text-gray-700 hover:text-blue-600 transition"
        aria-expanded={open}
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="pb-3 space-y-1.5">{children}</div>}
    </div>
  );
}

// ---- Checkbox helper ----

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
      <span className="text-sm text-gray-600 group-hover:text-gray-900">{label}</span>
    </label>
  );
}

// ---- Main component ----

interface FilterPanelProps {
  className?: string;
}

export function FilterPanel({ className = '' }: FilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Parse current filter values from URL
  const selectedSources = new Set((searchParams.get('source') ?? '').split(',').filter(Boolean));
  const selectedTypes = new Set((searchParams.get('contract_type') ?? '').split(',').filter(Boolean));
  const selectedSectors = new Set((searchParams.get('naics_sector') ?? '').split(',').filter(Boolean));
  const selectedSetAsides = new Set((searchParams.get('set_aside') ?? '').split(',').filter(Boolean));
  const selectedThreshold = searchParams.get('threshold') ?? '';
  const minValue = searchParams.get('min_value') ?? '';
  const maxValue = searchParams.get('max_value') ?? '';
  const deadlineAfter = searchParams.get('deadline_after') ?? '';
  const deadlineBefore = searchParams.get('deadline_before') ?? '';

  function applyUpdate(updates: Record<string, string | null>) {
    const qs = updateSearchParam(new URLSearchParams(searchParams.toString()), updates);
    startTransition(() => {
      router.push(`${pathname}?${qs}`);
    });
  }

  function toggleSetValue(param: string, current: Set<string>, value: string, checked: boolean) {
    const next = new Set(current);
    if (checked) next.add(value);
    else next.delete(value);
    applyUpdate({ [param]: next.size > 0 ? [...next].join(',') : null });
  }

  const hasAnyFilter =
    selectedSources.size > 0 ||
    selectedTypes.size > 0 ||
    selectedSectors.size > 0 ||
    selectedSetAsides.size > 0 ||
    selectedThreshold ||
    minValue ||
    maxValue ||
    deadlineAfter ||
    deadlineBefore;

  function clearAll() {
    const qs = updateSearchParam(new URLSearchParams(searchParams.toString()), {
      source: null, contract_type: null, naics_sector: null, set_aside: null,
      threshold: null, min_value: null, max_value: null,
      deadline_after: null, deadline_before: null, page: null,
    });
    startTransition(() => router.push(`${pathname}?${qs}`));
  }

  return (
    <aside className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-bold text-gray-900">Filters</span>
          {hasAnyFilter && (
            <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {[selectedSources.size, selectedTypes.size, selectedSectors.size, selectedSetAsides.size,
                selectedThreshold ? 1 : 0, minValue || maxValue ? 1 : 0,
                deadlineAfter || deadlineBefore ? 1 : 0].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </div>
        {hasAnyFilter && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition"
          >
            <X className="w-3.5 h-3.5" />
            Clear all
          </button>
        )}
      </div>

      <div className="px-4 divide-y divide-gray-100">
        {/* Source */}
        <FilterSection title="Source">
          {SOURCE_GROUPS.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {group.label}
              </p>
              {group.options.map((opt) => (
                <FilterCheckbox
                  key={opt.value}
                  label={opt.label}
                  checked={selectedSources.has(opt.value)}
                  onChange={(checked) => toggleSetValue('source', selectedSources, opt.value, checked)}
                />
              ))}
            </div>
          ))}
        </FilterSection>

        {/* Purchase Threshold */}
        <FilterSection title="Purchase Threshold">
          {THRESHOLD_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="threshold"
                checked={selectedThreshold === opt.value}
                onChange={() => applyUpdate({ threshold: opt.value || null })}
                className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">{opt.label}</span>
            </label>
          ))}
        </FilterSection>

        {/* Contract Type */}
        <FilterSection title="Contract Type" defaultOpen={false}>
          {CONTRACT_TYPE_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              label={opt.label}
              checked={selectedTypes.has(opt.value)}
              onChange={(checked) => toggleSetValue('contract_type', selectedTypes, opt.value, checked)}
            />
          ))}
        </FilterSection>

        {/* NAICS Sector */}
        <FilterSection title="NAICS Sector" defaultOpen={false}>
          {NAICS_SECTOR_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              label={opt.label}
              checked={selectedSectors.has(opt.value)}
              onChange={(checked) => toggleSetValue('naics_sector', selectedSectors, opt.value, checked)}
            />
          ))}
        </FilterSection>

        {/* Set-Aside */}
        <FilterSection title="Set-Aside Type" defaultOpen={false}>
          {SET_ASIDE_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              label={opt.label}
              checked={selectedSetAsides.has(opt.value)}
              onChange={(checked) => toggleSetValue('set_aside', selectedSetAsides, opt.value, checked)}
            />
          ))}
        </FilterSection>

        {/* Dollar Value Range */}
        <FilterSection title="Dollar Value" defaultOpen={false}>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Min Value ($)</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={minValue}
                onChange={(e) => applyUpdate({ min_value: e.target.value || null })}
                placeholder="0"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Max Value ($)</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={maxValue}
                onChange={(e) => applyUpdate({ max_value: e.target.value || null })}
                placeholder="No limit"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </FilterSection>

        {/* Deadline Range */}
        <FilterSection title="Deadline" defaultOpen={false}>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Due After</label>
              <input
                type="date"
                value={deadlineAfter}
                onChange={(e) => applyUpdate({ deadline_after: e.target.value || null })}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Due Before</label>
              <input
                type="date"
                value={deadlineBefore}
                onChange={(e) => applyUpdate({ deadline_before: e.target.value || null })}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </FilterSection>
      </div>
    </aside>
  );
}
