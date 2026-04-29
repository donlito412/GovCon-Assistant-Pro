TASK ID: 014

STATUS: PENDING

GOAL:
Build the Subcontractor Directory — a searchable database of Pittsburgh-area contractors and vendors that Jon can search when building a team for a specific bid. Search by NAICS code, certification type, location, and capability. Data pulled from SAM.gov Entity API, SBA DSBS, and local MWBE directories.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /05_ASSETS/data_sources.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
- /03_OUTPUTS/TASK_005_pipeline/ (for "Find Subs" button on pipeline card)

OUTPUT:
/03_OUTPUTS/TASK_014_subcontractors/
  - supabase_subcontractors_schema.sql — subcontractors table schema
  - /lib/ingestion/subs/samgov_entities.ts — SAM.gov Entity API client (search by NAICS + PA)
  - /lib/ingestion/subs/sba_dsbs.ts — SBA Dynamic Small Business Search scraper
  - /lib/ingestion/subs/phfa_mwbe.ts — Pennsylvania PHFA MWBE directory scraper
  - /lib/ingestion/subs/allegheny_mwdbe.ts — Allegheny County MWDBE directory scraper
  - /app/api/ingest/subcontractors/route.ts — unified sub ingestion endpoint
  - /app/(dashboard)/subcontractors/page.tsx — subcontractor directory page
  - /app/(dashboard)/subcontractors/[id]/page.tsx — subcontractor profile page
  - /components/subcontractors/SubCard.tsx — subcontractor listing card
  - /components/subcontractors/SubFilterPanel.tsx — filter by NAICS, cert, location
  - /components/subcontractors/SubProfileHeader.tsx — company profile header
  - /components/subcontractors/SubAwardHistory.tsx — past federal awards (USASpending)
  - /components/subcontractors/SubCertBadges.tsx — certification badges (8a, HUBZone, WOSB, SDVOSB, MWBE)
  - /components/subcontractors/FindSubsForContract.tsx — "Find Subs for This Contract" panel
  - /lib/api/subcontractors.ts — subcontractor data hooks
  - /app/api/subcontractors/route.ts — subcontractor search endpoint
  - /app/api/subcontractors/[id]/route.ts — subcontractor profile + awards
  - netlify.toml (updated: add subs ingest cron — weekly, Sunday 02:00 ET)

DATABASE SCHEMA — subcontractors table:
- id, uei (SAM.gov Unique Entity ID), cage_code
- legal_name, dba_name
- address, city, state, zip, phone, website, email
- naics_codes (JSONB array of NAICS codes they're registered for)
- primary_naics
- certifications (JSONB: { sdvosb, vosb, wosb, edwosb, hubzone, sba_8a, mwbe, dbe })
- business_types (JSONB array: small_business, veteran_owned, etc.)
- employee_count, annual_revenue_range
- registration_status (active/inactive/expired)
- registration_expiry
- capabilities_statement (text — from SAM profile)
- sources (JSONB array: samgov, sba_dsbs, phfa_mwbe, allegheny_mwdbe)
- last_award_date, total_awards_value (populated from USASpending)
- created_at, updated_at

DATA SOURCES:
1. SAM.gov Entity Management API (https://open.gsa.gov/api/entity-api/)
   - Endpoint: GET https://api.sam.gov/entity-information/v3/entities
   - Params: naicsCode, physicalAddressStateCode=PA, physicalAddressCity=Pittsburgh (+ surrounding)
   - Returns: UEI, legal name, address, NAICS codes, certifications, POC contact info
   - Auth: same SAM.gov API key (Jon already has)
   - Run weekly (entity data doesn't change daily)

2. SBA DSBS (https://dsbs.sba.gov/)
   - Scrape search results filtered to PA + Pittsburgh area
   - Supplement SAM.gov data with capabilities statements and marketing descriptions
   - Deduplicate against SAM.gov records by UEI

3. PHFA MWBE Directory (https://mwbe.phfa.org/directory/search.aspx)
   - Scrape PA Housing Finance Agency's searchable MWBE directory
   - Add MWBE certification flag to matching SAM.gov records

4. Allegheny County MWDBE (mwdbe@alleghenycounty.us — contact page)
   - Scrape county-certified minority/women/disadvantaged business list
   - Tag records with allegheny_mwdbe = true

STEPS:
1. Create subcontractors table in Supabase
2. Build SAM.gov Entity API client:
   - Paginate through all active entities in PA with Pittsburgh-area zips
   - Extract: UEI, CAGE, name, address, NAICS codes, certifications, POC name/email/phone
3. Build SBA DSBS scraper — supplement capabilities statements
4. Build PHFA MWBE scraper — add MWBE cert flags
5. Build Allegheny County MWDBE scraper — add local MWDBE flags
6. Build /api/subcontractors search endpoint:
   - Filter by: naics_code (match against JSONB array), certification type, city/zip, registration_status=active
   - Sort by: total_awards_value (most experienced first), alphabetical, registration_expiry
7. Subcontractor Directory page:
   - Search bar (company name or capability keyword)
   - Filter panel: NAICS code(s), certifications, Pittsburgh-area only toggle, active only toggle
   - SubCard: company name, primary NAICS, cert badges, city, total federal awards value, "View Profile" + "Contact" buttons
8. Subcontractor Profile page:
   - Company info, all NAICS codes, all certifications, contact info
   - Award history from USASpending (last 10 awards: agency, amount, date, description)
   - "Add to Bid Team" button (links to pipeline — see TASK_015)
   - "Send Outreach Email" button (links to TASK_015 outreach CRM)
9. "Find Subs for This Contract" panel on Pipeline cards (TASK_005 integration):
   - Auto-suggest subcontractors whose NAICS codes match the contract's NAICS code
   - Filter to Pittsburgh area, active registration, sorted by award history
   - One-click "Add to Bid Team"

CONSTRAINTS:
- SAM.gov Entity API uses same API key as Opportunities API
- Only pull active registrations (registrationStatus=Active)
- UEI is the primary deduplication key across all sources
- Contact info (email, phone) displayed only — never auto-sent without user action
- Weekly refresh is sufficient (entity data stable)
- Award history fetched from USASpending on-demand (profile page load), not stored

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_015
