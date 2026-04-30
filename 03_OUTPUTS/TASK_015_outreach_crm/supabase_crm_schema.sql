-- ============================================================
-- CRM SCHEMA — TASK_015
-- Tables: outreach_contacts, outreach_threads, bid_records
-- Run in Supabase SQL Editor after contacts schema.
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE outreach_status AS ENUM (
    'not_contacted','sent','replied','meeting_set','teaming_agreed','declined','not_a_fit'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE email_direction AS ENUM ('outbound','inbound');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bid_status AS ENUM (
    'pending','won','lost','withdrawn','cancelled','no_award'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── outreach_contacts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach_contacts (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id          BIGINT,             -- FK → contacts.id (TASK_014) — nullable for manual entries
  contact_name        TEXT,
  company_name        TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  status              outreach_status NOT NULL DEFAULT 'not_contacted',
  first_contacted_at  TIMESTAMPTZ,
  last_activity_at    TIMESTAMPTZ,
  linked_bid_ids      JSONB DEFAULT '[]',
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oc_user_id       ON outreach_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_oc_status        ON outreach_contacts(status);
CREATE INDEX IF NOT EXISTS idx_oc_last_activity ON outreach_contacts(last_activity_at);

-- ── outreach_threads ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach_threads (
  id                  BIGSERIAL PRIMARY KEY,
  contact_id          BIGINT REFERENCES outreach_contacts(id) ON DELETE CASCADE NOT NULL,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  direction           email_direction NOT NULL DEFAULT 'outbound',
  subject             TEXT,
  body                TEXT NOT NULL,
  sent_at             TIMESTAMPTZ DEFAULT NOW(),
  from_email          TEXT,
  to_email            TEXT,
  resend_message_id   TEXT
);

CREATE INDEX IF NOT EXISTS idx_ot_contact_id ON outreach_threads(contact_id);
CREATE INDEX IF NOT EXISTS idx_ot_user_id    ON outreach_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_ot_sent_at    ON outreach_threads(sent_at);

-- ── bid_records ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bid_records (
  id                      BIGSERIAL PRIMARY KEY,
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opportunity_id          BIGINT,           -- FK → opportunities.id (nullable)
  pipeline_item_id        BIGINT,           -- FK → pipeline_items.id (nullable)

  contract_title          TEXT NOT NULL,
  agency                  TEXT NOT NULL,
  solicitation_number     TEXT,
  source                  TEXT,

  bid_submitted_date      DATE,
  bid_amount              BIGINT,           -- cents
  bid_narrative           TEXT,

  team_composition        JSONB DEFAULT '[]',
  -- [{ subcontractor_id?, company_name, role, naics?, percentage_of_work }]

  documents_submitted     JSONB DEFAULT '[]',
  -- [{ name, type, submitted_at }]

  status                  bid_status NOT NULL DEFAULT 'pending',

  award_date              DATE,
  award_amount            BIGINT,           -- cents, if won
  if_lost_winner_name     TEXT,
  if_lost_winner_amount   BIGINT,           -- cents
  if_lost_reason          TEXT,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_br_user_id           ON bid_records(user_id);
CREATE INDEX IF NOT EXISTS idx_br_status            ON bid_records(status);
CREATE INDEX IF NOT EXISTS idx_br_bid_submitted_date ON bid_records(bid_submitted_date);
CREATE INDEX IF NOT EXISTS idx_br_opportunity_id    ON bid_records(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_br_pipeline_item_id  ON bid_records(pipeline_item_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_bid_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bid_records_updated_at ON bid_records;
CREATE TRIGGER trg_bid_records_updated_at
  BEFORE UPDATE ON bid_records
  FOR EACH ROW EXECUTE FUNCTION update_bid_records_updated_at();

-- RLS (all tables are user-scoped)
ALTER TABLE outreach_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own outreach contacts"
  ON outreach_contacts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE outreach_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own outreach threads"
  ON outreach_threads FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE bid_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own bid records"
  ON bid_records FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
