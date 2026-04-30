// ============================================================
// SHARED NORMALIZATION UTILITIES
// Used by all state/local scrapers (TASK_003) and federal (TASK_002)
// Handles: dedup_hash, threshold_category, naics_sector, contract_type
// ============================================================

import { createHash } from 'crypto';
import type { ThresholdCategory, ContractType, SetAside, OpportunitySource } from '@/lib/types';

// ============================================================
// NAICS SECTOR MAP (mirrors naics_sectors table in Supabase)
// ============================================================
export const NAICS_SECTOR_MAP: Record<string, string> = {
  '11': 'Agriculture & Forestry',
  '21': 'Mining & Oil',
  '22': 'Utilities',
  '23': 'Construction',
  '31': 'Manufacturing',
  '32': 'Manufacturing',
  '33': 'Manufacturing',
  '42': 'Wholesale Trade',
  '44': 'Retail',
  '45': 'Retail',
  '48': 'Transportation',
  '49': 'Transportation',
  '51': 'Information Technology',
  '52': 'Finance & Insurance',
  '53': 'Real Estate',
  '54': 'Professional Services',
  '55': 'Management',
  '56': 'Administrative Services',
  '61': 'Education & Training',
  '62': 'Healthcare',
  '71': 'Arts & Entertainment',
  '72': 'Food & Hospitality',
  '81': 'Other Services',
  '92': 'Government & Public Admin',
};

/**
 * Maps a NAICS code (string or number) to its sector label using the 2-digit prefix.
 * Returns undefined if code is missing or unrecognized.
 */
export function getNaicsSector(naicsCode: string | number | undefined | null): string | undefined {
  if (!naicsCode) return undefined;
  const prefix = String(naicsCode).trim().slice(0, 2);
  return NAICS_SECTOR_MAP[prefix];
}

// ============================================================
// THRESHOLD CATEGORY — Oct 2025 FAR thresholds
// ============================================================

/**
 * Derives threshold_category from a dollar value (whole dollars, not cents).
 *   ≤ $15,000           → micro_purchase
 *   $15,001 – $350,000  → simplified_acquisition
 *   > $350,000          → large_acquisition
 *   null / 0 / NaN      → unknown
 */
export function deriveThresholdCategory(valueDollars: number | null | undefined): ThresholdCategory {
  if (valueDollars == null || isNaN(valueDollars) || valueDollars <= 0) return 'unknown';
  if (valueDollars <= 15_000) return 'micro_purchase';
  if (valueDollars <= 350_000) return 'simplified_acquisition';
  return 'large_acquisition';
}

// ============================================================
// CONTRACT TYPE MAPPING
// ============================================================

/**
 * Maps a solicitation type string to our ContractType enum.
 * Handles common abbreviations and full names from state/local sources.
 */
export function mapContractType(typeStr: string | undefined | null): ContractType {
  if (!typeStr) return 'Other';
  const t = typeStr.toLowerCase().trim();

  if (t.includes('rfp') || t.includes('request for proposal')) return 'RFP';
  if (t.includes('rfq') || t.includes('request for quotation') || t.includes('request for quote')) return 'RFQ';
  if (t.includes('rfi') || t.includes('request for information') || t.includes('presolicitation')) return 'RFI';
  if (t.includes('ifb') || t.includes('invitation for bid') || t.includes('invitation to bid') || t === 'bid') return 'IFB';
  if (t.includes('idiq')) return 'IDIQ';
  if (t.includes('bpa') || t.includes('blanket purchase')) return 'BPA';
  if (t.includes('sbsa') || t.includes('simplified')) return 'SBSA';
  if (t.includes('sources sought')) return 'Sources_Sought';

  return 'Other';
}

// ============================================================
// SET-ASIDE MAPPING
// ============================================================

/**
 * Maps a set-aside description to our SetAside enum.
 */
export function mapSetAside(s: string | undefined | null): SetAside | undefined {
  if (!s) return undefined;
  const lower = s.toLowerCase().trim();

  if (lower.includes('total small business') || lower === 'sba') return 'total_small_business';
  if (lower.includes('8(a)') || lower === '8a') return '8a';
  if (lower.includes('hubzone')) return 'hubzone';
  if (lower.includes('sdvosb') || lower.includes('service-disabled veteran')) return 'sdvosb';
  if (lower.includes('edwosb')) return 'edwosb';
  if (lower.includes('wosb') || lower.includes('women-owned')) return 'wosb';
  if (lower === 'none' || lower === 'unrestricted' || lower === '') return 'unrestricted';

  return 'other';
}

// ============================================================
// DEDUP HASH
// ============================================================

/**
 * Computes SHA-256 dedup hash.
 * Formula: SHA-256(lower(trim(title)) + lower(trim(agency)) + deadline_date)
 * deadline_date = YYYY-MM-DD portion of an ISO string, or '' if null.
 */
export function computeDedupHash(
  title: string,
  agency: string,
  deadlineIso: string | null | undefined,
): string {
  const t = (title ?? '').toLowerCase().trim();
  const a = (agency ?? '').toLowerCase().trim();
  const d = deadlineIso ? (deadlineIso.split('T')[0] ?? deadlineIso).trim() : '';
  return createHash('sha256').update(`${t}${a}${d}`, 'utf8').digest('hex');
}

// ============================================================
// DOLLAR STRING PARSER
// ============================================================

/**
 * Parses a dollar string like "$1,234,567.89" or "1234567" to a number (whole dollars).
 * Returns undefined if unparseable or zero.
 */
export function parseDollarString(s: string | undefined | null): number | undefined {
  if (!s) return undefined;
  const cleaned = String(s).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) || parsed <= 0 ? undefined : parsed;
}

/**
 * Converts whole dollars to cents (integer).
 */
export function dollarsToCents(dollars: number | undefined): number | undefined {
  return dollars != null ? Math.round(dollars * 100) : undefined;
}

// ============================================================
// DATE NORMALIZER
// ============================================================

/**
 * Attempts to parse a date string in various formats to an ISO string.
 * Returns undefined if unparseable.
 * Handles: MM/DD/YYYY, YYYY-MM-DD, "Month DD, YYYY", etc.
 */
export function parseToIso(dateStr: string | undefined | null): string | undefined {
  if (!dateStr) return undefined;
  const trimmed = dateStr.trim();
  if (!trimmed) return undefined;

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString();

  // Try MM/DD/YYYY
  const mdyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, m, day, y] = mdyMatch;
    const d2 = new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
    if (!isNaN(d2.getTime())) return d2.toISOString();
  }

  return undefined;
}

// ============================================================
// NORMALIZED OPPORTUNITY SHAPE (shared across all scrapers)
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
}

export interface ScraperResult {
  source: OpportunitySource;
  opportunities: ScrapedOpportunity[];
  errors: string[];
  durationMs: number;
}
