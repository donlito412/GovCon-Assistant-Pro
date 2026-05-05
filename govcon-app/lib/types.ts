// ============================================================
// GOVCON ASSISTANT PRO — CORE TYPES
// Full coverage: all 18 tasks / 9 modules
// Updated: 2026-04-29
// ============================================================

// ------ SOURCE ENUMS ------

export type OpportunitySource =
  // Federal
  | 'federal_samgov'
  | 'federal_samgov_forecast'
  | 'federal_usaspending'
  // State (Pennsylvania)
  | 'state_pa_emarketplace'
  | 'state_pa_treasury'
  | 'state_pa_bulletin'
  | 'state_pa_dced'
  // Local
  | 'local_allegheny'
  | 'local_allegheny_publicworks'
  | 'local_pittsburgh'
  | 'local_ura'
  | 'local_housing_authority'
  | 'local_bidnet'
  // Education
  | 'education_pitt'
  | 'education_cmu'
  | 'education_ccac'
  | 'education_pgh_schools'
  | 'education_duquesne'
  | 'other';

export type OpportunityStatus = 'active' | 'closed' | 'awarded' | 'cancelled';

// FAR thresholds as of October 2025
export type ThresholdCategory =
  | 'micro_purchase'          // ≤ $15,000
  | 'simplified_acquisition'  // $15,001 – $350,000
  | 'large_acquisition'       // > $350,000
  | 'construction_micro'      // ≤ $2,000 (Davis-Bacon)
  | 'construction_sat'        // $2,001 – $2,000,000
  | 'unknown';

export type ContractType =
  | 'RFP' | 'RFQ' | 'RFI' | 'IFB' | 'IDIQ' | 'BPA' | 'SBSA' | 'Sources_Sought' | 'Other';

export type SetAside =
  | 'total_small_business' | '8a' | 'hubzone' | 'sdvosb' | 'wosb' | 'edwosb' | 'unrestricted' | 'other';

export type AgencyLevel = 'federal' | 'state' | 'local' | 'education';

export type PipelineStage =
  | 'Identified'
  | 'Qualifying'
  | 'Pursuing'
  | 'Proposal_In_Progress'
  | 'Submitted'
  | 'Won'
  | 'Lost'
  | 'No_Bid';

export type GrantType = 'grant' | 'loan' | 'tax_credit' | 'rebate' | 'other';

export type GrantSource =
  | 'federal_grantsgov'
  | 'state_pa_grants'
  | 'state_pa_dced'
  | 'local_ura'
  | 'local_allegheny_grants'
  | 'federal_sba'
  | 'other';

export type EventType =
  | 'city_council' | 'planning' | 'ura' | 'county_council'
  | 'networking' | 'conference' | 'chamber' | 'workshop' | 'other';

export type EventRelevance =
  | 'contracts_announced' | 'grants_discussed' | 'networking'
  | 'development_plans' | 'budget_decisions' | 'general';

export type OutreachStatus =
  | 'not_contacted' | 'sent' | 'replied' | 'meeting_set'
  | 'teaming_agreed' | 'declined' | 'not_a_fit';

export type BidStatus =
  | 'pending' | 'won' | 'lost' | 'withdrawn' | 'cancelled' | 'no_award';

// ------ MODULE 1: CONTRACTS ------

export interface Agency {
  id: number;
  name: string;
  level: AgencyLevel;
  website?: string;
  total_spend?: number;
  created_at: string;
}

export interface Opportunity {
  id: number;
  source: OpportunitySource;
  title: string;
  agency_id?: number;
  agency_name?: string;
  solicitation_number?: string;
  dedup_hash?: string;
  canonical_sources?: OpportunitySource[];
  naics_code?: number;
  naics_sector?: string;
  contract_type?: ContractType;
  threshold_category?: ThresholdCategory;
  set_aside_type?: SetAside;
  value_min?: number; // cents
  value_max?: number; // cents
  deadline?: string;
  posted_date?: string;
  place_of_performance_city?: string;
  place_of_performance_state?: string;
  place_of_performance_zip?: string;
  description?: string;
  url?: string;
  status: OpportunityStatus;
  created_at: string;
  updated_at: string;
  // Joined
  agency?: Agency;
}

// ------ MODULE 7: PIPELINE ------

export interface PipelineNote {
  text: string;
  created_at: string;
}

export interface PipelineItem {
  id: number;
  opportunity_id: number;
  stage: PipelineStage;
  notes_json?: PipelineNote[];
  bid_record_id?: number;
  created_at: string;
  updated_at: string;
  // Joined
  opportunity?: Opportunity;
  bid_record?: BidRecord;
}

export interface SavedSearch {
  id: number;
  name: string;
  filters_json: Record<string, any>;
  alert_enabled: boolean;
  last_checked_at?: string;
  created_at: string;
}

export interface Alert {
  id: number;
  saved_search_id: number;
  opportunity_id: number;
  sent_at?: string;
  saved_search?: SavedSearch;
  opportunity?: Opportunity;
}

// ------ MODULE 2: GRANTS (TASK_012) ------

export interface Grant {
  id: number;
  source: GrantSource;
  title: string;
  agency: string;
  grant_type: GrantType;
  eligible_entities?: string[];
  min_amount?: number; // cents
  max_amount?: number; // cents
  application_deadline?: string;
  posted_date?: string;
  description?: string;
  requirements?: string;
  how_to_apply?: string;
  url?: string;
  created_at: string;
  updated_at: string;
}

