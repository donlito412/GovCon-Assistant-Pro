# PROJECT LOG — GovCon Assistant Pro

---

## 2026-04-29

Agent: System Architect (Claude)
Task: Project initialized
Output: Full folder structure + core files created
  - /01_BRIEF/project.md
  - /01_BRIEF/agent_rules.md
  - /01_BRIEF/universal_rules.md
  - /02_TASKS/TASK_001.md through TASK_010.md
  - /04_LOGS/project_log.md
  - /05_ASSETS/data_sources.md
  - /05_ASSETS/govtribe_feature_deconstruction.md

Next Step: Execute TASK_001 — Scaffold Next.js app, init GitHub repo, connect Supabase, deploy skeleton to Netlify
Status: READY

---

## 2026-04-29 (UPDATE)

Agent: System Architect (Claude)
Task: Scope expansion — added 3 new modules + 3 new task files
Additions:
  - TASK_011: Educational institution procurement (Pitt, CMU, CCAC, PPS, Duquesne)
  - TASK_012: Grants module (Grants.gov, PA DCED, URA, SBA/SBIR)
  - TASK_013: Business meetings + events (City Council, Planning, URA, Eventbrite, networking)
  - /05_ASSETS/data_sources.md updated with 20+ real source URLs
  - /01_BRIEF/project.md updated to reflect 4-module product scope
Total tasks: 13
Status: READY — awaiting TASK_001 execution

---

## 2026-04-29 (UPDATE 2)

Agent: System Architect (Claude)
Task: Scope expansion — added subcontractor directory, outreach CRM, and bid tracker
Additions:
  - TASK_014: Subcontractor directory (SAM.gov Entity API, SBA DSBS, PHFA MWBE, Allegheny MWDBE)
  - TASK_015: Outreach CRM + Bid Tracker (email contacts, conversation tracking, bid logging, outcome recording)
  - /01_BRIEF/project.md updated — now 7 modules, 15 tasks, 20+ data sources
  - SUCCESS CRITERIA expanded to include bid tracking and win rate analytics
Total tasks: 15
Status: READY — awaiting TASK_001 execution

---

## 2026-04-29 (UPDATE 3)

Agent: System Architect (Claude)
Task: Final scope additions — categories, deduplication, local business community
Changes:
  - TASK_016 added: Local Business Community (PA Corps seed data, profile claiming, teaming board, messaging)
  - TASK_001 schema updated: added dedup_hash (UNIQUE), canonical_sources, threshold_category, naics_sector, contract_type fields
  - TASK_001 schema updated: dedup logic + threshold category definitions (Oct 2025 FAR thresholds)
  - TASK_002, TASK_003, TASK_011 constraints updated: full dedup + categorization required at ingestion
  - TASK_004 FilterPanel updated: threshold category filter, contract type filter, NAICS sector filter
  - Threshold categories (current as of Oct 2025): micro_purchase ≤$15K, simplified_acquisition $15K–$350K, large_acquisition >$350K
Total tasks: 16
Status: READY — awaiting TASK_001 execution

---

## 2026-04-29 (UPDATE 4 — FINAL)

Agent: System Architect (Claude)
Task: Added AI Assistant, Incumbent Tracker, and Forecast Opportunities
Additions:
  - TASK_017: AI Assistant — Claude-powered expert (RFP analysis, bid strategy, competitor intel, document upload, tool use against live DB)
  - TASK_018: Incumbent Tracker + Forecast Opportunities (recompete radar, FPDS incumbent lookup, SAM.gov forecast API)
  - project.md updated: 18 tasks, 9 modules, success criteria expanded
  - Eventbrite clarified: optional — for events module only, can be dropped
  - ANTHROPIC_API_KEY added as required env var
Total tasks: 18
Modules: Contracts, Grants, Events, Subcontractor Directory, Outreach CRM, Bid Tracker, Community, AI Assistant, Incumbent + Forecasts
Status: READY — awaiting TASK_001 execution

---

## 2024-05-23

Agent: Claude
Task ID: TASK_001
Task Goal: Scaffold Next.js app, Supabase schema, Netlify deploy
Output Files:
  - /03_OUTPUTS/TASK_001_scaffold/next.config.js
  - /03_OUTPUTS/TASK_001_scaffold/package.json
  - /03_OUTPUTS/TASK_001_scaffold/.env.example
  - /03_OUTPUTS/TASK_001_scaffold/tailwind.config.js
  - /03_OUTPUTS/TASK_001_scaffold/app/layout.tsx
  - /03_OUTPUTS/TASK_001_scaffold/app/page.tsx
  - /03_OUTPUTS/TASK_001_scaffold/app/globals.css
  - /03_OUTPUTS/TASK_001_scaffold/lib/supabase.ts
  - /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
  - /03_OUTPUTS/TASK_001_scaffold/README.md
  - /03_OUTPUTS/TASK_001_scaffold/supabase_schema.sql
Notes: Created the basic Next.js 14 App Router scaffolding along with a robust Supabase SQL schema conforming to the requirements (dedup, threshold categories).
Next Step: TASK_002 — Federal contracts ingestion (SAM.gov)
Status: DONE

---

## 2026-04-29 (TASK_002)

Agent: Claude
Task ID: TASK_002
Task Goal: Build SAM.gov federal data ingestion pipeline — fetch Pittsburgh-area contract opportunities, normalize, deduplicate, and upsert to Supabase. Daily cron via Netlify.
Output Files:
  - /03_OUTPUTS/TASK_002_federal_ingestion/lib/geo/pittsburgh_zips.ts
  - /03_OUTPUTS/TASK_002_federal_ingestion/lib/ingestion/samgov.ts
  - /03_OUTPUTS/TASK_002_federal_ingestion/lib/ingestion/normalize.ts
  - /03_OUTPUTS/TASK_002_federal_ingestion/app/api/ingest/federal/route.ts
  - /03_OUTPUTS/TASK_002_federal_ingestion/scripts/test_samgov_fetch.ts
  - /03_OUTPUTS/TASK_001_scaffold/netlify.toml (updated: ingest-federal cron corrected to 0 11 * * * = 06:00 ET)
Notes:
  - SAM.gov Get Opportunities v2 client with full pagination (100/page, up to 10,000 results)
  - Exponential backoff on HTTP 429 (up to 5 retries, max 60s delay)
  - Pittsburgh area zip filter applied post-fetch (Allegheny + 4 surrounding counties)
  - dedup_hash = SHA-256(lower(trim(title)) + lower(trim(agency)) + deadline_date)
  - On dedup_hash conflict: appends "federal_samgov" to canonical_sources, does NOT insert duplicate
  - threshold_category derived from baseAndAllOptionsValue (Oct 2025 FAR thresholds)
  - naics_sector derived from 2-digit NAICS prefix (matches naics_sectors table)
  - contract_type mapped from SAM.gov noticeType (Presolicitation→RFI, Solicitation→RFP, etc.)
  - POST /api/ingest/federal secured with x-ingest-secret header
  - Test script covers: zip filter, county filter, dedup hash determinism, threshold categories, contract type mapping, live API call, Pittsburgh filter on real data
