# Journey 4: Find the top 5 vendors winning from that agency

**Validated against:** live build `e53786e` on https://gov-con-assistant-pro.vercel.app/agencies/1 (deployed 2026-05-05)

**GovTribe:** Agency Profile → "Top Vendors" section listing companies
that won the most $ from this agency over a timeframe.

**Our App:** The "Top Vendors" panel exists on /agencies/[id] but renders
the empty state: "No vendor award history found." This is the same root
cause as Journey 3 — the agency-detail aggregation has nothing to join
on because:

1. `contract_awards` table has no rows linked to this `agency_id`.
2. USASpending cron (`/api/cron/usaspending`) is wired and authorizes
   correctly (returns 401 without secret) but its weekly schedule has
   not fired and no manual trigger has been issued.

**What works:**
- The UI panel ships (correct shape per TASK_027 Phase 2)
- The aggregation query exists in the page component

**What doesn't work:**
- No data to aggregate over yet. Will surface vendors only after the
  USASpending cron runs once and the joined `agency_id` is populated.

**Verdict:** PARTIAL. UI ships; data does not. Defer to TASK_031
(trigger one-time USASpending fetch, normalize agency_id link).
