# TASK_027 Outcome — 2026-05-05

## What landed on the live site
- Commit chain on origin/main, all deployed in build `9kt1yixD7`:
  - `2f930c4` Phase 0/1: kill HTML scrapers, wire SAM.gov + USASpending +
    Grants.gov crons (Cowork)
  - `8c3365d`, `41956ae`, `2677c97`, `07cbe58`, `78da2cc` (Antigravity:
    additional ts fixes + "complete task 27")
  - `771741a` cron schedule adjusted for Hobby plan
  - `6ca1e99`, `0123256`, `1349512` Antigravity fix attempts on Supabase
    import (kept missing the actual broken line)
  - `e53786e` (Cowork) — final fix: corrected
    `app/(dashboard)/opportunities/add/page.tsx` import to
    `@/lib/supabase` (was `@/lib/supabase/client` which doesn't exist).
    This was the single line failing all 5 prior production builds.

## Verified live (build e53786e)
| Endpoint | Status | Note |
|----------|--------|------|
| `/contracts` | renders 2,181 records | volume real, list/sort buggy |
| `/contracts/[id]` | "Record not found" on `/contracts/928` | list↔detail schema mismatch |
| `/agencies` | renders 32 agencies, all "0 active / 0" | no agency_id join |
| `/agencies/[id]` | renders shell, all panels empty | no joined data |
| `/vendors` | 404 | no index page |
| `/vendors/[uei]` | renders empty-state shell | no USASpending data |
| `/api/cron/samgov` | 401 (auth required) | route ships |
| `/api/cron/usaspending` | 401 (auth required) | route ships, never run |
| `/api/cron/grantsgov` | 401 (auth required) | route ships |

## Phase 4 verdict
Of the 5 user journeys in TASK_027 Phase 4:
- Journey 1 (find PA federal opps): PARTIAL — data flowing, UI misleading
- Journey 2 (officer contact): FAILED — list→detail returns 404
- Journey 3 (agency awards): PARTIAL — page ships, data empty
- Journey 4 (top vendors): PARTIAL — panel ships, data empty
- Journey 5 (vendor profile): PARTIAL — shell ships, nothing links to it

Honest read: Phase 0 (kill scrapers) and Phase 1 (data backbone) shipped.
Phase 2 (cross-linking UI) shipped as page shells but the JOINS aren't
populated. Phase 3 (saved searches/alerts) and Phase 4 (validation) are
this document.

## Carry-forward tasks (not done in TASK_027)
- TASK_029 — Wire the source-filter checkboxes on /contracts so they
  actually filter (currently cosmetic).
- TASK_030 — Split closed vs active on /contracts (page tagline lies);
  enrich /contracts/[id] with contracting officer name/email/phone from
  SAM.gov POC array; fix list→detail ID mismatch (probably the
  `records` schema unification dropped some old IDs).
- TASK_031 — Populate agency_id on records from agency name; trigger
  USASpending cron once manually so /agencies/[id] and /vendors/[uei]
  render real data instead of empty states.
- TASK_032 — Optional: /vendors index page (browse mode).

## Operational notes
- The Vercel ↔ GitHub webhook was disconnected for some hours and
  reconnected at ~22:09 ET. Pushes before that didn't trigger builds.
- The `.command` file pattern (PUSH_*.command, FIX_*.command) is what
  this repo uses for git operations because the Cowork sandbox can't
  authenticate to GitHub. New scripts created this session:
  `PUSH_TASK_027.command`, `TRIGGER_DEPLOY.command`,
  `FIX_SUPABASE_IMPORT.command`.
- A stale `.git/index.lock` will block git operations from the sandbox
  and must be cleared via Finder (sandbox can't `rm` mounted-folder
  files).