Next Step: TASK_003 — State + local contracts ingestion (PA + Pittsburgh + Allegheny County + URA)
Status: DONE

---

## 2026-04-29 (TASK_003)

Agent: Claude
Task ID: TASK_003
Task Goal: Build state/local contract scrapers — PA eMarketplace, PA Treasury, Allegheny County, City of Pittsburgh
Output Files:
  - /03_OUTPUTS/TASK_003_state_local_ingestion/lib/ingestion/shared/normalize_shared.ts
  - /03_OUTPUTS/TASK_003_state_local_ingestion/lib/ingestion/pa_emarketplace.ts
  - /03_OUTPUTS/TASK_003_state_local_ingestion/lib/ingestion/pa_treasury.ts
  - /03_OUTPUTS/TASK_003_state_local_ingestion/lib/ingestion/allegheny_county.ts
  - /03_OUTPUTS/TASK_003_state_local_ingestion/lib/ingestion/pittsburgh_city.ts
  - /03_OUTPUTS/TASK_003_state_local_ingestion/app/api/ingest/state-local/route.ts
  - /03_OUTPUTS/TASK_003_state_local_ingestion/scripts/test_scrapers.ts
  - /03_OUTPUTS/TASK_001_scaffold/netlify.toml (updated: ingest-state-local cron corrected to 0 12 * * * = 07:00 ET)
Notes:
  - All scrapers use fetch + cheerio (no Puppeteer) — respects robots.txt
  - Each scraper is fully isolated: one failure does not block others
  - PA Treasury uses ASP.NET form POST with __VIEWSTATE extraction
  - City of Pittsburgh tries OpenGov JSON API first, falls back to HTML scraping, then OMB page
  - Allegheny County scrapes both Purchasing and Public Works bid pages
  - Dedup: primary on dedup_hash, secondary on solicitation_number within same source
  - Shared normalize_shared.ts: computeDedupHash, deriveThresholdCategory, mapContractType, parseDollarString, parseToIso, getNaicsSector
  - All scrapers log: started, N scraped, N new, N deduped, errors, duration
  - Test script: unit tests for shared utils + live scraper tests for all 4 sources
Next Step: TASK_004 — Contract discovery UI (search, filter, detail pages)
Status: DONE

---

## 2026-04-29 (TASK_004)

Agent: Claude
Task ID: TASK_004
Task Goal: Build contract discovery UI — searchable, filterable, sortable contract list with card/table views, detail pages, and dashboard overview
Output Files:
  - /03_OUTPUTS/TASK_004_discovery_ui/components/ui/Badge.tsx
  - /03_OUTPUTS/TASK_004_discovery_ui/components/ui/DeadlineChip.tsx
  - /03_OUTPUTS/TASK_004_discovery_ui/components/contracts/SearchBar.tsx
  - /03_OUTPUTS/TASK_004_discovery_ui/components/contracts/SortControls.tsx
  - /03_OUTPUTS/TASK_004_discovery_ui/components/contracts/FilterPanel.tsx
  - /03_OUTPUTS/TASK_004_discovery_ui/components/contracts/ContractCard.tsx
  - /03_OUTPUTS/TASK_004_discovery_ui/components/contracts/ContractTable.tsx
  - /03_OUTPUTS/TASK_004_discovery_ui/components/contracts/ContractDetail.tsx
  - /03_OUTPUTS/TASK_004_discovery_ui/lib/api/contracts.ts
  - /03_OUTPUTS/TASK_004_discovery_ui/app/api/contracts/route.ts
  - /03_OUTPUTS/TASK_004_discovery_ui/app/api/contracts/[id]/route.ts
  - /03_OUTPUTS/TASK_004_discovery_ui/app/(dashboard)/layout.tsx
  - /03_OUTPUTS/TASK_004_discovery_ui/app/(dashboard)/page.tsx
  - /03_OUTPUTS/TASK_004_discovery_ui/app/(dashboard)/contracts/page.tsx
  - /03_OUTPUTS/TASK_004_discovery_ui/app/(dashboard)/contracts/[id]/page.tsx
Notes:
  - All filter state in URL query params (shareable links, back-button safe)
  - GET /api/contracts: full-text search (title+description+agency), source/naics/sector/agency/threshold/type/set_aside/value_range/deadline_range/status filters, sort, pagination
  - Card view and table view toggle (LayoutGrid / List)
  - FilterPanel: collapsible sections for source (grouped), threshold (radio), contract type (multi-checkbox), NAICS sector (multi-checkbox), set-aside (multi-checkbox), dollar range inputs, deadline date pickers
  - Badge system: source-color-coded, contract type, threshold category, set-aside, status
  - DeadlineChip: red <7 days, yellow 7-14 days, green >14 days, gray = no deadline
  - ContractDetail: full metadata layout, expandable description, external link, Add to Pipeline + Save Search CTAs
  - Dashboard: server-side stats (total active, due this week, added today, pipeline count), recent + urgent deadline lists
  - 25 per page, paginated with prev/next + page numbers
  - Loading skeletons, empty states, error states all handled
  - Mobile responsive layout throughout
Next Step: TASK_005 — Pipeline Kanban board
Status: DONE

---

## 2026-04-29 (TASK_005)

Agent: Claude
Task ID: TASK_005
Task Goal: Build Pipeline Kanban board — drag-and-drop opportunity tracking from Identified to Won/Lost
Output Files:
  - /03_OUTPUTS/TASK_005_pipeline/lib/api/pipeline.ts
  - /03_OUTPUTS/TASK_005_pipeline/app/api/pipeline/route.ts
  - /03_OUTPUTS/TASK_005_pipeline/app/api/pipeline/[id]/route.ts
  - /03_OUTPUTS/TASK_005_pipeline/app/api/pipeline/[id]/notes/route.ts
  - /03_OUTPUTS/TASK_005_pipeline/components/pipeline/StageSelector.tsx
  - /03_OUTPUTS/TASK_005_pipeline/components/pipeline/AddNoteForm.tsx
  - /03_OUTPUTS/TASK_005_pipeline/components/pipeline/PipelineCard.tsx
  - /03_OUTPUTS/TASK_005_pipeline/components/pipeline/PipelineCardDetail.tsx
  - /03_OUTPUTS/TASK_005_pipeline/components/pipeline/PipelineColumn.tsx
  - /03_OUTPUTS/TASK_005_pipeline/components/pipeline/PipelineBoard.tsx
  - /03_OUTPUTS/TASK_005_pipeline/app/(dashboard)/pipeline/page.tsx
Notes:
  - DnD via @hello-pangea/dnd (React 18 compatible)
  - 8 stages: Identified → Qualifying → Pursuing → Proposal In Progress → Submitted → Won → Lost → No Bid
  - Optimistic UI: card moves instantly, reverts with error message if Supabase write fails
  - Column header shows item count + total $ tracked per stage
  - Cards sorted by deadline ascending within each column
  - Deadline countdown: red <7 days, yellow <14 days, green otherwise
  - PipelineCardDetail slide-out: stage selector, full metadata, timestamped notes log, add note form, remove from pipeline, link to full contract detail
  - Notes stored as JSONB array [{text, created_at}] in pipeline_items.notes_json
  - POST /api/pipeline guards against duplicate additions (409 if already in pipeline)
  - Empty state with CTA to browse contracts
  - Keyboard accessible (Escape closes detail panel)
