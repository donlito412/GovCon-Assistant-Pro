-- ============================================================
-- GOVCON ASSISTANT PRO — AWARDS TABLE SCHEMA
-- Historical contract awards (separate from active opportunities)
-- Run this in Supabase SQL Editor FIRST
-- ============================================================

-- Drop existing if recreating (WARNING: destroys data)
-- DROP TABLE IF EXISTS contract_awards CASCADE;

-- ============================================================
-- AWARDS TABLE
-- Stores historical awarded contracts (USASpending, Allegheny County historical, etc.)
-- Separate from opportunities table which is ACTIVE solicitations only
-- ============================================================

CREATE TABLE IF NOT EXISTS contract_awards (
  id                          BIGSERIAL PRIMARY KEY,
  source                      opportunity_source NOT NULL,
  title                       TEXT NOT NULL,
  agency_id                   BIGINT REFERENCES agencies(id),
  agency_name                 TEXT,
  solicitation_number         TEXT,
  
  -- Award specific fields
  award_date                  TIMESTAMPTZ,
  award_amount                BIGINT,       -- cents
  awardee_name                TEXT,         -- who won the contract
  awardee_uei                 TEXT,         -- SAM UEI of winner
  contract_start_date         TIMESTAMPTZ,
  contract_end_date           TIMESTAMPTZ,  -- period of performance end
  
  -- Classification
  naics_code                  INTEGER,
  naics_sector                TEXT,
  contract_type               contract_type,
  set_aside_type              set_aside_type,
  
  -- Location
  place_of_performance_city   TEXT,
  place_of_performance_state  TEXT,
  place_of_performance_zip    TEXT,
  place_of_performance_county TEXT,
  
  -- Links & description
  description                 TEXT,
  url                         TEXT,
  usaspending_award_id        TEXT UNIQUE,  -- for USASpending awards
  
  -- Status tracking
  status                      TEXT DEFAULT 'awarded' CHECK (status IN ('awarded', 'cancelled', 'terminated')),
  
  -- Metadata
  external_id                 TEXT UNIQUE,  -- source-specific ID
  dedup_hash                  TEXT UNIQUE,
  canonical_sources           JSONB,
  
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_awards_source ON contract_awards(source);
CREATE INDEX IF NOT EXISTS idx_awards_agency ON contract_awards(agency_id);
CREATE INDEX IF NOT EXISTS idx_awards_award_date ON contract_awards(award_date);
CREATE INDEX IF NOT EXISTS idx_awards_awardee ON contract_awards(awardee_name);
CREATE INDEX IF NOT EXISTS idx_awards_naics ON contract_awards(naics_code);
CREATE INDEX IF NOT EXISTS idx_awards_end_date ON contract_awards(contract_end_date);
CREATE INDEX IF NOT EXISTS idx_awards_amount ON contract_awards(award_amount);

-- ============================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_contract_awards_updated_at ON contract_awards;
CREATE TRIGGER update_contract_awards_updated_at
  BEFORE UPDATE ON contract_awards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MIGRATION: Move Allegheny County historical data from opportunities
-- Run this AFTER creating the awards table
-- ============================================================

-- First, identify Allegheny County records in opportunities that should be awards
-- (These are historical contracts, not active solicitations)
-- SELECT id, title, agency_name, source, status, deadline, posted_date 
-- FROM opportunities 
-- WHERE source = 'local_allegheny';

-- Move Allegheny County records to awards table (preserving data)
INSERT INTO contract_awards (
  source,
  title,
  agency_name,
  solicitation_number,
  award_date,
  contract_start_date,
  contract_end_date,
  awardee_name,
  place_of_performance_city,
  place_of_performance_state,
  description,
  url,
  status,
  dedup_hash,
  canonical_sources
)
SELECT 
  source,
  title,
  agency_name,
  solicitation_number,
  posted_date as award_date,
  posted_date as contract_start_date,
  deadline as contract_end_date,
  -- Extract vendor from description: "Vendor: X. Department..."
  CASE 
    WHEN description LIKE 'Allegheny County contract. Vendor:%' 
    THEN trim(split_part(split_part(description, 'Vendor:', 2), '.', 1))
    ELSE NULL
  END as awardee_name,
  place_of_performance_city,
  place_of_performance_state,
  description,
  url,
  'awarded',
  dedup_hash,
  canonical_sources
FROM opportunities 
WHERE source = 'local_allegheny'
ON CONFLICT (dedup_hash) DO NOTHING;

-- Delete moved records from opportunities table
DELETE FROM opportunities 
WHERE source = 'local_allegheny' 
AND dedup_hash IN (
  SELECT dedup_hash FROM contract_awards WHERE source = 'local_allegheny'
);

-- Fix any remaining 'expired' status to 'closed' in opportunities
UPDATE opportunities 
SET status = 'closed' 
WHERE status = 'expired';

-- ============================================================
-- VERIFY MIGRATION
-- ============================================================

-- Check counts
-- SELECT 'Opportunities (active)' as table_name, count(*) as count FROM opportunities WHERE status = 'active';
-- SELECT 'Awards (all)' as table_name, count(*) as count FROM contract_awards;
-- SELECT 'Awards (Allegheny County)' as table_name, count(*) as count FROM contract_awards WHERE source = 'local_allegheny';

-- ============================================================
-- NOTE: After running this migration:
-- 1. opportunities table = ACTIVE solicitations only (SAM.gov, state, local open RFPs)
-- 2. contract_awards table = HISTORICAL awarded contracts (USASpending, Allegheny historical)
-- 3. Update your ingestion scripts to write to the correct table
-- ============================================================
