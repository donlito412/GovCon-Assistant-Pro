TASK ID: 001

STATUS: DONE

GOAL:
Scaffold the Next.js production application, initialize GitHub repository, connect Supabase database, and deploy a live skeleton to Netlify. After this task the app is live at a real URL — no prototype, production from day one.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /05_ASSETS/data_sources.md

OUTPUT:
/03_OUTPUTS/TASK_001_scaffold/
  - next.config.js
  - package.json
  - .env.example
  - tailwind.config.js
  - /app/layout.tsx
  - /app/page.tsx (home/dashboard stub)
  - /lib/supabase.ts (Supabase client)
  - /lib/types.ts (core TypeScript types)
  - README.md (setup instructions)
  - supabase_schema.sql (initial DB schema)

STEPS:
1. Create Next.js 14 app with App Router + TypeScript + Tailwind CSS
2. Install dependencies: @supabase/supabase-js, @supabase/auth-helpers-nextjs, lucide-react, date-fns, swr
3. Define TypeScript types for: Opportunity, Agency, Award, PipelineStage, SavedSearch, Alert
4. Create Supabase client (server + browser variants)
5. Write initial DB schema SQL:
   - opportunities table:
       id, source (federal_samgov / state_pa_emarketplace / local_allegheny / education_pitt / etc.)
       title, agency_name, agency_id (FK)
       solicitation_number (used for deduplication within a source)
       dedup_hash (SHA-256 of normalized title + agency + deadline — unique constraint for cross-source dedup)
       canonical_sources (JSONB array — all sources this opportunity appeared on, if duplicated)
       naics_code, naics_sector (broad sector label: IT, Construction, Professional Services, etc.)
       contract_type (RFP / RFQ / RFI / IFB / IDIQ / BPA / SBSA / Sources_Sought / Other)
       threshold_category (micro_purchase / simplified_acquisition / large_acquisition / construction_micro / construction_sat / unknown)
       set_aside_type (total_small_business / 8a / hubzone / sdvosb / wosb / edwosb / unrestricted / other)
       value_min, value_max (integer cents — separate fields for ranges)
       deadline, posted_date
       place_of_performance_city, place_of_performance_state, place_of_performance_zip
       description, url
       status (active / closed / awarded / cancelled)
       created_at, updated_at
   - agencies table (id, name, level: federal/state/local/education, website, total_spend, created_at)
   - pipeline_items table (id, opportunity_id, stage, notes_json, bid_record_id, created_at, updated_at)
   - saved_searches table (id, name, filters_json, alert_enabled, last_checked_at, created_at)
   - alerts table (id, saved_search_id, opportunity_id, sent_at)

   THRESHOLD CATEGORIES (as of October 2025 FAR update):
   - micro_purchase: value ≤ $15,000
   - simplified_acquisition: $15,001 – $350,000
   - large_acquisition: > $350,000
   - construction_micro: ≤ $2,000 (Davis-Bacon applies)
   - construction_sat: $2,001 – $2,000,000
   - unknown: value not specified in solicitation

   DEDUP LOGIC (applied at ingestion time):
   - Step 1: Check solicitation_number uniqueness within same source — skip exact duplicates
   - Step 2: Generate dedup_hash = SHA-256(lower(trim(title)) + lower(trim(agency_name)) + deadline::date)
   - Step 3: On INSERT — if dedup_hash already exists: append new source to canonical_sources array, do NOT create new row
   - Step 4: Fuzzy fallback — if title similarity > 85% AND same agency AND deadline within 3 days → flag as probable duplicate for manual review (store in dedup_candidates table)
6. Configure Netlify deployment (netlify.toml)
7. Set up .env.example with all required env vars

CONSTRAINTS:
- Use Next.js 14 App Router (not Pages Router)
- TypeScript strict mode
- No mock data — real structure only
- .env.example must document every variable
- Schema must support all sources (federal, state, local, education) via source field
- dedup_hash column must have a UNIQUE constraint in Supabase
- threshold_category must be computed and stored at ingestion time (not calculated on read)
- naics_sector mapping table must be included in schema (NAICS code range → sector label)
- dedup_candidates table included for fuzzy duplicate review
- No assumptions about credentials — use placeholder env vars

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_002
