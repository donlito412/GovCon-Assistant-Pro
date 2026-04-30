-- ============================================================
-- EVENTS TABLE — TASK_013
-- Separate from opportunities/grants tables.
-- Run in Supabase SQL Editor after applying grants schema.
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE event_source AS ENUM (
    'city_council_pgh',
    'city_planning_pgh',
    'ura_pgh',
    'county_council_allegheny',
    'eventbrite',
    'pgh_business_collective',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'city_council',
    'planning',
    'ura',
    'county_council',
    'networking',
    'conference',
    'chamber',
    'workshop',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE why_relevant AS ENUM (
    'contracts_announced',
    'grants_discussed',
    'networking',
    'development_plans',
    'budget_decisions',
    'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id              BIGSERIAL PRIMARY KEY,
  source          event_source NOT NULL,
  title           TEXT NOT NULL,
  organizer       TEXT NOT NULL,
  event_type      event_type NOT NULL DEFAULT 'other',
  why_relevant    why_relevant NOT NULL DEFAULT 'general',

  event_date      DATE NOT NULL,
  end_date        DATE,
  time_start      TIME,
  time_end        TIME,

  location        TEXT,                  -- address or "Virtual"
  meeting_link    TEXT,                  -- Zoom/Teams/YouTube URL
  is_virtual      BOOLEAN NOT NULL DEFAULT FALSE,
  is_free         BOOLEAN NOT NULL DEFAULT TRUE,

  description     TEXT,
  agenda_url      TEXT,
  url             TEXT,

  -- Deduplication
  dedup_hash      TEXT UNIQUE NOT NULL,
  external_id     TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_event_date    ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_source        ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_event_type    ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_why_relevant  ON events(why_relevant);
CREATE INDEX IF NOT EXISTS idx_events_is_virtual    ON events(is_virtual);

-- Full-text search
ALTER TABLE events ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(organizer, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_events_fts ON events USING GIN(fts);

-- User saved events (pin/save feature)
CREATE TABLE IF NOT EXISTS user_saved_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id   BIGINT REFERENCES events(id) ON DELETE CASCADE,
  saved_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_events_user ON user_saved_events(user_id);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated read events"
  ON events FOR SELECT TO authenticated USING (true);

ALTER TABLE user_saved_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own saved events"
  ON user_saved_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
