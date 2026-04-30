// ============================================================
// SHARED TYPES — GRANTS INGESTION (TASK_012)
// ============================================================

export type GrantSource =
  | 'federal_grantsgov'
  | 'federal_sba'
  | 'state_pa_grants'
  | 'state_pa_dced'
  | 'local_ura'
  | 'local_allegheny'
  | 'other';

export type GrantCategory = 'federal' | 'state' | 'local' | 'university' | 'foundation';
export type GrantType = 'grant' | 'loan' | 'tax_credit' | 'rebate' | 'other';
export type EligibleEntity = 'small_business' | 'nonprofit' | 'individual' | 'municipality' | 'any';

export interface GrantRecord {
  source: GrantSource;
  category: GrantCategory;
  title: string;
  agency: string;
  grant_type: GrantType;
  eligible_entities: EligibleEntity[] | string[];
  min_amount?: number;           // cents
  max_amount?: number;           // cents
  application_deadline?: string; // ISO
  posted_date?: string;          // ISO
  description?: string;
  requirements?: string;
  how_to_apply?: string;
  url?: string;
  dedup_hash: string;
  external_id?: string;
  status: 'active' | 'closed' | 'archived';
}

export interface GrantIngestionResult {
  source: GrantSource;
  grants: GrantRecord[];
  errors: string[];
  durationMs: number;
}
