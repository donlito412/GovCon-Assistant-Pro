// ============================================================
// NORMALIZE SAM.GOV RAW OPPORTUNITY → Opportunity type
// Handles: field mapping, dedup_hash, threshold_category,
//          naics_sector, contract_type, Pittsburgh zip filter
// ============================================================

import { createHash } from 'crypto';
import type { SamGovOpportunity } from './samgov';
import type {
  Opportunity,
  OpportunitySource,
  ThresholdCategory,
  ContractType,
  SetAside,
} from '@/lib/types';
import {
  isPittsburghAreaZip,
  isPittsburghAreaCounty,
} from '../geo/pittsburgh_zips';

// ============================================================
// NAICS SECTOR MAP (mirrors naics_sectors table in Supabase)
// ============================================================
const NAICS_SECTOR_MAP: Record<string, string> = {
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
 * Maps a NAICS code string to its sector label.
 * Uses the 2-digit prefix of the NAICS code.
 */
function getNaicsSector(naicsCode: string | number | undefined | null): string | undefined {
  if (!naicsCode) return undefined;
  const prefix = String(naicsCode).trim().slice(0, 2);
  return NAICS_SECTOR_MAP[prefix];
}

// ============================================================
// THRESHOLD CATEGORY (Oct 2025 FAR thresholds)
// ============================================================

/**
 * Derives threshold_category from a dollar value (in whole dollars, not cents).
 * Rules:
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
// CONTRACT TYPE MAPPING (SAM.gov noticeType → ContractType)
// ============================================================

/**
 * Maps SAM.gov notice type string to our ContractType enum.
 * SAM.gov types: Presolicitation, Solicitation, Award Notice,
 *                Special Notice, Sources Sought, Combined Synopsis/Solicitation,
 *                Justification, Intent to Bundle Requirements
 */
export function mapContractType(noticeType: string | undefined | null): ContractType {
  if (!noticeType) return 'Other';

  const t = noticeType.toLowerCase().trim();

  if (t === 'presolicitation') return 'RFI';
  if (t === 'solicitation') return 'RFP';
  if (t === 'combined synopsis/solicitation') return 'RFP';
  if (t === 'sources sought') return 'Sources_Sought';
  if (t === 'award notice') return 'Other';
  if (t === 'special notice') return 'Other';
  if (t === 'justification') return 'Other';
  if (t === 'intent to bundle requirements (far 7.107-4)') return 'Other';
  if (t.includes('rfq') || t.includes('request for quotation')) return 'RFQ';
  if (t.includes('rfp') || t.includes('request for proposal')) return 'RFP';
  if (t.includes('rfi') || t.includes('request for information')) return 'RFI';
  if (t.includes('ifb') || t.includes('invitation for bid')) return 'IFB';
  if (t.includes('idiq')) return 'IDIQ';
  if (t.includes('bpa')) return 'BPA';
  if (t.includes('sbsa') || t.includes('simplified')) return 'SBSA';
  if (t.includes('sources sought')) return 'Sources_Sought';

  return 'Other';
}

// ============================================================
// SET-ASIDE MAPPING
// ============================================================

/**
 * Maps SAM.gov typeOfSetAside code/description to our SetAside enum.
 */
export function mapSetAside(setAside: string | undefined | null): SetAside | undefined {
  if (!setAside) return undefined;

  const s = setAside.toLowerCase().trim();

  if (s.includes('total small business') || s === 'sba' || s === 'total-small-business-set-aside') {
    return 'total_small_business';
  }
  if (s.includes('8(a)') || s === '8a') return '8a';
  if (s.includes('hubzone')) return 'hubzone';
  if (s.includes('sdvosb') || s.includes('service-disabled veteran')) return 'sdvosb';
  if (s.includes('edwosb')) return 'edwosb';
  if (s.includes('wosb') || s.includes('women-owned')) return 'wosb';
  if (s === 'none' || s === 'unrestricted' || s === '') return 'unrestricted';

  return 'other';
}

// ============================================================
// DEDUP HASH
// ============================================================

/**
 * Computes SHA-256 dedup hash.
 * Formula: SHA-256(lower(trim(title)) + lower(trim(agency)) + deadline_date)
 * deadline_date is the date portion only (YYYY-MM-DD) or empty string if null.
 */
export function computeDedupHash(
  title: string,
  agency: string,
  deadlineIso: string | null | undefined,
): string {
  const normalizedTitle = (title ?? '').toLowerCase().trim();
  const normalizedAgency = (agency ?? '').toLowerCase().trim();
  const deadlineDatePart = deadlineIso
    ? (deadlineIso.split('T')[0] ?? deadlineIso).trim()
    : '';

  const raw = `${normalizedTitle}${normalizedAgency}${deadlineDatePart}`;
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

// ============================================================
// PITTSBURGH FILTER
// ============================================================

// Pittsburgh MSA cities — used for place-of-performance filtering
const PITTSBURGH_MSA_CITIES = new Set([
  'pittsburgh', 'allegheny', 'monroeville', 'west mifflin', 'mckeesport',
  'bethel park', 'canonsburg', 'wexford', 'cranberry township', 'cranberry',
  'mars', 'moon', 'coraopolis', 'carnegie', 'mt lebanon', 'mount lebanon',
  'upper st clair', 'peters township', 'bethel park', 'brentwood',
  'swissvale', 'edgewood', 'churchill', 'penn hills', 'plum', 'murrysville',
  'export', 'irwin', 'north huntingdon', 'greensburg', 'jeannette',
  'latrobe', 'connellsville', 'uniontown', 'beaver', 'beaver falls',
  'aliquippa', 'ambridge', 'economy', 'rochester', 'butler',
  'cranberry', 'slippery rock', 'grove city', 'washington', 'charleroi',
  'monessen', 'donora', 'california', 'waynesburg', 'kittanning',
  'ford city', 'apollo', 'leechburg', 'new kensington', 'lower burrell',
  'brackenridge', 'tarentum', 'natrona heights', 'oakmont', 'verona',
  'springdale', 'cheswick', 'harmarville', 'etna', 'millvale', 'aspinwall',
  'oakdale', 'imperial', 'findlay', 'collier', 'robinson', 'kennedy',
  'stowe', 'mckees rocks', 'crafton', 'rosslyn farms',
]);

/**
 * GovTribe-style filtering: Include ANY opportunity a Pittsburgh business can bid on.
 * 
 * INCLUDES:
 * 1. Pittsburgh MSA opportunities (place of performance in metro area)
 * 2. PA state opportunities (Pittsburgh businesses can bid statewide)
 * 3. National opportunities (no location specified - open to all US bidders)
 * 4. Set-aside contracts Pittsburgh small businesses qualify for
 * 5. Office location in Pittsburgh (local procurement offices)
 * 
 * EXCLUDES:
 * - Only explicitly out-of-state locations with no PA connection
 */
export function isPittsburghOpportunity(opp: SamGovOpportunity): boolean {
  const pop = opp.placeOfPerformance;
  
  // NO location data at all = National contract (any US business can bid)
  // GovTribe includes these - they're huge opportunity pools
  const hasLocationData = pop && (pop.zip || pop.city?.name || pop.county?.name || pop.state?.code || pop.state?.name);
  if (!hasLocationData) {
    return true; // National opportunity - include it
  }
  
  // Check if explicitly in Pittsburgh MSA zips
  const zip = pop?.zip?.slice(0, 5);
  if (zip && isPittsburghAreaZip(zip)) {
    return true;
  }
  
  // Check if in Pittsburgh MSA counties
  const county = pop?.county?.name ?? '';
  if (county && isPittsburghAreaCounty(county)) {
    return true;
  }
  
  // Check if place of performance is PA (anywhere in PA - Pittsburgh businesses can bid statewide)
  const stateCode = (pop?.state?.code ?? '').toUpperCase();
  const stateName = (pop?.state?.name ?? '').toUpperCase();
  if (stateCode === 'PA' || stateName === 'PENNSYLVANIA' || stateName === 'PA') {
    return true; // Any PA contract - Pittsburgh businesses can bid
  }
  
  // Check if office address is in PA (procurement office in PA)
  const officeState = (opp.officeAddress?.state ?? '').toUpperCase();
  const officeZip = opp.officeAddress?.zipcode ?? '';
  if (officeState === 'PA' || isPittsburghAreaZip(officeZip)) {
    return true;
  }
  
  // Check city names for Pittsburgh metro
  const city = (pop?.city?.name ?? '').toLowerCase().trim();
  if (city) {
    const pittsburghCities = [
      'pittsburgh', 'allegheny', 'monroeville', 'west mifflin', 'mckeesport',
      'bethel park', 'canonsburg', 'wexford', 'cranberry', 'cranberry township',
      'mars', 'moon', 'coraopolis', 'carnegie', 'mt lebanon', 'mount lebanon',
      'upper st clair', 'peters township', 'brentwood', 'swissvale', 'edgewood',
      'churchill', 'penn hills', 'plum', 'murrysville', 'export', 'irwin',
      'north huntingdon', 'greensburg', 'jeannette', 'latrobe', 'connellsville',
      'uniontown', 'beaver', 'beaver falls', 'aliquippa', 'ambridge', 'economy',
      'rochester', 'butler', 'slippery rock', 'grove city', 'washington', 'charleroi',
      'monessen', 'donora', 'california', 'waynesburg', 'kittanning', 'ford city',
      'apollo', 'leechburg', 'new kensington', 'lower burrell', 'brackenridge',
      'tarentum', 'natrona heights', 'oakmont', 'verona', 'springdale', 'cheswick',
      'harmarville', 'etna', 'millvale', 'aspinwall', 'oakdale', 'imperial',
      'findlay', 'collier', 'robinson', 'kennedy', 'stowe', 'mckees rocks',
      'crafton', 'rosslyn farms'
    ];
    if (pittsburghCities.some(c => city.includes(c))) {
      return true;
    }
  }
  
  // Only exclude if explicitly another state with NO PA connection
  if (stateCode && stateCode !== 'PA') {
    // Check if office is in PA even if work is elsewhere
    if (officeState === 'PA') {
      return true; // Procurement office in PA
    }
    return false; // Explicitly another state, no PA office
  }
  
  // Default: include (conservative - better to show extra than miss opportunities)
  return true;
}

// ============================================================
// NORMALIZE FUNCTION
// ============================================================

export interface NormalizedOpportunity {
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
  value_min?: number;  // cents
  value_max?: number;  // cents
  deadline?: string;   // ISO string
  posted_date?: string; // ISO string
  place_of_performance_city?: string;
  place_of_performance_state?: string;
  place_of_performance_zip?: string;
  description?: string;
  url?: string;
  status: 'active' | 'closed' | 'awarded' | 'cancelled';
  external_id: string; // noticeId — used for upsert identification
}

/**
 * Normalizes a raw SAM.gov opportunity to our canonical NormalizedOpportunity shape.
 *
 * Field mapping:
 *   noticeId              → external_id
 *   title                 → title
 *   fullParentPathName    → agency_name
 *   naicsCode             → naics_code
 *   baseAndAllOptionsValue (from award.amount) → value_min = value_max (cents)
 *   responseDeadLine      → deadline
 *   postedDate            → posted_date
 *   placeOfPerformance    → place_of_performance_*
 *   description           → description
 *   uiLink                → url
 *   type                  → contract_type (mapped)
 *   typeOfSetAside        → set_aside_type (mapped)
 *   active                → status
 */
export function normalizeOpportunity(raw: SamGovOpportunity): NormalizedOpportunity {
  const agency = raw.fullParentPathName ?? raw.officeAddress?.city ?? '';
  const title = raw.title ?? '';

  // Deadline: responseDeadLine or archiveDate
  const deadlineRaw = raw.responseDeadLine ?? raw.archiveDate ?? undefined;
  const deadline = deadlineRaw ? new Date(deadlineRaw).toISOString() : undefined;

  // Posted date
  const postedDateRaw = raw.postedDate ?? undefined;
  const posted_date = postedDateRaw ? new Date(postedDateRaw).toISOString() : undefined;

  // Value: from award.amount if present (SAM.gov baseAndAllOptionsValue is in award block)
  const awardAmountStr = raw.award?.amount;
  let valueDollars: number | undefined;
  if (awardAmountStr) {
    const parsed = parseFloat(String(awardAmountStr).replace(/[,$]/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      valueDollars = parsed;
    }
  }
  // Convert to cents
  const valueCents = valueDollars != null ? Math.round(valueDollars * 100) : undefined;

  // NAICS
  const naicsStr = raw.naicsCode ?? raw.naicsCodes?.[0] ?? undefined;
  const naics_code = naicsStr ? parseInt(String(naicsStr), 10) || undefined : undefined;
  const naics_sector = getNaicsSector(naicsStr);

  // Contract type
  const contract_type = mapContractType(raw.type ?? raw.baseType);

  // Set-aside
  const set_aside_type = mapSetAside(raw.typeOfSetAside ?? raw.typeOfSetAsideDescription);

  // Threshold category
  const threshold_category = deriveThresholdCategory(valueDollars ?? null);

  // Status
  let status: 'active' | 'closed' | 'awarded' | 'cancelled' = 'active';
  if (raw.active === 'No') {
    if (raw.award?.date) {
      status = 'awarded';
    } else if (raw.archiveType === 'autocancelled' || raw.archiveType === 'Cancelled') {
      status = 'cancelled';
    } else {
      status = 'closed';
    }
  }

  // Place of performance
  const pop = raw.placeOfPerformance;
  const place_of_performance_city = pop?.city?.name ?? undefined;
  const place_of_performance_state = pop?.state?.code ?? undefined;
  const place_of_performance_zip = pop?.zip?.slice(0, 5) ?? undefined;

  // URL
  const url = raw.uiLink ?? undefined;

  // Dedup hash
  const dedup_hash = computeDedupHash(title, agency, deadline ?? null);

  return {
    source: 'federal_samgov',
    title,
    agency_name: agency,
    solicitation_number: raw.solicitationNumber ?? undefined,
    dedup_hash,
    canonical_sources: ['federal_samgov'],
    naics_code,
    naics_sector,
    contract_type,
    threshold_category,
    set_aside_type: set_aside_type ?? undefined,
    value_min: valueCents,
    value_max: valueCents,
    deadline,
    posted_date,
    place_of_performance_city,
    place_of_performance_state,
    place_of_performance_zip,
    description: raw.description ?? undefined,
    url,
    status,
    external_id: raw.noticeId,
  };
}

// ============================================================
// BATCH NORMALIZE + FILTER
// ============================================================

export interface BatchNormalizeResult {
  normalized: NormalizedOpportunity[];
  filteredCount: number;   // how many were excluded by Pittsburgh filter
  totalInput: number;
}

/**
 * Normalizes and Pittsburgh-filters a batch of raw SAM.gov opportunities.
 * Logs counts.
 */
export function normalizePittsburghOpportunities(
  raw: SamGovOpportunity[],
): BatchNormalizeResult {
  const totalInput = raw.length;
  const normalized: NormalizedOpportunity[] = [];
  let filteredCount = 0;

  for (const opp of raw) {
    if (!isPittsburghOpportunity(opp)) {
      filteredCount++;
      continue;
    }
    try {
      normalized.push(normalizeOpportunity(opp));
    } catch (err) {
      console.error(
        `[normalize] Failed to normalize noticeId=${opp.noticeId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(
    `[normalize] Input: ${totalInput} | Pittsburgh matches: ${normalized.length} | Filtered out: ${filteredCount}`,
  );

  return { normalized, filteredCount, totalInput };
}