Next Step: TASK_006
Status: DONE

---

## 2026-04-29 (TASK_006)

Agent: Claude
Task ID: TASK_006
Task Goal: Build Saved Searches + Alerts system — save filter combos as named searches, email alerts via Resend when new matches posted
Output Files:
  - /03_OUTPUTS/TASK_006_saved_searches/lib/api/saved-searches.ts
  - /03_OUTPUTS/TASK_006_saved_searches/lib/email/alert-email.tsx
  - /03_OUTPUTS/TASK_006_saved_searches/app/api/saved-searches/route.ts
  - /03_OUTPUTS/TASK_006_saved_searches/app/api/saved-searches/[id]/route.ts
  - /03_OUTPUTS/TASK_006_saved_searches/app/api/alerts/run/route.ts
  - /03_OUTPUTS/TASK_006_saved_searches/components/saved-searches/SaveSearchModal.tsx
  - /03_OUTPUTS/TASK_006_saved_searches/components/saved-searches/AlertPreferences.tsx
  - /03_OUTPUTS/TASK_006_saved_searches/components/saved-searches/SavedSearchCard.tsx
  - /03_OUTPUTS/TASK_006_saved_searches/app/(dashboard)/saved-searches/page.tsx
  - /03_OUTPUTS/TASK_001_scaffold/netlify.toml (fixed run-alerts cron to 13:00 UTC = 08:00 ET)
Notes:
  - Email via Resend (RESEND_API_KEY env var); from ALERT_FROM_EMAIL → to ALERT_TO_EMAIL
  - React Email template: gradient header, per-contract cards with title/agency/value/deadline, Browse All CTA
  - Alert run is idempotent: alerts table deduplicates by (saved_search_id, opportunity_id) — safe to re-run
  - Manual trigger supported via x-cron-secret header (CRON_SECRET env var)
  - Filters stored as JSON are exact replica of URL params (q, source, naics, threshold, contract_type, set_aside, min_value, max_value, deadline_after, deadline_before)
  - SaveSearchModal: shows active filter summary, name input, alert toggle (switch)
  - AlertPreferences: optimistic inline toggle per card
  - SavedSearchCard: filter summary, last checked timestamp, match count badge, Browse Matches link, delete
  - Saved Searches page: grid of cards, alert summary banner, how-alerts-work info box, empty state
  - Cron order: federal 11:00 UTC → state/local 12:00 UTC → alerts 13:00 UTC (all ET: 6am/7am/8am)
  - Required new deps: resend, @react-email/components, @react-email/render
Next Step: TASK_007
Status: DONE

---

## 2026-04-29 (TASK_007)

Agent: Claude
Task ID: TASK_007
Task Goal: Build Agency Profile pages — directory, detail/profile page, spending chart, NAICS breakdown, active contracts, award history from USASpending
Output Files:
  - /03_OUTPUTS/TASK_007_agency_profiles/lib/api/agencies.ts
  - /03_OUTPUTS/TASK_007_agency_profiles/app/api/agencies/route.ts
  - /03_OUTPUTS/TASK_007_agency_profiles/app/api/agencies/[id]/route.ts
  - /03_OUTPUTS/TASK_007_agency_profiles/app/api/agencies/[id]/awards/route.ts
  - /03_OUTPUTS/TASK_007_agency_profiles/components/agencies/AgencyCard.tsx
  - /03_OUTPUTS/TASK_007_agency_profiles/components/agencies/AgencyHeader.tsx
  - /03_OUTPUTS/TASK_007_agency_profiles/components/agencies/SpendingChart.tsx
  - /03_OUTPUTS/TASK_007_agency_profiles/components/agencies/TopNaicsList.tsx
  - /03_OUTPUTS/TASK_007_agency_profiles/components/agencies/ActiveContractsList.tsx
  - /03_OUTPUTS/TASK_007_agency_profiles/components/agencies/AwardHistory.tsx
  - /03_OUTPUTS/TASK_007_agency_profiles/app/(dashboard)/agencies/page.tsx
  - /03_OUTPUTS/TASK_007_agency_profiles/app/(dashboard)/agencies/[id]/page.tsx
Notes:
  - Agency directory: filter by level (tabs), sort by active count/spend/name, search by name
  - Agency stats computed on-the-fly from opportunities table (active_count, active_value_cents, NAICS breakdown, type breakdown)
  - Agency detail: tabbed layout — Active Contracts | NAICS Breakdown | Award History
  - SpendingChart: recharts BarChart of contract type breakdown with color-coded bars and hover tooltips
  - TopNaicsList: recharts horizontal BarChart + detail table (code, sector, count, value)
  - AwardHistory: client-side SWR fetch to /api/agencies/[id]/awards → USASpending.gov
  - USASpending API: POST /api/v2/search/spending_by_award/ filtered to awarding_agency_name + place_of_performance Pittsburgh, last 5 years, sorted by amount desc
  - Awards route handles 429 rate limiting with exponential backoff retry (3 attempts)
  - Awards route fails gracefully (returns empty awards array, not 500) — award history is supplementary
  - Awards cached for 1 hour (stable data); agency list/detail cached 2 min
  - Required new dep: recharts
Next Step: TASK_008
Status: DONE

---

## 2026-04-29 (TASK_008)

Agent: Claude
Task ID: TASK_008
Task Goal: Build Analytics Dashboard — KPI cards, source breakdown, volume chart, NAICS spend, deadline radar, pipeline chart, top agencies
Output Files:
  - /03_OUTPUTS/TASK_008_analytics/lib/api/analytics.ts
  - /03_OUTPUTS/TASK_008_analytics/app/api/analytics/route.ts
  - /03_OUTPUTS/TASK_008_analytics/components/analytics/StatCard.tsx
  - /03_OUTPUTS/TASK_008_analytics/components/analytics/ContractsBySourceChart.tsx
  - /03_OUTPUTS/TASK_008_analytics/components/analytics/ContractVolumeChart.tsx
  - /03_OUTPUTS/TASK_008_analytics/components/analytics/SpendingByNaicsChart.tsx
  - /03_OUTPUTS/TASK_008_analytics/components/analytics/DeadlineRadar.tsx
  - /03_OUTPUTS/TASK_008_analytics/components/analytics/PipelineValueChart.tsx
  - /03_OUTPUTS/TASK_008_analytics/components/analytics/TopAgenciesTable.tsx
  - /03_OUTPUTS/TASK_008_analytics/app/(dashboard)/analytics/page.tsx
Notes:
  - Single /api/analytics endpoint runs 10 Supabase queries in parallel via Promise.all — fast single round-trip
  - KPIs: total active, new this week, total active value, soonest deadline (days + title), pipeline total value, win rate (only shown if >=3 outcomes)
  - ContractsBySourceChart: recharts PieChart (donut) grouped into Federal/State/Local/Education
  - ContractVolumeChart: recharts LineChart, 12-week buckets with average reference line
  - SpendingByNaicsChart: recharts horizontal BarChart, top 10 NAICS by total value (cents), color-coded
  - DeadlineRadar: accordion buckets (0-7/8-30/31-60/61-90 days), expandable item lists with value + date, "This Week" bucket auto-expanded
  - PipelineValueChart: recharts BarChart per stage, stage-colored bars, empty state with CTA
  - TopAgenciesTable: ranked table with mini progress bar, links to filtered contracts page
  - SWR auto-refresh every 5 minutes; manual Refresh button
  - Win rate: only displayed when won+lost >= 3; shows "Need ≥3 outcomes" otherwise
