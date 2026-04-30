-- ============================================================
-- GOVCON ASSISTANT PRO — SUPABASE SCHEMA
-- Full coverage: all 18 tasks / 9 modules
-- Updated: 2026-04-29
-- Run this in Supabase SQL Editor before first deploy
-- ============================================================

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE opportunity_source AS ENUM (
  'federal_samgov',
  'federal_samgov_forecast',
  'federal_usaspending',
  'state_pa_emarketplace',
  'state_pa_treasury',
  'state_pa_bulletin',
  'state_pa_dced',
  'local_allegheny',
  'local_allegheny_publicworks',
  'local_pittsburgh',
  'local_ura',
  'local_bidnet',
  'education_pitt',
  'education_cmu',
  'education_ccac',
  'education_pgh_schools',
  'education_duquesne',
  'other'
);

CREATE TYPE opportunity_status AS ENUM (
  'active', 'closed', 'awarded', 'cancelled'
);

-- FAR thresholds as of October 2025
CREATE TYPE threshold_category AS ENUM (
  'micro_purchase',         -- <= $15,000
  'simplified_acquisition', -- $15,001 - $350,000
  'large_acquisition',      -- > $350,000
  'construction_micro',     -- <= $2,000 (Davis-Bacon)
  'construction_sat',       -- $2,001 - $2,000,000
  'unknown'
);

CREATE TYPE contract_type AS ENUM (
  'RFP', 'RFQ', 'RFI', 'IFB', 'IDIQ', 'BPA', 'SBSA', 'Sources_Sought', 'Other'
);

CREATE TYPE set_aside_type AS ENUM (
  'total_small_business', '8a', 'hubzone', 'sdvosb', 'wosb', 'edwosb', 'unrestricted', 'other'
);

CREATE TYPE agency_level AS ENUM (
  'federal', 'state', 'local', 'education'
);

CREATE TYPE pipeline_stage AS ENUM (
  'Identified', 'Qualifying', 'Pursuing', 'Proposal_In_Progress',
  'Submitted', 'Won', 'Lost', 'No_Bid'
);

CREATE TYPE grant_type AS ENUM (
  'grant', 'loan', 'tax_credit', 'rebate', 'other'
);

CREATE TYPE bid_status AS ENUM (
  'pending', 'won', 'lost', 'withdrawn', 'cancelled', 'no_award'
);

CREATE TYPE outreach_status AS ENUM (
  'not_contacted', 'sent', 'replied', 'meeting_set',
  'teaming_agreed', 'declined', 'not_a_fit'
);

-- ============================================================
-- MODULE 1: CONTRACTS
-- ============================================================

