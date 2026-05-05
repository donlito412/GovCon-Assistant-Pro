-- Migration to unify opportunities, awards, and grants per TASK_027

-- 1. Create the new ENUMs if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'record_type') THEN
        CREATE TYPE record_type AS ENUM ('opportunity', 'award', 'grant');
    END IF;

    -- Using the existing opportunity_status enum but adding values if necessary, or creating a new unified status
    -- For simplicity and safety, we'll create a new unified status enum if needed, or stick to standard text for now
    -- and rely on the application logic. Let's create a unified one for robustness.
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unified_status') THEN
         CREATE TYPE unified_status AS ENUM ('active', 'closed', 'awarded', 'cancelled', 'forecast', 'archived');
    END IF;
END$$;

-- 2. Create the unified 'records' table
CREATE TABLE IF NOT EXISTS records (
    id BIGSERIAL PRIMARY KEY,
    record_type record_type NOT NULL,
    source TEXT NOT NULL, -- e.g., 'samgov', 'usaspending', 'grantsgov', 'manual'
    title TEXT NOT NULL,
    agency_name TEXT,
    agency_id BIGINT REFERENCES agencies(id),
    solicitation_number TEXT,
    contract_number TEXT, -- Used for awards
    vendor_uei TEXT,      -- Used for awards (recipient)
    vendor_name TEXT,     -- Used for awards
    dedup_hash TEXT UNIQUE,
    canonical_sources JSONB,
    naics_code INTEGER,
    contract_type TEXT,
    set_aside_type TEXT,
    value_min BIGINT, -- in cents
    value_max BIGINT, -- in cents
    awarded_value BIGINT, -- in cents, specifically for awards
    deadline TIMESTAMPTZ,
    posted_date TIMESTAMPTZ,
    awarded_date TIMESTAMPTZ, -- specifically for awards
    place_of_performance_city TEXT,
    place_of_performance_state TEXT,
    place_of_performance_zip TEXT,
    description TEXT,
    url TEXT,
    status unified_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for the new table
CREATE INDEX IF NOT EXISTS idx_records_type ON records(record_type);
CREATE INDEX IF NOT EXISTS idx_records_agency ON records(agency_id);
CREATE INDEX IF NOT EXISTS idx_records_vendor_uei ON records(vendor_uei);
CREATE INDEX IF NOT EXISTS idx_records_deadline ON records(deadline);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);

-- Note: In a real production migration, we would run INSERT INTO records (...) SELECT ... FROM opportunities and contract_awards
-- to migrate existing data. Given the context of this task, we will start fresh or assume the ingest scripts will repopulate.

-- Let's define the migration of data from 'opportunities' and 'contract_awards' if they exist.
-- (This is commented out to prevent accidental deletion during the dry-run phase, but is the logical next step)

/*
INSERT INTO records (record_type, source, title, agency_id, solicitation_number, dedup_hash, naics_code, deadline, posted_date, place_of_performance_state, description, url, status)
SELECT 'opportunity', source::text, title, agency_id, solicitation_number, dedup_hash, naics_code, deadline, posted_date, place_of_performance_state, description, url, status::text::unified_status
FROM opportunities;

-- Drop old tables (WARNING: Destructive)
-- DROP TABLE IF EXISTS pipeline_items; -- Need to recreate foreign keys pointing to 'records'
-- DROP TABLE IF EXISTS opportunities CASCADE;
-- DROP TABLE IF EXISTS contract_awards CASCADE;
*/