Next Step: TASK_009
Status: DONE

---

## 2026-04-29 (TASK_009)

Agent: Claude
Task ID: TASK_009
Task Goal: Build authentication (Supabase Auth email/password) + settings page (profile, notifications, API keys, data refresh status)
Output Files:
  - /03_OUTPUTS/TASK_009_auth/middleware.ts
  - /03_OUTPUTS/TASK_009_auth/lib/auth/session.ts
  - /03_OUTPUTS/TASK_009_auth/app/(auth)/layout.tsx
  - /03_OUTPUTS/TASK_009_auth/app/(auth)/login/page.tsx
  - /03_OUTPUTS/TASK_009_auth/app/api/settings/route.ts
  - /03_OUTPUTS/TASK_009_auth/components/settings/ProfileForm.tsx
  - /03_OUTPUTS/TASK_009_auth/components/settings/NotificationPreferences.tsx
  - /03_OUTPUTS/TASK_009_auth/components/settings/ApiKeysPanel.tsx
  - /03_OUTPUTS/TASK_009_auth/components/settings/DataRefreshStatus.tsx
  - /03_OUTPUTS/TASK_009_auth/app/(dashboard)/settings/page.tsx
Notes:
  - middleware.ts uses createMiddlewareClient from @supabase/auth-helpers-nextjs — refreshes session cookie on every request
  - All non-public routes redirect to /login; API routes return 401 JSON
  - Public paths: /login, /_next, /favicon.ico, /api/auth
  - ?redirect= param preserved so user lands on intended page after login
  - Authenticated user on /login → redirected to /
  - session.ts: getSession(), getUser(), requireAuth() (redirects), signOut() — all server-side
  - Auth layout: dark gradient background with subtle grid overlay, no sidebar/header
  - Login page: email + password, show/hide password toggle, friendly error messages
  - settings/route.ts: GET returns settings (never includes SAM key); PATCH upserts via onConflict user_id
  - SAM.gov API key: calls vault_store_sam_api_key Supabase RPC (pgsodium); never stored plaintext; only key hint returned
  - ProfileForm: display name update + password change (supabase.auth.updateUser)
  - NotificationPreferences: alert email + daily/immediate frequency toggle
  - ApiKeysPanel: masked input, show/hide, encrypted storage note, key hint display
  - DataRefreshStatus: SWR polling /api/ingestion-status every 60s; graceful fallback if table not yet populated
  - Settings page: tabbed layout — Profile | Notifications | API Keys | Data Refresh; Sign Out button
Next Step: TASK_010
Status: DONE

---

## 2026-04-29 (TASK_010)

Agent: Claude
Task ID: TASK_010
Task Goal: Final production deployment — GitHub Actions CI, migration script, first-run seed script, deployment checklist, production runbook
Output Files:
  - /03_OUTPUTS/TASK_010_deployment/.github/workflows/deploy.yml
  - /03_OUTPUTS/TASK_010_deployment/scripts/run_migrations.ts
  - /03_OUTPUTS/TASK_010_deployment/scripts/seed_first_run.ts
  - /03_OUTPUTS/TASK_010_deployment/DEPLOYMENT_CHECKLIST.md
  - /03_OUTPUTS/TASK_010_deployment/PRODUCTION_RUNBOOK.md
  - /03_OUTPUTS/TASK_010_deployment/netlify.toml (final copy)
Notes:
  - CI workflow: lint + type-check on every PR; build check on push to main (uses GitHub Secrets)
  - run_migrations.ts: explains Supabase DDL limitations, provides 3 migration paths (CLI/psql/dashboard), verifies connection
  - seed_first_run.ts: triggers federal + state/local ingest via POST with x-ingest-secret header, 2-min timeout per source, summary table with record counts
  - DEPLOYMENT_CHECKLIST.md: 6-phase checklist (Supabase → GitHub → Netlify → First Ingestion → Functional Verification → Custom Domain), all env vars listed, curl commands for manual triggers
  - PRODUCTION_RUNBOOK.md: full operator guide covering routine maintenance, troubleshooting (9 common issues), code update procedures, SQL reference queries, Vault setup SQL, cost breakdown, emergency resources
  - All env vars documented with generation commands (openssl rand -hex 32 for secrets)
  - netlify.toml final: all cron jobs configured for TASK_002 through TASK_018 scope
Next Step: PROJECT IS LIVE (TASK_001–010 complete)
Status: DONE

---

## 2026-04-29 (SCOPE UPDATE — TASK_014 + TASK_017 REDESIGNED)

Agent: Claude
Task: Scope update per Jon's direction — redesigned two pending tasks before execution

Changes:
  TASK_014 — Subcontractor Directory → renamed to On-Demand Company Finder
    - Removed: weekly batch ingestion cron, standing directory database, static entity pages
    - Added: live on-demand search across SAM.gov Entity API + Google Places API + web search
    - Added: finds ANY company (government-registered or not) — not limited to SAM/SBA registries
    - Added: lightweight contact book (companies Jon saves/interacts with)
    - Added: approval-based actions throughout — Jon approves every save, add-to-team, or contact action
    - New env vars required: GOOGLE_PLACES_API_KEY, SEARCH_API_KEY

  TASK_017 — AI Assistant expanded significantly
    - Added: full solicitation analysis — reads entire RFP/PDF and returns all requirements, subcontracting rules (FAR clauses, self-performance %, prohibited scopes), key dates/deliverables, evaluation criteria, red flags
    - Added: pricing intelligence tool — queries USASpending.gov for historical award data ("what did similar contracts go for in Pittsburgh?")
    - Added: on-demand company search tool — searches SAM.gov + Google Places + web for any company
    - Updated: AI presents all requirements — does NOT make go/no-go decisions — Jon decides everything
    - Updated: all AI actions are approval-based — AI suggests, Jon approves before anything executes
    - Locked in: war room philosophy — platform is Jon's complete boardroom, everything happens here

Reason: Jon requires the platform to be a complete command center. All decisions belong to Jon. AI surfaces facts and options, Jon acts.

---

## 2026-04-29 (TASK_011)

Agent: Claude
Task ID: TASK_011
Task Goal: Build education institution procurement scrapers — Pitt, CMU, CCAC, PGH Schools, Duquesne
Output Files:
  - /03_OUTPUTS/TASK_011_education_ingestion/lib/ingestion/shared/normalize_education.ts
  - /03_OUTPUTS/TASK_011_education_ingestion/lib/ingestion/education/pitt.ts
  - /03_OUTPUTS/TASK_011_education_ingestion/lib/ingestion/education/cmu.ts
  - /03_OUTPUTS/TASK_011_education_ingestion/lib/ingestion/education/ccac.ts
  - /03_OUTPUTS/TASK_011_education_ingestion/lib/ingestion/education/pgh_schools.ts
  - /03_OUTPUTS/TASK_011_education_ingestion/lib/ingestion/education/duquesne.ts
  - /03_OUTPUTS/TASK_011_education_ingestion/app/api/ingest/education/route.ts
  - /03_OUTPUTS/TASK_011_education_ingestion/scripts/test_education_scrapers.ts
  - /03_OUTPUTS/TASK_001_scaffold/netlify.toml (fixed education cron: 30 12 * * * = 12:30 UTC = 07:30 ET)
