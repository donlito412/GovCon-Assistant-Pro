TASK ID: 012

STATUS: PENDING

GOAL:
Build the Grants module. Pull federal grants from Grants.gov API, PA state grants, URA programs, Allegheny County grants, and SBA opportunities. Display in a dedicated Grants section separate from contracts, with its own filters for eligibility, amount, and deadline.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /05_ASSETS/data_sources.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
- /03_OUTPUTS/TASK_001_scaffold/supabase_schema.sql
- /03_OUTPUTS/TASK_004_discovery_ui/ (for UI patterns to follow)

OUTPUT:
/03_OUTPUTS/TASK_012_grants/
  - supabase_grants_schema.sql — grants table schema
  - /lib/ingestion/grants/grantsgov.ts — Grants.gov API client
  - /lib/ingestion/grants/pa_grants.ts — PA.gov/DCED grants scraper
  - /lib/ingestion/grants/ura_grants.ts — URA financial assistance scraper
  - /lib/ingestion/grants/sba_grants.ts — SBA grants + SBIR scraper
  - /app/api/ingest/grants/route.ts — unified grants ingestion endpoint
  - /app/(dashboard)/grants/page.tsx — grants discovery page
  - /app/(dashboard)/grants/[id]/page.tsx — grant detail page
  - /components/grants/GrantCard.tsx — grant listing card
  - /components/grants/GrantFilterPanel.tsx — grants-specific filters
  - /lib/api/grants.ts — grants data hooks
  - /app/api/grants/route.ts — grants query endpoint
  - netlify.toml (updated: add grants cron at 07:45 ET daily)

DATABASE SCHEMA — grants table:
- id, source, title, agency, category (federal/state/local/university/foundation)
- grant_type (grant/loan/tax_credit/rebate)
- eligible_entities (small_business/nonprofit/individual/any)
- min_amount, max_amount
- application_deadline, posted_date
- description, requirements, how_to_apply
- url (link to original)
- created_at, updated_at

DATA SOURCES:
1. Grants.gov API (https://grants.gov/api/common/search2)
   - POST request, no auth needed
   - Filter: eligibility includes "small_business", PA state
   - Fields: opportunityTitle, agencyName, closeDate, awardCeiling, awardFloor, description
   - source = "federal_grantsgov"

2. PA Grants Portal (https://www.pa.gov/grants)
   - Scrape Commonwealth of PA grants listing
   - Filter for business-eligible programs
   - source = "state_pa_grants"

3. PA DCED (https://dced.pa.gov/)
   - Scrape small business + economic development grant programs
   - source = "state_pa_dced"

4. URA Programs (https://www.ura.org/pages/financial-assistance-resources)
   - Scrape all URA loans, grants, and façade programs
   - Include: Micro-Enterprise Loan Fund, Commercial Façade Grant, Minority Business funds
   - source = "local_ura"

5. SBA Grants (https://www.sba.gov/funding-programs/grants)
   - Scrape SBA grant programs relevant to small business
   - Include SBIR/STTR program listings
   - source = "federal_sba"

STEPS:
1. Add grants table to Supabase with schema above
2. Build each ingestion source
3. Build /api/grants query endpoint (filter by: category, grant_type, eligible_entities, amount range, deadline)
4. Build Grants page with:
   - GrantCard: title, agency, amount range, deadline, eligibility badge, source badge
   - GrantFilterPanel: type (grant/loan), eligibility, amount range, source (federal/state/local), deadline range
   - Sort by: deadline soonest, amount largest, most recent
5. Grant detail page: full description, eligibility requirements, how to apply, direct link
6. Grants included in saved searches and alert system (TASK_006 integration)
7. Grants shown in analytics dashboard (TASK_008 integration — separate grants KPI card)

CONSTRAINTS:
- Grants and contracts kept in separate tables (different schema needs)
- Both appear in unified search but clearly labeled with type badge (Grant vs Contract)
- Grants.gov API call must filter for Pittsburgh-area eligible grants (state=PA + national eligibility)
- All dollar amounts stored as integers in cents for precision
- Loan programs clearly distinguished from grants (grant_type field)

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_013
