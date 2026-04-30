-- ============================================================
-- COMMUNITY SCHEMA — TASK_016
-- Tables: community_profiles, teaming_posts, connection_requests, community_messages
-- Run in Supabase SQL Editor after crm schema.
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE business_type_enum AS ENUM ('LLC','sole_prop','corp','partnership','nonprofit','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE employee_range_enum AS ENUM ('1','2-5','6-10','11-50','50+');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE community_source AS ENUM ('self_registered','pa_corps_import');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE teaming_post_status AS ENUM ('open','filled','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE connection_status AS ENUM ('pending','accepted','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── community_profiles ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_profiles (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable: PA Corps stubs have no user

  business_name        TEXT NOT NULL,
  owner_name           TEXT,
  email                TEXT,
  phone                TEXT,
  website              TEXT,

  neighborhood         TEXT,
  city                 TEXT DEFAULT 'Pittsburgh',
  zip                  TEXT,

  business_type        business_type_enum,
  industry             TEXT,
  naics_codes          JSONB DEFAULT '[]',
  services_offered     JSONB DEFAULT '[]',   -- ["IT staffing", "Web development", ...]
  years_in_business    SMALLINT,
  employee_count_range employee_range_enum,

  certifications       JSONB DEFAULT '{}',   -- { mwbe: true, veteran_owned: false, ... }
  sam_registered       BOOLEAN NOT NULL DEFAULT FALSE,
  sam_uei              TEXT,

  bio                  TEXT,
  looking_for          JSONB DEFAULT '[]',   -- ["subcontractor_work","prime_teaming","suppliers","mentorship","partnerships"]
  profile_photo_url    TEXT,

  is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
  source               community_source NOT NULL DEFAULT 'self_registered',

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_user_id      ON community_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_neighborhood ON community_profiles(neighborhood);
CREATE INDEX IF NOT EXISTS idx_cp_sam          ON community_profiles(sam_registered);
CREATE INDEX IF NOT EXISTS idx_cp_verified     ON community_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_cp_source       ON community_profiles(source);

-- FTS
ALTER TABLE community_profiles ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(business_name,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(owner_name,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(industry,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(bio,'')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_cp_fts ON community_profiles USING GIN(fts);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_community_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cp_updated_at ON community_profiles;
CREATE TRIGGER trg_cp_updated_at
  BEFORE UPDATE ON community_profiles
  FOR EACH ROW EXECUTE FUNCTION update_community_profiles_updated_at();

-- Phase 1: all profiles readable by authenticated users; only owner can write
ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Community profiles readable by authenticated"
  ON community_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Users manage own community profile"
  ON community_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users update own community profile"
  ON community_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ── teaming_posts ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teaming_posts (
  id                    BIGSERIAL PRIMARY KEY,
  author_profile_id     BIGINT REFERENCES community_profiles(id) ON DELETE CASCADE NOT NULL,
  linked_opportunity_id BIGINT,  -- FK → opportunities.id (nullable)

  title                 TEXT NOT NULL,
  description           TEXT,
  contract_value_range  TEXT,
  naics_needed          JSONB DEFAULT '[]',
  certifications_needed JSONB DEFAULT '[]',
  response_deadline     DATE,
  status                teaming_post_status NOT NULL DEFAULT 'open',

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tp_author    ON teaming_posts(author_profile_id);
CREATE INDEX IF NOT EXISTS idx_tp_status    ON teaming_posts(status);
CREATE INDEX IF NOT EXISTS idx_tp_deadline  ON teaming_posts(response_deadline);

ALTER TABLE teaming_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Teaming posts readable by authenticated"
  ON teaming_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Profile owners manage own teaming posts"
  ON teaming_posts FOR ALL TO authenticated
  USING (author_profile_id IN (SELECT id FROM community_profiles WHERE user_id = auth.uid()))
  WITH CHECK (author_profile_id IN (SELECT id FROM community_profiles WHERE user_id = auth.uid()));

-- ── connection_requests ────────────────────────────────────
CREATE TABLE IF NOT EXISTS connection_requests (
  id               BIGSERIAL PRIMARY KEY,
  from_profile_id  BIGINT REFERENCES community_profiles(id) ON DELETE CASCADE NOT NULL,
  to_profile_id    BIGINT REFERENCES community_profiles(id) ON DELETE CASCADE NOT NULL,
  message          TEXT,
  status           connection_status NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (from_profile_id, to_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_cr_from   ON connection_requests(from_profile_id);
CREATE INDEX IF NOT EXISTS idx_cr_to     ON connection_requests(to_profile_id);
CREATE INDEX IF NOT EXISTS idx_cr_status ON connection_requests(status);

ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users see own connection requests"
  ON connection_requests FOR SELECT TO authenticated
  USING (
    from_profile_id IN (SELECT id FROM community_profiles WHERE user_id = auth.uid()) OR
    to_profile_id   IN (SELECT id FROM community_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "Users send connection requests"
  ON connection_requests FOR INSERT TO authenticated
  WITH CHECK (from_profile_id IN (SELECT id FROM community_profiles WHERE user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Users respond to connection requests"
  ON connection_requests FOR UPDATE TO authenticated
  USING (to_profile_id IN (SELECT id FROM community_profiles WHERE user_id = auth.uid()));

-- ── community_messages ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_messages (
  id               BIGSERIAL PRIMARY KEY,
  from_profile_id  BIGINT REFERENCES community_profiles(id) ON DELETE CASCADE NOT NULL,
  to_profile_id    BIGINT REFERENCES community_profiles(id) ON DELETE CASCADE NOT NULL,
  body             TEXT NOT NULL,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cm_from      ON community_messages(from_profile_id);
CREATE INDEX IF NOT EXISTS idx_cm_to        ON community_messages(to_profile_id);
CREATE INDEX IF NOT EXISTS idx_cm_created   ON community_messages(created_at);

ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users see own messages"
  ON community_messages FOR SELECT TO authenticated
  USING (
    from_profile_id IN (SELECT id FROM community_profiles WHERE user_id = auth.uid()) OR
    to_profile_id   IN (SELECT id FROM community_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "Users send messages"
  ON community_messages FOR INSERT TO authenticated
  WITH CHECK (from_profile_id IN (SELECT id FROM community_profiles WHERE user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS "Recipients mark messages read"
  ON community_messages FOR UPDATE TO authenticated
  USING (to_profile_id IN (SELECT id FROM community_profiles WHERE user_id = auth.uid()));