Notes:
  - All 5 scrapers use fetch + cheerio — no Puppeteer
  - Each scraper isolated: failure of one does not block others
  - All scrapers follow 3-tier fallback: (1) table rows, (2) content block selectors, (3) link scan
  - normalize_education.ts: re-exports all TASK_003 shared utils + adds inferNaicsSectorFromKeywords (14 keyword patterns) + education-typed ScrapedOpportunity with category='education'
  - dedup_hash: SHA-256(lower(title) + lower(institution) + deadline_date) — same algo as TASK_002/003
  - On dedup collision: appends source to canonical_sources, does not insert duplicate
  - category = 'education' set on all records for UI filtering
  - threshold_category = 'unknown' where value not available (education sites rarely publish estimates)
  - API route runs all 5 scrapers via Promise.allSettled (parallel), upserts in batches of 50
  - Supports both POST (manual trigger via x-ingest-secret) and GET (Netlify cron via x-netlify-scheduled-function-secret)
  - Test script: --source flag for individual scraper testing, verifies dedup_hash determinism, summary table
  - Cron sequence: federal 11:00 → state/local 12:00 → education 12:30 → alerts 13:00 UTC
Next Step: TASK_012
Status: DONE

---

## 2026-04-29 (TASK_012)

Agent: Claude
Task ID: TASK_012
Task Goal: Build Grants module — Grants.gov API, PA grants, URA programs, SBA grants; full UI with filters and detail page
Output Files:
  - /03_OUTPUTS/TASK_012_grants/supabase_grants_schema.sql
  - /03_OUTPUTS/TASK_012_grants/lib/ingestion/grants/types.ts
  - /03_OUTPUTS/TASK_012_grants/lib/ingestion/grants/grantsgov.ts
  - /03_OUTPUTS/TASK_012_grants/lib/ingestion/grants/pa_grants.ts
  - /03_OUTPUTS/TASK_012_grants/lib/ingestion/grants/ura_grants.ts
  - /03_OUTPUTS/TASK_012_grants/lib/ingestion/grants/sba_grants.ts
  - /03_OUTPUTS/TASK_012_grants/app/api/ingest/grants/route.ts
  - /03_OUTPUTS/TASK_012_grants/app/api/grants/route.ts
  - /03_OUTPUTS/TASK_012_grants/app/api/grants/[id]/route.ts
  - /03_OUTPUTS/TASK_012_grants/lib/api/grants.ts
  - /03_OUTPUTS/TASK_012_grants/components/grants/GrantCard.tsx
  - /03_OUTPUTS/TASK_012_grants/components/grants/GrantFilterPanel.tsx
  - /03_OUTPUTS/TASK_012_grants/app/(dashboard)/grants/page.tsx
  - /03_OUTPUTS/TASK_012_grants/app/(dashboard)/grants/[id]/page.tsx
  - /03_OUTPUTS/TASK_001_scaffold/netlify.toml (grants cron fixed: 45 12 * * * = 12:45 UTC = 07:45 ET)
Notes:
  - Separate grants table (not opportunities) — different schema: eligible_entities[], grant_type, how_to_apply, requirements
  - All amounts stored as integer cents for precision
  - Grants.gov: POST /api/common/search2, filters small_business eligibility, paginated (up to 250 results)
  - PA grants: scrapes pa.gov/grants + dced.pa.gov/business-assistance; returns two separate GrantIngestionResult objects
  - URA: 4 known programs hard-coded as reliable seed (Micro-Enterprise Loan, Façade Grant, Minority Business, Storefront Renovation) + live scrape for new programs
  - SBA: 5 known programs hard-coded (SBIR, STTR, Community Advantage Loan, Microloan, STEP Export Grants) + live scrape
  - Ingest route: all 4 sources via Promise.allSettled, upsert with onConflict: dedup_hash
  - Query API: full-text search (fts column), filter by category/grant_type/eligible_entity/source/amount range/deadline range, sort by deadline/amount/recent, paginated
  - GrantCard: category + type badge, amount range, deadline chip (red/amber/green), eligibility tags, description preview
  - GrantFilterPanel: sort, source (3), type (4), eligibility (4), amount range inputs, deadline date pickers, clear button
  - Grants page: search bar with debounce, sidebar filters, result count, grid, pagination
  - Detail page: header with apply CTA, stat grid, description/requirements/how-to-apply sections
  - Cron sequence: federal 11:00 → state/local 12:00 → education 12:30 → grants 12:45 → alerts 13:00 UTC
Next Step: TASK_013
Status: DONE

---

## 2026-04-29 (TASK_013) — PROJECT CORE COMPLETE

Agent: Claude
Task ID: TASK_013
Task Goal: Build Business Meetings & Events module — 6 sources, calendar + list UI, .ics export, pin/save
Output Files:
  - /03_OUTPUTS/TASK_013_events/supabase_events_schema.sql
  - /03_OUTPUTS/TASK_013_events/lib/ingestion/events/types.ts
  - /03_OUTPUTS/TASK_013_events/lib/ingestion/events/city_council.ts
  - /03_OUTPUTS/TASK_013_events/lib/ingestion/events/city_planning.ts
  - /03_OUTPUTS/TASK_013_events/lib/ingestion/events/ura_meetings.ts
  - /03_OUTPUTS/TASK_013_events/lib/ingestion/events/allegheny_council.ts
  - /03_OUTPUTS/TASK_013_events/lib/ingestion/events/eventbrite.ts
  - /03_OUTPUTS/TASK_013_events/lib/ingestion/events/pgh_business_collective.ts
  - /03_OUTPUTS/TASK_013_events/app/api/ingest/events/route.ts
  - /03_OUTPUTS/TASK_013_events/app/api/events/route.ts
  - /03_OUTPUTS/TASK_013_events/lib/api/events.ts
  - /03_OUTPUTS/TASK_013_events/components/events/EventCard.tsx
  - /03_OUTPUTS/TASK_013_events/components/events/EventCalendar.tsx
  - /03_OUTPUTS/TASK_013_events/components/events/EventFilterPanel.tsx
  - /03_OUTPUTS/TASK_013_events/app/(dashboard)/events/page.tsx
  - /03_OUTPUTS/TASK_001_scaffold/netlify.toml (events: 0 13 * * *, alerts shifted to 30 13 * * *)
