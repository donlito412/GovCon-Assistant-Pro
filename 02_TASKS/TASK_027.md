TASK ID: 027

STATUS: DONE

GOAL:
Rebuild GovCon Assistant Pro into something that actually feels like GovTribe. Stop adding scrapers. Stop the "26 tasks complete" charade. The app currently has 5 active opportunities, 0 subcontractors, broken local scrapers, and a UI that doesn't replicate GovTribe's core value loops. Fix the architecture, then prove it works against the live site before claiming completion.

ASSIGNED TO: Claude (next agent)

================================================================
DIAGNOSIS — WHY IT DOESN'T FEEL LIKE GOVTRIBE
================================================================

ROOT CAUSE 1: The data layer is broken in three different ways.

  a) SAM.gov scraper is configured to fetch ALL US opportunities (no state
     filter — see lib/ingestion/samgov.ts:148-164, "NO state filter" comment)
     with MAX_RESULTS = 50,000 and a 90-day window. Then it post-filters to
     Pittsburgh MSA in lib/ingestion/normalize.ts:430. This guarantees:
       - Vercel function timeouts (60s hobby plan, fetching 500+ pages is hours)
       - SAM.gov public-key rate limit burned (1,000 requests/day)
       - Inconsistent partial ingests
     Result: only 11 federal opps in DB, mostly expired. Scraper is structurally
     broken even though git log says "fixed."

  b) State/local HTML scrapers are flaky by design. Recent commits show the
     same scrapers being "fixed" repeatedly:
       - PA eMarketplace returned 0 (TASK_021)
       - Pittsburgh City returned 403/404 with 5 URL fallbacks (TASK_021)
       - Allegheny County was scraping nav links as opportunities (TASK_018)
       - Education scrapers timing out (TASK_021)
       - Housing Authority + URA scrapers untested
     HTML scraping municipal sites is the wrong primitive for a one-person
     tool. Every site change breaks the pipeline. GovTribe has a team
     maintaining this; you do not.

  c) The cron schedule is a single 11:00 UTC daily run (vercel.json). GovTribe
     refreshes opportunities throughout the day. Even if the scrapers worked,
     freshness would lag by a full day.

ROOT CAUSE 2: The UI doesn't replicate GovTribe's value loops.

  GovTribe's "magic" isn't the data — it's the cross-linking:
    Opportunity → Agency profile → all past awards by that agency →
       top vendors → vendor profile → that vendor's other contracts →
       recompete radar (their contracts expiring soon)

  This app has the data tables (opportunities, contract_awards, agencies,
  contacts) but no cross-links. /agencies/[id] and /contacts/[id] either
  don't exist as detail pages or render generic listings. The dashboard is
  category counts, not a navigable graph.

ROOT CAUSE 3: Scope creep + premature completion.

  Twenty-six tasks marked DONE, four full architectural rewrites visible in
  git log (govtribe-redesign, awards-table split, NAICS expansion, Pittsburgh
  MSA filter), and the app still shows 5 active opportunities. Each "fix"
  added new files instead of validating what existed. The codebase has:
    - Two overlapping schemas (opportunities + contract_awards) with unclear
      ownership of "is this active or historical"
    - Multiple scrapers for the same source (samgov.ts AND state-local route)
    - "Tests passed" claims with no evidence anyone hit the live URLs
  Memory file says TASK_001 done, TASK_002 next; project_log.md says all 26
  done. The two are out of sync.

ROOT CAUSE 4: Wrong scoping decision.

  Hardcoding "Pittsburgh MSA only" at the data layer means the app cannot
  show a contract in Cleveland that a Pittsburgh business could legitimately
  bid on. GovTribe lets users define their own filters. The Pittsburgh
  filter belongs in the UI as a saved-search preset, not in the ingestion
  layer.

================================================================
SOLUTION — WHAT TO ACTUALLY BUILD
================================================================

