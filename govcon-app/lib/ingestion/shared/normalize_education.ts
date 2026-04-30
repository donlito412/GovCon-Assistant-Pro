// ============================================================
// SHARED NORMALIZATION — EDUCATION SCRAPERS (TASK_011)
// Re-exports all utilities from TASK_003's normalize_shared.ts
// and adds education-specific helpers (keyword NAICS inference,
// category field, education-typed ScrapedOpportunity).
// ============================================================

export {
  computeDedupHash,
  deriveThresholdCategory,
  mapContractType,
  mapSetAside,
  parseDollarString,
  dollarsToCents,
  parseToIso,
  NAICS_SECTOR_MAP,
  getNaicsSector,
} from '../../../../../03_OUTPUTS/TASK_003_state_local_ingestion/lib/ingestion/shared/normalize_shared';

import type { OpportunitySource, ContractType, ThresholdCategory, SetAside } from '../../../../../03_OUTPUTS/TASK_001_scaffold/lib/types';

// ============================================================
// KEYWORD-BASED NAICS SECTOR INFERENCE
// Used when the institution doesn't supply a NAICS code.
// ============================================================

const KEYWORD_NAICS: Array<{ patterns: RegExp; sector: string }> = [
  { patterns: /IT|software|tech|cyber|network|cloud|data|digital|computer|SaaS|ERP/i,            sector: 'Information Technology' },
  { patterns: /construction|renovation|repair|facility|HVAC|electrical|plumbing|building|roofing/i, sector: 'Construction' },
  { patterns: /food|catering|dining|beverage|cafeteria|vending/i,                                 sector: 'Food & Hospitality' },
  { patterns: /security|guard|surveillance|access control/i,                                      sector: 'Administrative Services' },
  { patterns: /janitorial|custodial|cleaning|waste|recycling/i,                                   sector: 'Administrative Services' },
  { patterns: /consulting|management|professional|advisory|strategy/i,                            sector: 'Professional Services' },
  { patterns: /audit|accounting|financial|insurance|banking/i,                                    sector: 'Finance & Insurance' },
  { patterns: /healthcare|medical|dental|pharmacy|nurse|health/i,                                 sector: 'Healthcare' },
  { patterns: /printing|publication|marketing|advertising|media/i,                                sector: 'Information Technology' },
  { patterns: /transportation|logistics|delivery|shuttle|fleet/i,                                 sector: 'Transportation' },
  { patterns: /legal|attorney|law firm|compliance/i,                                              sector: 'Professional Services' },
  { patterns: /landscape|grounds|lawn|tree|snow removal/i,                                        sector: 'Administrative Services' },
  { patterns: /research|laboratory|lab|scientific|testing/i,                                      sector: 'Professional Services' },
  { patterns: /energy|solar|utilities|electric|gas/i,                                             sector: 'Utilities' },
  { patterns: /training|learning|education|curriculum/i,                                          sector: 'Education & Training' },
];

export function inferNaicsSectorFromKeywords(text: string): string | undefined {
  for (const { patterns, sector } of KEYWORD_NAICS) {
    if (patterns.test(text)) return sector;
  }
  return undefined;
}

// ============================================================
// EDUCATION-EXTENDED SCRAPED OPPORTUNITY TYPE
// Adds `category: 'education'` to the base ScrapedOpportunity
// ============================================================

export interface ScrapedOpportunity {
  source: OpportunitySource;
  title: string;
  agency_name: string;
  solicitation_number?: string;
  dedup_hash: string;
  canonical_sources: OpportunitySource[];
  naics_code?: number;
  naics_sector?: string;
  contract_type: ContractType;
  threshold_category: ThresholdCategory;
  set_aside_type?: SetAside;
  value_min?: number;   // cents
  value_max?: number;   // cents
  deadline?: string;    // ISO
  posted_date?: string; // ISO
  place_of_performance_city?: string;
  place_of_performance_state?: string;
  place_of_performance_zip?: string;
  description?: string;
  url?: string;
  status: 'active' | 'closed' | 'awarded' | 'cancelled';
  category: 'education';
}

export interface ScraperResult {
  source: OpportunitySource;
  opportunities: ScrapedOpportunity[];
  errors: string[];
  durationMs: number;
}
