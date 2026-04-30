-- ============================================================
-- GRANTS TABLE — TASK_012
-- Separate from opportunities table (different schema needs).
-- Run in Supabase SQL Editor after applying supabase_schema.sql.
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE grant_source AS ENUM (
    'federal_grantsgov',
    'federal_sba',
    'state_pa_grants',
    'state_pa_dced',
    'local_ura',
    'local_allegheny',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE grant_category AS ENUM (
    'federal',
    'state',
    'local',
    'university',
    'foundation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE grant_type AS ENUM (
    'grant',
    'loan',
    'tax_credit',
    'rebate',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE eligible_entity AS ENUM (
    'small_business',
    'nonprofit',
    'individual',
    'municipality',
    'any'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main grants table
CREATE TABLE IF NOT EXISTS grants (
  id                   BIGSERIAL PRIMARY KEY,
  source               grant_source NOT NULL,
  category             grant_category NOT NULL,
  title                TEXT NOT NULL,
  agency               TEXT NOT NULL,
  grant_type           grant_type NOT NULL DEFAULT 'grant',
  eligible_entities    eligible_entity[] DEFAULT '{"any"}',

  -- Amounts in cents for precision
  min_amount           BIGINT,
  max_amount           BIGINT,

  application_deadline TIMESTAMPTZ,
  posted_date          TIMESTAMPTZ,

  description          TEXT,
  requirements         TEXT,
  how_to_apply         TEXT,
  url                  TEXT,

  -- Deduplication
  dedup_hash           TEXT UNIQUE NOT NULL,
  external_id          TEXT,        -- source's own ID (opportunity number, program ID, etc.)

  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_grants_source              ON grants(source);
CREATE INDEX IF NOT EXISTS idx_grants_category            ON grants(category);
CREATE INDEX IF NOT EXISTS idx_grants_grant_type          ON grants(grant_type);
CREATE INDEX IF NOT EXISTS idx_grants_application_deadline ON grants(application_deadline);
CREATE INDEX IF NOT EXISTS idx_grants_status              ON grants(status);
CREATE INDEX IF NOT EXISTS idx_grants_max_amount          ON grants(max_amount);

-- Full-text search
ALTER TABLE grants ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(agency, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_grants_fts ON grants USING GIN(fts);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_grants_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grants_updated_at ON grants;
CREATE TRIGGER trg_grants_updated_at
  BEFORE UPDATE ON grants
  FOR EACH ROW EXECUTE FUNCTION update_grants_updated_at();

-- RLS (same pattern as opportunities — only service role can write)
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated read grants"
  ON grants FOR SELECT TO authenticated USING (true);
