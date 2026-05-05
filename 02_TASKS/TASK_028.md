TASK ID: 028

STATUS: PENDING

ASSIGNED TO: Antigravity agent (Jon's IDE — has GitHub auth that the Cowork sandbox does not)

GOAL:
Stage, commit, push the TASK_027 changes that are already on disk, AND verify
Vercel actually rebuilds. The Cowork agent committed and pushed (commits
2f930c4 and 8c3365d are on origin/main per `git ls-remote`), but Vercel's
production deploy is stuck on commit 6eaf301 ("updates", 56m old per the
Vercel dashboard). Either the GitHub→Vercel webhook is broken or the
auto-deploy was disabled for this project. Until the live build is at
HEAD, the user cannot validate any of TASK_027.

================================================================
WHAT'S ALREADY ON DISK + IN GIT (do NOT redo)
================================================================

Commits in origin/main beyond what's deployed:
- 2f930c4 — TASK_027 Phase 0/1: kill HTML scrapers, wire SAM.gov +
  USASpending + Grants.gov crons
- 8c3365d — auto-commit adding PUSH_TASK_027.command itself

Files changed in those commits (verify with `git diff 6eaf301..HEAD --stat`):
- govcon-app/lib/ingestion/runner.ts — rewritten (SAM.gov + Allegheny only)
- govcon-app/app/api/ingest/state-local/route.ts — rewritten (Allegheny only)
- govcon-app/app/api/ingest/education/route.ts — returns 410 Gone
- govcon-app/lib/ingestion/{pittsburgh_city,housing_authority,ura,
  pa_emarketplace,pa_treasury}.ts — stubbed
- govcon-app/lib/ingestion/education/{ccac,cmu,duquesne,pgh_schools,pitt}.ts
  — stubbed
- govcon-app/app/api/cron/samgov/route.ts — NEW
- govcon-app/app/api/cron/grantsgov/route.ts — NEW
- govcon-app/app/api/cron/usaspending/route.ts — NEW (fetches PA awards
  into contract_awards)
- 02_TASKS/TASK_027.md — spec
- 04_LOGS/PROBLEM_AND_SOLUTION_2026-05-05.md — diagnosis
- 04_LOGS/task_027_validation/journey_*.md — placeholder writeups

================================================================
WHAT YOU MUST DO
================================================================

1. **Verify deploy is actually broken (don't just retry blindly)**:
   - Open https://vercel.com/donlito412-s-projects2/gov-con-assistant-pro
   - Click "Deployments" tab
   - Latest production deploy should be from commit 6eaf301 ("updates")
   - If a deploy for 8c3365d / 2f930c4 is showing as "Failed" or "Canceled",
     read the build log and fix the root cause (probably TS errors from
     the scraper stubs).
   - If NO deploy at all was triggered for 8c3365d, the GitHub webhook is
     broken. Reconnect:
       Vercel → Project Settings → Git → Disconnect → Reconnect
       https://github.com/donlito412/GovCon-Assistant-Pro

2. **Force a rebuild**:
   - In Vercel dashboard → Deployments → ⋯ menu on latest commit →
     "Redeploy" with "Use existing Build Cache" UNCHECKED.
   - OR push an empty commit:
       git commit --allow-empty -m "trigger Vercel rebuild" && git push

3. **Validate the new build is live (acceptance test)**:
   Hit each of these endpoints. If any return 404, the deploy didn't
   include TASK_027:
     - GET https://gov-con-assistant-pro.vercel.app/api/cron/samgov
       → expect 401 (Unauthorized — route exists, secret missing in URL)
     - GET https://gov-con-assistant-pro.vercel.app/api/cron/usaspending
       → expect 401
     - GET https://gov-con-assistant-pro.vercel.app/api/cron/grantsgov
       → expect 401
     - POST https://gov-con-assistant-pro.vercel.app/api/ingest/education
       → expect 410 Gone (route now disabled)
   404s = deploy still broken; do NOT mark this task DONE.

4. **Verify env vars in Vercel**:
   The new USASpending cron requires no extra env vars (USASpending API
   has no key). But confirm CRON_SECRET and INGEST_SECRET are set in
   Vercel → Project Settings → Environment Variables. Without them, all
   three crons return 500.

5. **Trigger one fresh ingestion run** to populate USASpending data:
   curl -H "Authorization: $CRON_SECRET" \
     https://gov-con-assistant-pro.vercel.app/api/cron/usaspending
   Should return JSON with `inserted: <some number ≥ 100>`.

6. **Hand back to user** with three concrete screenshots:
   - Vercel deployments list showing the new commit shipped
   - cURL output of /api/cron/usaspending success
   - Live /agencies/[id] page rendering aggregate award data

================================================================
KNOWN UNFINISHED ITEMS (deferred, do NOT scope-creep into them)
================================================================

These are real bugs the user already noted ("none of the filters work"):
- Source filter checkboxes on /contracts don't actually filter results.
  Confirmed by the Cowork agent: clicking SAM.gov (Pittsburgh MSA) leaves
  result count at 2,181 and "Filters 0" stays at 0.
- /contracts/[id] detail page is missing contracting officer name/email/
  phone — only shows solicitation number, deadline, NAICS.
- Agency name on /contracts/[id] is plain text, not a link to /agencies/[id].
- "Closed N days ago" opportunities still appear on /contracts (page tagline
  claims "Active … bid before deadline" but list includes expired ones).

These are NOT this task. They are TASK_029 (filter wiring), TASK_030 (detail
page enrichment), TASK_031 (cross-link). Do not touch them in TASK_028.

================================================================
DEFINITION OF DONE
================================================================

- `git log --oneline origin/main -3` shows commits matching what Vercel
  deployed (verify the deployment ID in Vercel matches the SHA).
- All four endpoint URLs in step 3 return non-404 status codes.
- `/api/cron/usaspending` returns success and `contract_awards` table has
  at least 100 new rows with `source = 'federal_usaspending'`.
- A short note appended to /04_LOGS/project_log.md identifying which
  commit went live, when, and the row count of the USASpending insert.