PHASE 0: Stop the bleeding (1 day)
  - Kill all HTML scrapers except SAM.gov and Allegheny PAVNextGen API.
    Delete pittsburgh_city.ts, housing_authority.ts, ura.ts,
    pa_emarketplace.ts, pa_treasury.ts, education/* scrapers.
    They are net-negative: they fail silently and pollute the DB.
  - Add a manual "Add opportunity" form. For local sources Jon checks by
    hand, he types/pastes the entry. This is honest about what's automatable.

PHASE 1: Fix the data backbone (2 days)
  - Rewrite SAM.gov ingest to use the API correctly:
      * placeOfPerformance.state=PA filter at the API level (not post-fetch)
      * Single ingest run = ≤500 records, completes in <30s
      * Lookback 30 days, paginated by 100, stop at end of results
      * Drop the 594-NAICS code list — it's not how the API works
  - Add USASpending.gov ingest for federal AWARDS in PA (last 24 months).
    Free API, no key. This populates the awards graph that powers GovTribe's
    intelligence features.
  - Add Grants.gov XML feed ingest (already partly there — verify it runs).
  - Cron: 4x/day, not 1x. Schedule SAM.gov every 6h, USASpending weekly,
    Grants.gov daily.
  - DELETE the contract_awards / opportunities split. Use ONE table with a
    `record_type` enum {opportunity, award, grant} and `status` enum.
    GovTribe stores them together; the split was over-engineering.

PHASE 2: Build the cross-linking UI (3 days)
  This is where the "feels like GovTribe" actually lives.
  - /agencies/[id]: aggregate query showing
      * total awarded $ in last 24 months (from USASpending)
      * top 10 vendors who won
      * active opportunities currently posted
      * recompete radar (their awards expiring in next 6 months)
  - /vendors/[uei]: aggregate query showing
      * everything that vendor won (from USASpending)
      * which agencies they win from
      * NAICS codes they work in
      * "similar vendors" by NAICS overlap
  - /contracts/[id]: link the agency name to /agencies/[id], the awarded-to
    vendor (if recompete) to /vendors/[uei], show "past awards on this
    contract" by joining on contract number prefix
  - Universal search bar (top of every page) that searches across all four
    entity types.

PHASE 3: Saved searches + alerts (1 day)
  - Saved search = filter set + email frequency. Already partly built;
    verify Resend domain verified in Vercel env, send a real test email,
    confirm receipt.
  - Move the "Pittsburgh MSA" filter from the ingestion layer to a default
    saved search Jon can edit.

PHASE 4: Validation (mandatory — do not mark DONE without this)
  - Open https://gov-con-assistant-pro.vercel.app in a browser
  - Open https://www.govtribe.com (or the public sample views) in another
  - Walk through these five user journeys on BOTH and screenshot:
      1. Find federal opportunities posted in PA in the last 14 days
      2. Click an opportunity, see contracting officer contact info
      3. Click the agency, see their award history
      4. Find the top 5 vendors winning from that agency
      5. Click a vendor, see what else they've won
  - For each journey, write one paragraph: "GovTribe does X, our app does Y."
    If Y is "blank page" or "page doesn't exist," the journey is FAILED and
    Phase 2 isn't done.

================================================================
NON-NEGOTIABLES
================================================================

- Do NOT add new scrapers in this task. Removal only.
- Do NOT mark this task DONE based on "code committed and built." DONE means
  the five journeys in Phase 4 work end-to-end on the live Vercel deploy.
- Do NOT split this into 8 sub-tasks. It is one task. The 26-task pattern is
  what got the project here.
- Update memory/project_govcon.md to reflect actual state when starting AND
  when finishing. The current memory says TASK_002 is next; project_log.md
  says all 26 done. Reconcile this on day 1.

================================================================
INPUTS
================================================================

- /govcon-app/lib/ingestion/* (rewrite SAM.gov, delete most others)
- /govcon-app/app/(dashboard)/agencies/, /contracts/, /awards/ (cross-link)
- /govcon-app/supabase_*.sql (consolidate to single schema migration)
- 05_ASSETS/govtribe_feature_deconstruction.md (the actual spec)
- 04_LOGS/project_log.md (history of what's been tried)
- Live site: https://gov-con-assistant-pro.vercel.app
- Supabase: project eejhxfyyooublgbcuyow

================================================================
OUTPUT
================================================================

- One PR / commit series with ALL changes (not "phase 1 PR, phase 2 PR")
- 5 screenshots from Phase 4 validation, dropped in /04_LOGS/task_027_validation/
- Updated project_log.md entry that explicitly compares before/after on
  the five journeys
- Updated memory/project_govcon.md with the new (actual) state

================================================================
ACCEPTANCE CRITERIA
================================================================

1. opportunities table has ≥100 active SAM.gov records, ≤30 days old,
   place_of_performance state = PA
2. contract_awards (or unified records table) has ≥1,000 USASpending records
   for PA recipient location, last 24 months
3. /agencies/[id] page renders aggregated award $, top vendors, active opps
   for at least 3 spot-checked agencies (VA, USACE, GSA Region 3)
4. /vendors/[uei] page exists and renders for at least one vendor
5. Universal search bar returns results from at least 3 entity types
6. SAM.gov ingest completes in <60s (no Vercel timeout)
7. Cron runs 4x/day with audit log per run (not silent)
8. The five Phase 4 journey writeups exist and identify any remaining gaps
9. agent_rules.md compliance: state plan → wait → execute → log → status DONE