Notes:
  - Events table: separate from opportunities/grants — has event_date, time_start/end, location, meeting_link, is_virtual, is_free, agenda_url, why_relevant enum, user_saved_events join table
  - 4 gov meeting scrapers (city_council, city_planning, ura, allegheny_council): table-row extraction with month-name fallback regex scan; skips past events; extracts agenda links
  - Eventbrite: uses /v3/events/search/ API with Pittsburgh 30mi radius, business category, future events; requires EVENTBRITE_API_KEY env var; graceful skip if key missing
  - PGH Business Collective: 6-selector cascade (article, .event-item, .tribe-event, etc.) + link scan fallback; extracts date from datetime attributes or text
  - detectWhyRelevant(): keywords map to contracts_announced / grants_discussed / development_plans / budget_decisions / networking
  - ICS export: generateIcs() builds RFC 5545 VCALENDAR string; downloadIcs() creates blob URL and triggers browser download — compatible with Google, Apple, Outlook
  - EventCalendar: pure React monthly grid, no external calendar library; event dots colored by event_type; click day to expand event cards below
  - EventFilterPanel: date range, event type (7 options), why_relevant (5 options), virtual/in-person toggle, free-only toggle
  - Events page: list/calendar view toggle; list view grouped by week with weekLabel headers; pagination; saved/pin state via local Set (persisted to user_saved_events table in future)
  - user_saved_events table: RLS scoped per user_id; UNIQUE(user_id, event_id) constraint
  - Final cron sequence: federal 11:00 → state/local 12:00 → education 12:30 → grants 12:45 → events 13:00 → alerts 13:30 UTC
  - EVENTBRITE_API_KEY must be added to .env.example and Netlify environment variables
Status: DONE

*** PROJECT CORE COMPLETE — TASKS 001–013 ALL DONE ***

---

## 2026-04-29 (TASK_014)

Agent: Claude
Task ID: TASK_014
Task Goal: Build On-Demand Company Finder — live search across SAM.gov + Google Places + Brave Web; approval-gated contact book
Output Files:
  - /03_OUTPUTS/TASK_014_company_finder/supabase_contacts_schema.sql
  - /03_OUTPUTS/TASK_014_company_finder/lib/search/samgov_entities.ts
  - /03_OUTPUTS/TASK_014_company_finder/lib/search/google_places.ts
  - /03_OUTPUTS/TASK_014_company_finder/lib/search/company_search.ts
  - /03_OUTPUTS/TASK_014_company_finder/app/api/company-search/route.ts
  - /03_OUTPUTS/TASK_014_company_finder/app/api/contacts/route.ts
  - /03_OUTPUTS/TASK_014_company_finder/app/api/contacts/[id]/route.ts
  - /03_OUTPUTS/TASK_014_company_finder/lib/api/company-search.ts
  - /03_OUTPUTS/TASK_014_company_finder/components/company-finder/CompanySearchResult.tsx
  - /03_OUTPUTS/TASK_014_company_finder/components/company-finder/CompanySearchPanel.tsx
  - /03_OUTPUTS/TASK_014_company_finder/components/contacts/ContactCard.tsx
  - /03_OUTPUTS/TASK_014_company_finder/app/(dashboard)/contacts/page.tsx
Notes:
  - Model: on-demand live search only — NO pre-loaded directory, NO weekly cron
  - samgov_entities.ts: queries /entity-information/v3/entities by keyword + naicsCode + PA state; cert filter via businessTypeCode; parses UEI, NAICS list, certs (8a/hubzone/sdvosb/wosb/edwosb/mwdbe), POC contact
  - google_places.ts: Text Search API + Details API (max 5 detail calls to limit quota); parses address components; returns phone, website, category, rating; marks sam_registered=false
  - company_search.ts: runs all 3 sources via Promise.allSettled; normalizes to CompanyResult[]; deduplicates by name prefix similarity; sorts SAM-first if requireCertified, else by score
  - Brave Search: BRAVE_SEARCH_API_KEY or SEARCH_API_KEY; graceful skip if key missing
  - /api/company-search: POST endpoint; validates query min 2 chars; returns {results, sources, errors}
  - /api/contacts: GET with fts/status/source/sam_registered filters + pagination; POST to save (user_id scoped); RLS enforced
  - /api/contacts/[id]: GET/PATCH/DELETE; whitelist of patchable fields; RLS enforced
  - Approval model: CompanySearchResult shows pending action panel (save/add-to-bid) before executing; Jon must click "Confirm Save" — nothing executes without approval
  - CompanySearchPanel: embeddable in pipeline card (compact=true + bidId) or standalone; NAICS filter + cert checkboxes + requireCertified toggle
  - ContactCard: inline status selector (saved/contacted/teaming/declined); cert badges; linked bids count; 3-dot menu for edit/delete
  - Contacts page: search + status/source/SAM filters; toggleable inline CompanySearchPanel; grid of ContactCards
  - Env vars required: SAMGOV_API_KEY (already set), GOOGLE_PLACES_API_KEY (new), BRAVE_SEARCH_API_KEY (new)
Next Step: TASK_015
Status: DONE

---

## 2026-04-30 (TASK_015) — ALL 15 TASKS COMPLETE

Agent: Claude
Task ID: TASK_015
Task Goal: Build Outreach CRM + Bid Tracker — email conversations, bid logging, team builder, win/loss outcomes
Output Files:
  - /03_OUTPUTS/TASK_015_outreach_crm/supabase_crm_schema.sql
  - /03_OUTPUTS/TASK_015_outreach_crm/lib/email/outreach-email.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/app/api/outreach/route.ts
  - /03_OUTPUTS/TASK_015_outreach_crm/app/api/outreach/[id]/route.ts
  - /03_OUTPUTS/TASK_015_outreach_crm/app/api/outreach/[id]/emails/route.ts
  - /03_OUTPUTS/TASK_015_outreach_crm/app/api/bids/route.ts
  - /03_OUTPUTS/TASK_015_outreach_crm/app/api/bids/[id]/route.ts
  - /03_OUTPUTS/TASK_015_outreach_crm/lib/api/outreach.ts
  - /03_OUTPUTS/TASK_015_outreach_crm/lib/api/bids.ts
  - /03_OUTPUTS/TASK_015_outreach_crm/components/outreach/OutreachStatusBadge.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/components/outreach/ContactCard.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/components/outreach/ComposeEmail.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/components/outreach/ThreadView.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/components/bids/BidStats.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/components/bids/BidCard.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/components/bids/BidTeamBuilder.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/components/bids/SubmitBidForm.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/components/bids/BidOutcomeForm.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/components/bids/BidDetailPanel.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/app/(dashboard)/outreach/page.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/app/(dashboard)/outreach/[contactId]/page.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/app/(dashboard)/bids/page.tsx
  - /03_OUTPUTS/TASK_015_outreach_crm/app/(dashboard)/bids/[bidId]/page.tsx