// ------ MODULE 3: EVENTS (TASK_013) ------

export interface Event {
  id: number;
  source: string;
  title: string;
  organizer?: string;
  event_type: EventType;
  event_date: string;
  end_date?: string;
  time_start?: string;
  time_end?: string;
  location?: string;
  meeting_link?: string;
  description?: string;
  agenda_url?: string;
  why_relevant?: EventRelevance;
  url?: string;
  created_at: string;
}

// ------ MODULE 4: SUBCONTRACTORS (TASK_014) ------

export interface SubcontractorCertifications {
  sdvosb?: boolean;
  vosb?: boolean;
  wosb?: boolean;
  edwosb?: boolean;
  hubzone?: boolean;
  sba_8a?: boolean;
  mwbe?: boolean;
  dbe?: boolean;
}

export interface Subcontractor {
  id: number;
  uei?: string;
  cage_code?: string;
  legal_name: string;
  dba_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  email?: string;
  naics_codes?: number[];
  primary_naics?: number;
  certifications?: SubcontractorCertifications;
  business_types?: string[];
  employee_count?: string;
  registration_status?: string;
  registration_expiry?: string;
  capabilities_statement?: string;
  sources?: string[];
  last_award_date?: string;
  total_awards_value?: number; // cents
  created_at: string;
  updated_at: string;
}

// ------ MODULE 5: OUTREACH CRM (TASK_015) ------

export interface OutreachContact {
  id: number;
  subcontractor_id?: number;
  contact_name: string;
  company_name: string;
  email?: string;
  phone?: string;
  status: OutreachStatus;
  first_contacted_at?: string;
  last_activity_at?: string;
  linked_bid_ids?: number[];
  notes?: string;
  created_at: string;
}

export interface OutreachThread {
  id: number;
  contact_id: number;
  direction: 'outbound' | 'inbound';
  subject: string;
  body: string;
  sent_at: string;
  from_email: string;
  to_email: string;
  resend_message_id?: string;
}

// ------ MODULE 6: BID TRACKER (TASK_015) ------

export interface BidTeamMember {
  subcontractor_id?: number;
  company_name: string;
  role: 'prime' | 'sub';
  naics?: number;
  percentage_of_work?: number;
}

export interface BidDocument {
  name: string;
  type: string;
  submitted_at: string;
}

export interface BidRecord {
  id: number;
  opportunity_id: number;
  pipeline_item_id?: number;
  contract_title: string;
  agency: string;
  solicitation_number?: string;
  bid_submitted_date?: string;
  bid_amount?: number; // cents
  bid_narrative?: string;
  team_composition?: BidTeamMember[];
  documents_submitted?: BidDocument[];
  status: BidStatus;
  award_date?: string;
  award_amount?: number; // cents
  if_lost_winner_name?: string;
  if_lost_winner_amount?: number; // cents
  if_lost_reason?: string;
  created_at: string;
  updated_at: string;
}

// ------ MODULE 8: COMMUNITY (TASK_016) ------

export interface CommunityProfile {
  id: number;
  business_name: string;
  owner_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  neighborhood?: string;
  city?: string;
  zip?: string;
  business_type?: string;
  industry?: string;
  naics_codes?: number[];
  services_offered?: string[];
  years_in_business?: number;
  employee_count_range?: string;
  certifications?: Record<string, boolean>;
  sam_registered?: boolean;
  sam_uei?: string;
  bio?: string;
  looking_for?: string[];
  is_verified?: boolean;
  source?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamingPost {
  id: number;
  author_profile_id: number;
  linked_opportunity_id?: number;
  title: string;
  description?: string;
  contract_value_range?: string;
  naics_needed?: number[];
  certifications_needed?: string[];
  response_deadline?: string;
  status: 'open' | 'filled' | 'expired';
  created_at: string;
  // Joined
  author?: CommunityProfile;
  opportunity?: Opportunity;
}

// ------ MODULE 9: INCUMBENT + FORECAST (TASK_018) ------

export interface IncumbentContract {
  id: number;
  opportunity_id?: number;
  solicitation_number?: string;
  current_awardee_name?: string;
  current_awardee_uei?: string;
  award_date?: string;
  award_amount?: number; // cents
  period_of_performance_end_date?: string;
  recompete_likely_date?: string;
  agency_name?: string;
  naics_code?: number;
  usaspending_award_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ForecastOpportunity {
  id: number;
  title: string;
  agency_name?: string;
  naics_code?: number;
  estimated_solicitation_date?: string;
  estimated_award_date?: string;
  estimated_value?: number; // cents
  set_aside_type?: SetAside;
  description?: string;
  poc_name?: string;
  poc_email?: string;
  poc_phone?: string;
  place_of_performance_city?: string;
  place_of_performance_state?: string;
  sam_notice_id?: string;
  status?: 'active' | 'solicited' | 'awarded' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// ------ MODULE: AI ASSISTANT (TASK_017) ------

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AssistantConversation {
  id: number;
  title?: string;
  linked_opportunity_id?: number;
  messages_json: AssistantMessage[];
  created_at: string;
  updated_at: string;
}
