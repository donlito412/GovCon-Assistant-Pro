TASK ID: 018

STATUS: PENDING

GOAL:
Build the Incumbent Tracker and Forecast Opportunities module. Incumbent tracking shows who currently holds any contract and when it expires — critical intelligence before bidding. Forecast opportunities shows what agencies plan to buy before the formal RFP drops, giving Jon time to build relationships and prepare.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
- /03_OUTPUTS/TASK_002_federal_ingestion/ (SAM.gov API client — reuse for forecasts)
- /03_OUTPUTS/TASK_007_agency_profiles/ (agency data — attach recompete intel)

OUTPUT:
/03_OUTPUTS/TASK_018_incumbent_forecast/
  - supabase_incumbents_schema.sql — incumbent_contracts, forecast_opportunities tables
  - /lib/ingestion/incumbents/fpds_lookup.ts — FPDS/USASpending incumbent lookup
  - /lib/ingestion/forecasts/samgov_forecasts.ts — SAM.gov forecast opportunities ingestion
  - /app/api/ingest/forecasts/route.ts — forecast ingestion endpoint
  - /app/(dashboard)/recompetes/page.tsx — recompete radar page
  - /app/(dashboard)/forecasts/page.tsx — forecast opportunities page
  - /components/recompetes/RecompeteCard.tsx — expiring contract card
  - /components/recompetes/IncumbentBadge.tsx — who holds it now
  - /components/recompetes/RecompeteTimeline.tsx — contract lifecycle timeline
  - /components/forecasts/ForecastCard.tsx — forecast opportunity card
  - /lib/api/recompetes.ts — recompete data hooks
  - /lib/api/forecasts.ts — forecast data hooks
  - /app/api/recompetes/route.ts — expiring contracts query endpoint
  - /app/api/forecasts/route.ts — forecast opportunities query endpoint
  - netlify.toml (updated: add forecast ingest cron — daily 06:30 ET)

---

## MODULE 1: INCUMBENT TRACKER / RECOMPETE RADAR

What it does:
For any active contract in the database, look up who currently holds it (the incumbent) using FPDS data via USASpending.gov. Then calculate when the current award expires and flag it as a recompete opportunity.

DATA SOURCE — USASpending.gov Award Search API:
- Endpoint: POST https://api.usaspending.gov/api/v2/search/spending_by_award/
- Filter by: place_of_performance_city=Pittsburgh, awarding_agency, NAICS code
- Returns: awardee name, award amount, period_of_performance_end_date, parent_award_id
- Cross-reference with active opportunities to identify recompetes

DATABASE SCHEMA — incumbent_contracts table:
- id, opportunity_id (FK → opportunities.id, nullable)
- solicitation_number
- current_awardee_name, current_awardee_uei
- award_date, award_amount
- period_of_performance_end_date (when it expires)
- base_period_months, option_periods (JSONB)
- recompete_likely_date (calculated: end_date - 6 months, when agency usually re-solicits)
- agency_name, naics_code
- usaspending_award_id
- created_at, updated_at

RECOMPETE RADAR PAGE:
- List of contracts expiring in the next 6/12/18 months in Pittsburgh area
- Filters: expiring within (30/60/90/180/365 days), NAICS, agency, value range
- RecompeteCard shows:
  - Contract title + agency
  - Current incumbent (company name + past performance badge)
  - Award value (current contract value)
  - Expiration date + countdown ("expires in 47 days")
  - Recompete likely date ("expect RFP ~June 2026")
  - "Watch This" button → adds to saved searches, alerts when RFP drops
  - "Add to Pipeline" button
- Sort by: soonest expiring, highest value, NAICS match to Jon's profile
- "My NAICS" toggle — shows only recompetes in Jon's registered NAICS codes

RecompeteCard Intelligence Panel (expanded view):
- Incumbent win history with this agency (how many times they've won)
- Agency's incumbency rate (how often they keep vs. switch vendors)
- Option year history (did they exercise all options? signals satisfaction)
- Recommended positioning: "Incumbent appears entrenched — focus on price + past performance" or "Agency has switched vendors 3 of last 4 recompetes — viable target"

---

## MODULE 2: FORECAST OPPORTUNITIES

What it does:
SAM.gov's beta forecasting section allows agencies to publish planned acquisitions 6–18 months before the formal solicitation. These are pre-solicitation notices that give contractors early intelligence to build relationships, request capability briefings, and get on the agency's radar before the RFP drops.

DATA SOURCE — SAM.gov Forecast API:
- Endpoint: GET https://api.sam.gov/opportunities/v2/search (with type=FORECAST filter)
- Filter: placeOfPerformance state=PA, Pittsburgh zip codes
- Returns: title, agency, estimated release date, estimated award date, estimated value, NAICS, set-aside type, POC name/email
- Auth: same SAM.gov API key

DATABASE SCHEMA — forecast_opportunities table:
- id, source = "federal_samgov_forecast"
- title, agency_name, naics_code
- estimated_solicitation_date (when RFP expected)
- estimated_award_date
- estimated_value
- set_aside_type
- description
- poc_name, poc_email, poc_phone (point of contact — who to call before RFP drops)
- place_of_performance_city, state
- sam_notice_id
- status (active / solicited / awarded / cancelled)
- created_at, updated_at

FORECAST PAGE:
- List of forecast opportunities filtered to Pittsburgh area
- ForecastCard shows:
  - Title + agency + NAICS
  - Estimated solicitation date ("RFP expected: August 2026")
  - Estimated value range
  - Set-aside type
  - Point of contact name + email (direct link to reach out)
  - Days until estimated RFP release
  - "Watch" button → alert when formal solicitation posted
  - "Contact POC" button → opens outreach CRM (TASK_015) pre-filled with POC info
- Filter by: NAICS, agency, estimated value, time to solicitation
- Sort by: soonest solicitation date, highest value

---

## INTEGRATION POINTS
- Recompete Radar linked from Agency Profile pages (TASK_007): "Expiring Contracts" tab on each agency
- AI Assistant (TASK_017) tool: get_expiring_contracts() + get_incumbent() use this module's data
- "Watch This Contract" on RecompeteCard → triggers saved search alert when matching RFP posted
- Forecast POC → "Contact POC" opens TASK_015 outreach CRM pre-filled
- Analytics dashboard (TASK_008): "Recompete Opportunities" widget showing top 5 expiring contracts by value

---

CONSTRAINTS:
- USASpending API calls are real — handle pagination and rate limits
- Recompete likely date = period_of_performance_end_date minus 180 days (6-month advance warning)
- Forecast data refreshed daily (agencies update estimated dates)
- Incumbent company names normalized (handle LLC/Inc/Corp variations) to avoid splitting same company
- POC contact info displayed only — not auto-contacted
- If a forecast transitions to a live solicitation: link the two records, update forecast status to "solicited"

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- ALL 18 TASKS COMPLETE — FULL PRODUCTION PLATFORM