Notes:
  - Schema: 3 tables (outreach_contacts, outreach_threads, bid_records) all RLS-scoped per user_id
  - outreach_contacts: status enum (7 values), linked_bid_ids JSONB, last_activity_at tracked on every email send
  - outreach_threads: direction (outbound/inbound), stores resend_message_id for tracking; log inbound via POST direction=inbound
  - bid_records: team_composition JSONB [{company_name, role, naics, pct, certifications[]}]; documents_submitted JSONB; all amounts in cents
  - outreach-email.tsx: React Email template; line-break body; sender/recipient context; opt-out footer
  - /api/outreach/[id]/emails POST: sends via Resend for outbound (renders React Email → HTML); logs both outbound+inbound to outreach_threads; auto-updates contact status
  - BidTeamBuilder: row-by-row member entry; expandable NAICS + cert panel per member; running % total with color feedback; team cert aggregate display
  - BidStats: 5 tiles (total/win rate/won/pending/avg); win rate hidden until >= 3 resolved bids to avoid misleading %
  - BidOutcomeForm: outcome selector (5 statuses); won shows award amount; lost shows winner+amount+debriefing; withdrawn/no-award shows notes
  - BidDetailPanel: timeline view (sourced → submitted → awarded); team table with cert badges; documents list; strategy notes; lessons learned; inline outcome form
  - OutreachContactCard: quick status-move buttons (up to 3 next stages); follow-up badge if status=sent AND last_activity >= 5 days ago
  - Thread page (/outreach/[contactId]): status pipeline bar; compose/log-reply toggle; ThreadView shows chat-bubble UI (outbound=blue right, inbound=white left)
  - Bids page (/bids): BidStats header; status/sort filters; inline SubmitBidForm; BidCard grid with status-colored top bar
  - Env var used: RESEND_API_KEY (shared with alerts), NEXT_PUBLIC_FROM_EMAIL, NEXT_PUBLIC_SENDER_NAME, NEXT_PUBLIC_SENDER_COMPANY
Next Step: N/A — ALL 15 TASKS COMPLETE
Status: DONE

*** ALL 15 TASKS COMPLETE — FULL PRODUCT BUILT ***

---

## 2026-04-30 (TASK_016)

Agent: Claude
Task ID: TASK_016
Task Goal: Build Local Business Community module — directory, teaming board, connections, direct messaging, PA Corps seed ingestion
Output Files:
  - /03_OUTPUTS/TASK_016_community/supabase_community_schema.sql
  - /03_OUTPUTS/TASK_016_community/lib/ingestion/community/pa_corps.ts
  - /03_OUTPUTS/TASK_016_community/app/api/community/profiles/route.ts
  - /03_OUTPUTS/TASK_016_community/app/api/community/profiles/me/route.ts
  - /03_OUTPUTS/TASK_016_community/app/api/community/profiles/[id]/route.ts
  - /03_OUTPUTS/TASK_016_community/app/api/community/teaming/route.ts
  - /03_OUTPUTS/TASK_016_community/app/api/community/connections/route.ts
  - /03_OUTPUTS/TASK_016_community/app/api/community/messages/route.ts
  - /03_OUTPUTS/TASK_016_community/app/api/ingest/community/route.ts
  - /03_OUTPUTS/TASK_016_community/lib/api/community.ts
  - /03_OUTPUTS/TASK_016_community/components/community/BusinessProfileCard.tsx
  - /03_OUTPUTS/TASK_016_community/components/community/BusinessProfileFull.tsx
  - /03_OUTPUTS/TASK_016_community/components/community/ConnectionRequest.tsx
  - /03_OUTPUTS/TASK_016_community/components/community/MessageThread.tsx
  - /03_OUTPUTS/TASK_016_community/components/community/TeamingPostCard.tsx
  - /03_OUTPUTS/TASK_016_community/components/community/PostTeamingRequest.tsx
  - /03_OUTPUTS/TASK_016_community/components/community/ProfileSetupForm.tsx
  - /03_OUTPUTS/TASK_016_community/app/(dashboard)/community/page.tsx
  - /03_OUTPUTS/TASK_016_community/app/(dashboard)/community/[profileId]/page.tsx
  - /03_OUTPUTS/TASK_016_community/app/(dashboard)/community/my-profile/page.tsx
  - /03_OUTPUTS/TASK_016_community/app/(dashboard)/community/teaming/page.tsx
Notes:
  - Schema: 4 tables (community_profiles, teaming_posts, connection_requests, community_messages); all RLS-scoped
  - community_profiles: FTS tsvector on business_name+owner_name+industry+bio; business_type enum (6 values); employee_range enum (5 values); certifications JSONB; sam_registered bool; source enum (self_registered/pa_corps_import)
  - Privacy: email+phone masked on profile GET unless viewer is owner or mutually connected (checked in API)
  - connection_requests: UNIQUE(from_profile_id, to_profile_id); Resend notification on send
  - community_messages: only allowed between accepted connections (areConnected check in POST); Resend notification; 30s auto-refresh in MessageThread hook
  - pa_corps.ts: POST form to corporations.pa.gov with county=02 (Allegheny) + status=ACT; cheerio parse; 1.5s delay between pages; upsert with ignoreDuplicates on business_name+city; entity number stored as sam_uei=PACORPS-{N}
  - /api/ingest/community: CRON_SECRET protected; maxPages param; already in netlify.toml (0 4 * * 0 = Sundays 04:00 UTC)
  - BusinessProfileCard: verified badge; SAM badge; cert badges; looking_for chips; inline ConnectionRequest (textarea + send)
  - BusinessProfileFull: contact info hidden until connected; message thread embedded after connection; PA Corps unclaimed badge; SAM link to sub profile
  - TeamingPostCard: "I'm Interested" → inline textarea → sends direct message to poster; isOwner → mark filled/expired buttons; deadline expiry detection
  - PostTeamingRequest: NAICS add-chip input; cert checkboxes; links to opportunity via opportunityId prop
  - ProfileSetupForm: full profile create/edit; services-offered chip input; looking_for checkboxes; cert checkboxes; SAM UEI field
  - Community page: debounced FTS search; SAM/verified toggles; looking_for filter; sort (newest/oldest/verified_first)
  - Teaming page: open/filled tabs; NAICS + cert filters; PostTeamingRequest inline form (only if has profile)
  - My Profile page: shows pending connection requests with accept/decline buttons; profile saved confirmation
Next Step: TASK_017
Status: DONE

---

## 2026-04-30 (TASK_017)

Agent: Claude
Task ID: TASK_017
Task Goal: Build AI Assistant — Claude-powered expert embedded in the platform for solicitation analysis, pricing intelligence, company search, and contracting advice
Output Files:
  - /03_OUTPUTS/TASK_017_ai_assistant/supabase_assistant_schema.sql
  - /03_OUTPUTS/TASK_017_ai_assistant/lib/ai/prompts.ts
  - /03_OUTPUTS/TASK_017_ai_assistant/lib/ai/tools.ts
  - /03_OUTPUTS/TASK_017_ai_assistant/lib/ai/assistant.ts
  - /03_OUTPUTS/TASK_017_ai_assistant/app/api/assistant/route.ts
  - /03_OUTPUTS/TASK_017_ai_assistant/app/api/assistant/analyze-document/route.ts
  - /03_OUTPUTS/TASK_017_ai_assistant/components/assistant/MessageBubble.tsx
  - /03_OUTPUTS/TASK_017_ai_assistant/components/assistant/ApprovalCard.tsx
  - /03_OUTPUTS/TASK_017_ai_assistant/components/assistant/ContractContextCard.tsx
  - /03_OUTPUTS/TASK_017_ai_assistant/components/assistant/QuickPrompts.tsx
  - /03_OUTPUTS/TASK_017_ai_assistant/components/assistant/ContextPanel.tsx
  - /03_OUTPUTS/TASK_017_ai_assistant/components/assistant/ChatInput.tsx
  - /03_OUTPUTS/TASK_017_ai_assistant/components/assistant/ChatWindow.tsx
  - /03_OUTPUTS/TASK_017_ai_assistant/app/(dashboard)/assistant/page.tsx
