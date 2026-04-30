-- ============================================================
-- INCUMBENT TRACKER + FORECAST SCHEMA — TASK_018
-- Tables: incumbent_contracts, forecast_opportunities
-- ============================================================

-- ── incumbent_contracts ────────────────────────────────────
CREATE TABLE IF NOT EXISTS incumbent_contracts (
  id                             BIGSERIAL PRIMARY KEY,
  opportunity_id                 BIGINT REFERENCES opportunities(id) ON DELETE SET NULL,
  solicitation_number            TEXT,

  current_awardee_name           TEXT NOT NULL,
  current_awardee_uei            TEXT,

  award_date                     DATE,
  award_amount                   BIGINT,           -- cents
  period_of_performance_end_date DATE,
  base_period_months             SMALLINT,
  option_periods                 JSONB DEFAULT '[]',
  -- [{ label: "Option 1", months: 12, exercised: true/false }]

  recompete_likely_date          DATE GENERATED ALWAYS AS
    (period_of_performance_end_date - INTERVAL '180 days') STORED,

  agency_name                    TEXT,
  naics_code                     TEXT,
  usaspending_award_id           TEXT UNIQUE,

  created_at                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ic_end_date      ON incumbent_contracts(period_of_performance_end_date);
CREATE INDEX IF NOT EXISTS idx_ic_recompete     ON incumbent_contracts(recompete_likely_date);
CREATE INDEX IF NOT EXISTS idx_ic_agency        ON incumbent_contracts(agency_name);
CREATE INDEX IF NOT EXISTS idx_ic_naics         ON incumbent_contracts(naics_code);
CREATE INDEX IF NOT EXISTS idx_ic_opportunity   ON incumbent_contracts(opportunity_id);

CREATE OR REPLACE FUNCTION update_ic_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ic_updated_at ON incumbent_contracts;
CREATE TRIGGER trg_ic_updated_at
  BEFORE UPDATE ON incumbent_contracts
  FOR EACH ROW EXECUTE FUNCTION update_ic_updated_at();

ALTER TABLE incumbent_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated users read incumbent contracts"
  ON incumbent_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Service role manages incumbent contracts"
  ON incumbent_contracts FOR ALL TO service_role USING (true);

-- ── forecast_opportunities ─────────────────────────────────
DO $$ BEGIN
  CREATE TYPE forecast_status AS ENUM ('active','solicited','awarded','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS forecast_opportunities (
  id                           BIGSERIAL PRIMARY KEY,
  source                       TEXT NOT NULL DEFAULT 'federal_samgov_forecast',
  sam_notice_id                TEXT UNIQUE,

  title                        TEXT NOT NULL,
  agency_name                  TEXT,
  naics_code                   TEXT,

  estimated_solicitation_date  DATE,
  estimated_award_date         DATE,
  estimated_value              BIGINT,           -- cents
  set_aside_type               TEXT,
  description                  TEXT,

  poc_name                     TEXT,
  poc_email                    TEXT,
  poc_phone                    TEXT,

  place_of_performance_city    TEXT,
  place_of_performance_state   TEXT DEFAULT 'PA',

  linked_opportunity_id        BIGINT REFERENCES opportunities(id) ON DELETE SET NULL,

  status                       forecast_status NOT NULL DEFAULT 'active',

  created_at                   TIMESTAMPTZ DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fo_solicitation_date ON forecast_opportunities(estimated_solicitation_date);
CREATE INDEX IF NOT EXISTS idx_fo_naics             ON forecast_opportunities(naics_code);
CREATE INDEX IF NOT EXISTS idx_fo_agency            ON forecast_opportunities(agency_name);
CREATE INDEX IF NOT EXISTS idx_fo_status            ON forecast_opportunities(status);

-- FTS on title + description
ALTER TABLE forecast_opportunities ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(agency_name,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_fo_fts ON forecast_opportunities USING GIN(fts);

CREATE OR REPLACE FUNCTION update_fo_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fo_updated_at ON forecast_opportunities;
CREATE TRIGGER trg_fo_updated_at
  BEFORE UPDATE ON forecast_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_fo_updated_at();

ALTER TABLE forecast_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated users read forecasts"
  ON forecast_opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Service role manages forecasts"
  ON forecast_opportunities FOR ALL TO service_role USING (true);

-- FK backfill after table exists
ALTER TABLE pipeline_items
  ADD COLUMN IF NOT EXISTS forecast_opportunity_id BIGINT REFERENCES forecast_opportunities(id) ON DELETE SET NULL;
