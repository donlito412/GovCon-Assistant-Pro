'use client';

import React from 'react';

// ============================================================
// BADGE COMPONENT
// Used for: source labels, contract types, set-aside types, status
// ============================================================

export type BadgeVariant =
  | 'federal'
  | 'state'
  | 'local'
  | 'education'
  | 'rfp'
  | 'rfq'
  | 'rfi'
  | 'ifb'
  | 'idiq'
  | 'bpa'
  | 'sources_sought'
  | 'other_type'
  | 'active'
  | 'closed'
  | 'awarded'
  | 'cancelled'
  | 'small_biz'
  | 'set_aside'
  | 'micro'
  | 'simplified'
  | 'large'
  | 'unknown_threshold'
  | 'neutral';

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  federal:           'bg-blue-100 text-blue-800 border-blue-200',
  state:             'bg-purple-100 text-purple-800 border-purple-200',
  local:             'bg-green-100 text-green-800 border-green-200',
  education:         'bg-orange-100 text-orange-800 border-orange-200',
  rfp:               'bg-indigo-100 text-indigo-800 border-indigo-200',
  rfq:               'bg-sky-100 text-sky-800 border-sky-200',
  rfi:               'bg-violet-100 text-violet-800 border-violet-200',
  ifb:               'bg-teal-100 text-teal-800 border-teal-200',
  idiq:              'bg-cyan-100 text-cyan-800 border-cyan-200',
  bpa:               'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  sources_sought:    'bg-amber-100 text-amber-800 border-amber-200',
  other_type:        'bg-gray-100 text-gray-700 border-gray-200',
  active:            'bg-emerald-100 text-emerald-800 border-emerald-200',
  closed:            'bg-gray-100 text-gray-600 border-gray-200',
  awarded:           'bg-blue-100 text-blue-700 border-blue-200',
  cancelled:         'bg-red-100 text-red-700 border-red-200',
  small_biz:         'bg-green-100 text-green-800 border-green-200',
  set_aside:         'bg-yellow-100 text-yellow-800 border-yellow-200',
  micro:             'bg-lime-100 text-lime-800 border-lime-200',
  simplified:        'bg-blue-100 text-blue-700 border-blue-200',
  large:             'bg-indigo-100 text-indigo-800 border-indigo-200',
  unknown_threshold: 'bg-gray-100 text-gray-500 border-gray-200',
  neutral:           'bg-gray-100 text-gray-700 border-gray-200',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${VARIANT_STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// ---- Source badge helpers ----

type OpportunitySource = string;

export function sourceBadgeVariant(source: OpportunitySource): BadgeVariant {
  if (source.startsWith('federal_')) return 'federal';
  if (source.startsWith('state_')) return 'state';
  if (source.startsWith('local_')) return 'local';
  if (source.startsWith('education_')) return 'education';
  return 'neutral';
}

export function sourceLabel(source: OpportunitySource): string {
  const map: Record<string, string> = {
    federal_samgov:           'Federal · SAM.gov',
    federal_samgov_forecast:  'Federal · Forecast',
    federal_usaspending:      'Federal · USASpending',
    state_pa_emarketplace:    'PA · eMarketplace',
    state_pa_treasury:        'PA · Treasury',
    state_pa_bulletin:        'PA · Bulletin',
    state_pa_dced:            'PA · DCED',
    local_allegheny:          'Local · Allegheny Co.',
    local_allegheny_publicworks: 'Local · Allegheny Public Works',
    local_pittsburgh:         'Local · Pittsburgh',
    local_ura:                'Local · URA',
    local_bidnet:             'Local · BidNet',
    education_pitt:           'Education · Pitt',
    education_cmu:            'Education · CMU',
    education_ccac:           'Education · CCAC',
    education_pgh_schools:    'Education · PGH Schools',
    education_duquesne:       'Education · Duquesne',
  };
  return map[source] ?? source;
}

export function contractTypeBadgeVariant(type: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    RFP: 'rfp', RFQ: 'rfq', RFI: 'rfi', IFB: 'ifb',
    IDIQ: 'idiq', BPA: 'bpa', Sources_Sought: 'sources_sought',
  };
  return map[type] ?? 'other_type';
}

export function thresholdBadgeVariant(category: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    micro_purchase:         'micro',
    simplified_acquisition: 'simplified',
    large_acquisition:      'large',
    unknown:                'unknown_threshold',
  };
  return map[category] ?? 'unknown_threshold';
}

export function thresholdLabel(category: string): string {
  const map: Record<string, string> = {
    micro_purchase:         'Micro ≤$15K',
    simplified_acquisition: 'SAT $15K–$350K',
    large_acquisition:      'Large >$350K',
    construction_micro:     'Const. Micro',
    construction_sat:       'Const. SAT',
    unknown:                'Value Unknown',
  };
  return map[category] ?? category;
}