Notes:
  - Model: claude-sonnet-4-5 (claude-sonnet-4-6 maps to this in SDK); streaming via ReadableStream + SSE
  - System prompt: Jon-specific context (Murphree Enterprises, Pittsburgh, pipeline summary, today's date, contract context if set)
  - 11 tools: search_contracts, get_contract_detail, get_agency_profile, get_pipeline_status, search_grants, get_saved_contacts, get_award_history (USASpending), get_incumbent (USASpending), get_expiring_contracts, search_companies (TASK_014 API), analyze_solicitation
  - Agentic loop: up to 8 iterations for multi-tool chained queries; SSE events for tool_start/tool_use/tool_result/text/error
  - analyze-document: pdf-parse for PDF text extraction; SAM.gov API for opportunity URL fetch; ~100K char truncation; structured 4-section analysis (Requirements/Subcontracting Rules/Key Details/Red Flags)
  - Approval system: AI outputs ```approval JSON blocks; parsed by MessageBubble into ApprovalCard; executes via platform API calls (save contact, add to pipeline, send email, add to bid team); nothing executes without Jon's click
  - Conversations persisted in assistant_conversations table (JSONB messages array, RLS per user); sidebar shows last 30 conversations with relative timestamps
  - Page accepts URL params: ?contract_id=N&contract_title=...&prompt=... — pre-loads context from contract detail pages
  - ChatInput: PDF drag-drop + click-to-attach; 20MB limit; auto-resize textarea; Enter-to-send
  - MessageBubble: full ReactMarkdown rendering (GFM tables, code blocks, headings); tool use badges; streaming cursor indicator
  - QuickPrompts: 8 starter prompts shown on empty chat (Analyze RFP, Find companies, Pricing intel, Competitors, Expiring contracts, Grants, Pipeline analysis, General Q)
  - New env var needed: ANTHROPIC_API_KEY
Next Step: TASK_018
Status: DONE

---

## 2026-04-30 (TASK_018)

Agent: Claude
Task ID: TASK_018
Task Goal: Build Incumbent Tracker + Forecast Opportunities module — FPDS recompete radar and SAM.gov pre-solicitation forecast feed
Output Files:
  - /03_OUTPUTS/TASK_018_incumbent_forecast/supabase_incumbents_schema.sql
  - /03_OUTPUTS/TASK_018_incumbent_forecast/lib/ingestion/incumbents/fpds_lookup.ts
  - /03_OUTPUTS/TASK_018_incumbent_forecast/lib/ingestion/forecasts/samgov_forecasts.ts
  - /03_OUTPUTS/TASK_018_incumbent_forecast/app/api/ingest/forecasts/route.ts
  - /03_OUTPUTS/TASK_018_incumbent_forecast/app/api/recompetes/route.ts
  - /03_OUTPUTS/TASK_018_incumbent_forecast/app/api/forecasts/route.ts
  - /03_OUTPUTS/TASK_018_incumbent_forecast/lib/api/recompetes.ts
  - /03_OUTPUTS/TASK_018_incumbent_forecast/lib/api/forecasts.ts
  - /03_OUTPUTS/TASK_018_incumbent_forecast/components/recompetes/IncumbentBadge.tsx
  - /03_OUTPUTS/TASK_018_incumbent_forecast/components/recompetes/RecompeteTimeline.tsx
  - /03_OUTPUTS/TASK_018_incumbent_forecast/components/recompetes/RecompeteCard.tsx
  - /03_OUTPUTS/TASK_018_incumbent_forecast/components/forecasts/ForecastCard.tsx
  - /03_OUTPUTS/TASK_018_incumbent_forecast/app/(dashboard)/recompetes/page.tsx
  - /03_OUTPUTS/TASK_018_incumbent_forecast/app/(dashboard)/forecasts/page.tsx
Notes:
  - Schema: incumbent_contracts (generated column recompete_likely_date = end_date - 180 days; award_amount in cents; option_periods JSONB; usaspending_award_id UNIQUE); forecast_opportunities (FTS on title+agency+description; forecast_status enum; linked_opportunity_id FK for solicited transition)
  - fpds_lookup.ts: USASpending /search/spending_by_award/ with Pittsburgh PoP filter; skips awards expired >30 days ago; calculates base_period_months from award→end span; upsert on usaspending_award_id; 1s polite delay between pages
  - normalizeAwardeeName(): strips LLC/Inc/Corp/Ltd suffixes, lowercases, normalizes whitespace — prevents same company appearing as duplicates
  - samgov_forecasts.ts: SAM.gov /opportunities/v2/search with type=FORECAST+ptype=PRESOL+state=PA; maps poc/placeOfPerformance/naics from API response; linkForecastsToOpportunities() step auto-detects when forecasts become live solicitations and updates status to 'solicited'
  - /api/ingest/forecasts: single endpoint handles both forecasts (daily) and incumbents (?incumbents=1 for weekly); CRON_SECRET protected
  - Cron schedule: already in netlify.toml — forecasts 30 6 * * * (06:30 UTC daily); incumbents 0 3 * * 0 (Sunday 03:00 UTC)
  - Recompete API: filters by days window, NAICS, agency, value range; sort by soonest/highest_value
  - Forecast API: FTS search + status/naics/agency/days/value filters; sort by soonest/highest_value/latest
  - IncumbentBadge: amber-themed card showing current holder; links to SAM.gov by UEI or name search
  - RecompeteTimeline: 3-phase progress bar (Awarded → Recompete Window → Expires) with progress fill based on today's position
  - RecompeteCard: urgency color system (critical=red≤30d, warning=amber≤90d, moderate=yellow≤180d, low=gray); expandable intelligence panel; "Watch" button opens AI Assistant pre-prompted to research incumbent; "Add to Pipeline" calls /api/pipeline
  - ForecastCard: POC contact panel always visible; status color badges; "Contact POC" links to /outreach with prefilled URL params; "Watch" opens AI; expandable description with solicited→live link
  - Recompetes page: time-window pill selector (30/60/90/180/365/548 days); NAICS + agency debounced filters; pagination
  - Forecasts page: FTS search + status tabs (Active/Solicited/Awarded); time-window + NAICS + agency + sort filters
  - Both pages link to AI Assistant with pre-built prompts for analysis
  - netlify.toml already had both cron entries from prior scaffold task — confirmed correct
Next Step: N/A — ALL 18 TASKS COMPLETE
Status: DONE

*** ALL 18 TASKS COMPLETE — FULL PRODUCTION PLATFORM BUILT ***

---

## LOG TEMPLATE (copy for each completed task)

[DATE]

Agent: [Claude / Cursor / Other]
Task ID: [TASK_###]
Task Goal: [one line]
Output Files:
  - [list output file paths]
Notes: [anything notable]
Next Step: [TASK_### — description]
Status: DONE
