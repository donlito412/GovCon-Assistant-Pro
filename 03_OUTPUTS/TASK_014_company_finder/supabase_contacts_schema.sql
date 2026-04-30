-- ============================================================
-- CONTACTS TABLE — TASK_014
-- Lightweight contact book — only companies Jon explicitly saves.
-- Run in Supabase SQL Editor after events schema.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE contact_source AS ENUM ('samgov', 'google_places', 'web_search', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contact_status AS ENUM ('saved', 'contacted', 'teaming', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS contacts (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  company_name     TEXT NOT NULL,
  contact_name     TEXT,
  email            TEXT,
  phone            TEXT,
  website          TEXT,

  address          TEXT,
  city             TEXT,
  state            TEXT DEFAULT 'PA',
  zip              TEXT,

  source           contact_source NOT NULL DEFAULT 'manual',
  uei              TEXT,               -- SAM.gov UEI if registered
  naics_codes      JSONB DEFAULT '[]',
  certifications   JSONB,              -- { "8a": true, "hubzone": false, ... }
  sam_registered   BOOLEAN NOT NULL DEFAULT FALSE,

  notes            TEXT,
  linked_bid_ids   JSONB DEFAULT '[]', -- [opportunity.id, ...]
  status           contact_status NOT NULL DEFAULT 'saved',

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id      ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status       ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_source       ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_sam_registered ON contacts(sam_registered);

-- Full-text search
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(company_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(contact_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_contacts_fts ON contacts USING GIN(fts);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON contacts;
CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_contacts_updated_at();

-- RLS — each user can only see/modify their own contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own contacts"
  ON contacts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