CREATE TABLE agencies (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  level       agency_level NOT NULL,
  website     TEXT,
  total_spend BIGINT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- NAICS sector label lookup
CREATE TABLE naics_sectors (
  naics_prefix  TEXT PRIMARY KEY,  -- e.g. '54' for Professional Services
  sector_label  TEXT NOT NULL      -- e.g. 'Professional Services'
);

INSERT INTO naics_sectors (naics_prefix, sector_label) VALUES
  ('11', 'Agriculture & Forestry'),
  ('21', 'Mining & Oil'),
  ('22', 'Utilities'),
  ('23', 'Construction'),
  ('31', 'Manufacturing'),
  ('32', 'Manufacturing'),
  ('33', 'Manufacturing'),
  ('42', 'Wholesale Trade'),
  ('44', 'Retail'),
  ('45', 'Retail'),
  ('48', 'Transportation'),
  ('49', 'Transportation'),
  ('51', 'Information Technology'),
  ('52', 'Finance & Insurance'),
  ('53', 'Real Estate'),
  ('54', 'Professional Services'),
  ('55', 'Management'),
  ('56', 'Administrative Services'),
  ('61', 'Education & Training'),
  ('62', 'Healthcare'),
  ('71', 'Arts & Entertainment'),
  ('72', 'Food & Hospitality'),
  ('81', 'Other Services'),
  ('92', 'Government & Public Admin');

CREATE TABLE opportunities (
  id                          BIGSERIAL PRIMARY KEY,
  source                      opportunity_source NOT NULL,
  title                       TEXT NOT NULL,
  agency_id                   BIGINT REFERENCES agencies(id),
  agency_name                 TEXT,
  solicitation_number         TEXT,
  dedup_hash                  TEXT UNIQUE,  -- SHA-256(lower(title) + lower(agency) + deadline::date)
  canonical_sources           JSONB,        -- array of all sources this opp appeared on
  naics_code                  INTEGER,
  naics_sector                TEXT,         -- denormalized from naics_sectors for fast filtering
  contract_type               contract_type,
  threshold_category          threshold_category,
  set_aside_type              set_aside_type,
  value_min                   BIGINT,       -- cents
  value_max                   BIGINT,       -- cents
  deadline                    TIMESTAMPTZ,
  posted_date                 TIMESTAMPTZ,
  place_of_performance_city   TEXT,
  place_of_performance_state  TEXT,
  place_of_performance_zip    TEXT,
  description                 TEXT,
  url                         TEXT,
  status                      opportunity_status DEFAULT 'active',
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Fuzzy duplicate review queue
CREATE TABLE dedup_candidates (
  id                BIGSERIAL PRIMARY KEY,
  opportunity_id_a  BIGINT REFERENCES opportunities(id),
  opportunity_id_b  BIGINT REFERENCES opportunities(id),
  similarity_score  REAL,
  resolved          BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 7: PIPELINE & ALERTS
-- ============================================================

CREATE TABLE pipeline_items (
  id              BIGSERIAL PRIMARY KEY,
  opportunity_id  BIGINT REFERENCES opportunities(id) NOT NULL,
  stage           pipeline_stage NOT NULL DEFAULT 'Identified',
  notes_json      JSONB,          -- [{ text, created_at }]
  bid_record_id   BIGINT,         -- FK added after bid_records table created
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE saved_searches (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  filters_json     JSONB NOT NULL,
  alert_enabled    BOOLEAN DEFAULT TRUE,
  last_checked_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alerts (
  id               BIGSERIAL PRIMARY KEY,
  saved_search_id  BIGINT REFERENCES saved_searches(id) NOT NULL,
  opportunity_id   BIGINT REFERENCES opportunities(id) NOT NULL,
  sent_at          TIMESTAMPTZ
);

-- ============================================================
-- MODULE 2: GRANTS (TASK_012 adds full schema)
-- ============================================================

CREATE TABLE grants (
  id                    BIGSERIAL PRIMARY KEY,
  source                TEXT NOT NULL,
  title                 TEXT NOT NULL,
  agency                TEXT,
  grant_type            grant_type,
  eligible_entities     JSONB,        -- ["small_business", "nonprofit", ...]
  min_amount            BIGINT,       -- cents
  max_amount            BIGINT,       -- cents
  application_deadline  TIMESTAMPTZ,
  posted_date           TIMESTAMPTZ,
  description           TEXT,
  requirements          TEXT,
  how_to_apply          TEXT,
  url                   TEXT,
  dedup_hash            TEXT UNIQUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 3: EVENTS (TASK_013 adds full schema)
-- ============================================================

CREATE TABLE events (
  id            BIGSERIAL PRIMARY KEY,
  source        TEXT NOT NULL,
  title         TEXT NOT NULL,
  organizer     TEXT,
  event_type    TEXT,
  event_date    TIMESTAMPTZ NOT NULL,
  end_date      TIMESTAMPTZ,
  time_start    TEXT,
  time_end      TEXT,
  location      TEXT,
  meeting_link  TEXT,
  description   TEXT,
  agenda_url    TEXT,
  why_relevant  TEXT,
  url           TEXT,
  dedup_hash    TEXT UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 4: SUBCONTRACTORS (TASK_014 adds full schema)
-- ============================================================

CREATE TABLE subcontractors (
  id                      BIGSERIAL PRIMARY KEY,
  uei                     TEXT UNIQUE,
  cage_code               TEXT,
  legal_name              TEXT NOT NULL,
  dba_name                TEXT,
  address                 TEXT,
  city                    TEXT,
  state                   TEXT,
  zip                     TEXT,
  phone                   TEXT,
  website                 TEXT,
  email                   TEXT,
  naics_codes             JSONB,
  primary_naics           INTEGER,
  certifications          JSONB,
  business_types          JSONB,
  employee_count          TEXT,
  registration_status     TEXT,
  registration_expiry     TIMESTAMPTZ,
  capabilities_statement  TEXT,
  sources                 JSONB,
  last_award_date         TIMESTAMPTZ,
  total_awards_value      BIGINT,  -- cents
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULES 5 & 6: OUTREACH CRM + BID TRACKER (TASK_015)
-- ============================================================

CREATE TABLE outreach_contacts (
  id                  BIGSERIAL PRIMARY KEY,
  subcontractor_id    BIGINT REFERENCES subcontractors(id),
  contact_name        TEXT NOT NULL,
  company_name        TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  status              outreach_status DEFAULT 'not_contacted',
  first_contacted_at  TIMESTAMPTZ,
  last_activity_at    TIMESTAMPTZ,
  linked_bid_ids      JSONB,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE outreach_threads (
  id                 BIGSERIAL PRIMARY KEY,
  contact_id         BIGINT REFERENCES outreach_contacts(id) NOT NULL,
  direction          TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  subject            TEXT,
  body               TEXT,
  sent_at            TIMESTAMPTZ DEFAULT NOW(),
  from_email         TEXT,
  to_email           TEXT,
  resend_message_id  TEXT
);

CREATE TABLE bid_records (
  id                    BIGSERIAL PRIMARY KEY,
  opportunity_id        BIGINT REFERENCES opportunities(id),
  pipeline_item_id      BIGINT REFERENCES pipeline_items(id),
  contract_title        TEXT NOT NULL,
  agency                TEXT,
  solicitation_number   TEXT,
  bid_submitted_date    TIMESTAMPTZ,
  bid_amount            BIGINT,         -- cents
  bid_narrative         TEXT,
  team_composition      JSONB,          -- [{ company_name, role, naics, percentage_of_work }]
  documents_submitted   JSONB,          -- [{ name, type, submitted_at }]
  status                bid_status DEFAULT 'pending',
  award_date            TIMESTAMPTZ,
  award_amount          BIGINT,         -- cents
  if_lost_winner_name   TEXT,
  if_lost_winner_amount BIGINT,         -- cents
  if_lost_reason        TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK now that bid_records exists
ALTER TABLE pipeline_items
  ADD CONSTRAINT fk_pipeline_bid_record
  FOREIGN KEY (bid_record_id) REFERENCES bid_records(id);

-- ============================================================
-- MODULE 8: COMMUNITY (TASK_016)
-- ============================================================

CREATE TABLE community_profiles (
  id                   BIGSERIAL PRIMARY KEY,
  business_name        TEXT NOT NULL,
  owner_name           TEXT,
  email                TEXT,
  phone                TEXT,
  website              TEXT,
  neighborhood         TEXT,
  city                 TEXT,
  zip                  TEXT,
  business_type        TEXT,
  industry             TEXT,
  naics_codes          JSONB,
  services_offered     JSONB,
  years_in_business    INTEGER,
  employee_count_range TEXT,
  certifications       JSONB,
  sam_registered       BOOLEAN DEFAULT FALSE,
  sam_uei              TEXT,
  bio                  TEXT,
  looking_for          JSONB,
  is_verified          BOOLEAN DEFAULT FALSE,
  source               TEXT DEFAULT 'self_registered',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teaming_posts (
  id                    BIGSERIAL PRIMARY KEY,
  author_profile_id     BIGINT REFERENCES community_profiles(id) NOT NULL,
  linked_opportunity_id BIGINT REFERENCES opportunities(id),
  title                 TEXT NOT NULL,
  description           TEXT,
  contract_value_range  TEXT,
  naics_needed          JSONB,
  certifications_needed JSONB,
  response_deadline     TIMESTAMPTZ,
  status                TEXT DEFAULT 'open' CHECK (status IN ('open', 'filled', 'expired')),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE connection_requests (
  id               BIGSERIAL PRIMARY KEY,
  from_profile_id  BIGINT REFERENCES community_profiles(id) NOT NULL,
  to_profile_id    BIGINT REFERENCES community_profiles(id) NOT NULL,
  message          TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE community_messages (
  id               BIGSERIAL PRIMARY KEY,
  from_profile_id  BIGINT REFERENCES community_profiles(id) NOT NULL,
  to_profile_id    BIGINT REFERENCES community_profiles(id) NOT NULL,
  body             TEXT NOT NULL,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 9: INCUMBENT + FORECAST (TASK_018)
-- ============================================================

CREATE TABLE incumbent_contracts (
  id                              BIGSERIAL PRIMARY KEY,
  opportunity_id                  BIGINT REFERENCES opportunities(id),
  solicitation_number             TEXT,
  current_awardee_name            TEXT,
  current_awardee_uei             TEXT,
  award_date                      TIMESTAMPTZ,
  award_amount                    BIGINT,       -- cents
  period_of_performance_end_date  TIMESTAMPTZ,
  recompete_likely_date           TIMESTAMPTZ,  -- end_date - 180 days
  agency_name                     TEXT,
  naics_code                      INTEGER,
  usaspending_award_id            TEXT UNIQUE,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forecast_opportunities (
  id                            BIGSERIAL PRIMARY KEY,
  title                         TEXT NOT NULL,
  agency_name                   TEXT,
  naics_code                    INTEGER,
  estimated_solicitation_date   TIMESTAMPTZ,
  estimated_award_date          TIMESTAMPTZ,
  estimated_value               BIGINT,         -- cents
  set_aside_type                set_aside_type,
  description                   TEXT,
  poc_name                      TEXT,
  poc_email                     TEXT,
  poc_phone                     TEXT,
  place_of_performance_city     TEXT,
  place_of_performance_state    TEXT,
  sam_notice_id                 TEXT UNIQUE,
  status                        TEXT DEFAULT 'active',
  linked_opportunity_id         BIGINT REFERENCES opportunities(id),
  created_at                    TIMESTAMPTZ DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI ASSISTANT (TASK_017)
-- ============================================================

CREATE TABLE assistant_conversations (
  id                    BIGSERIAL PRIMARY KEY,
  title                 TEXT,
  linked_opportunity_id BIGINT REFERENCES opportunities(id),
  messages_json         JSONB NOT NULL DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX idx_opp_source         ON opportunities(source);
CREATE INDEX idx_opp_agency         ON opportunities(agency_id);
CREATE INDEX idx_opp_deadline       ON opportunities(deadline);
CREATE INDEX idx_opp_posted         ON opportunities(posted_date);
CREATE INDEX idx_opp_threshold      ON opportunities(threshold_category);
CREATE INDEX idx_opp_naics          ON opportunities(naics_code);
CREATE INDEX idx_opp_status         ON opportunities(status);
CREATE INDEX idx_pipeline_opp       ON pipeline_items(opportunity_id);
CREATE INDEX idx_pipeline_stage     ON pipeline_items(stage);
CREATE INDEX idx_subs_uei           ON subcontractors(uei);
CREATE INDEX idx_subs_city          ON subcontractors(city);
CREATE INDEX idx_forecast_sol_date  ON forecast_opportunities(estimated_solicitation_date);
CREATE INDEX idx_incumbent_expiry   ON incumbent_contracts(period_of_performance_end_date);
CREATE INDEX idx_incumbent_recompete ON incumbent_contracts(recompete_likely_date);
