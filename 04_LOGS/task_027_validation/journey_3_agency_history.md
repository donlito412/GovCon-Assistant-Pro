# Journey 3: Click the agency, see their award history

**Validated against:** live build `e53786e` on https://gov-con-assistant-pro.vercel.app/agencies/1 (deployed 2026-05-05)

**GovTribe:** Agency profile shows total spend, top vendors, active
opportunities, expiring contracts.

**Our App:** /agencies/[id] **exists and renders the right structure**:

```
VA Pittsburgh Healthcare System
Federal Agency
TOTAL AWARDED (LAST 24 MO)
$0
Active Opportunities          Top Vendors
No active opportunities found. No vendor award history found.
```

**What works:**
- Route exists (no 404)
- Page structure matches TASK_027 Phase 2 spec
- Agency name + level (Federal) renders

**What doesn't work:**
- All three data panels render the zero state.
- /agencies directory shows "0 active / 0" for ALL 32 agencies — the
  cross-link agency→opportunities is not aggregating despite 2,181
  records on /contracts.
- Two likely root causes: (1) `agency_id` foreign key on records is not
  populated — agency name is a text blob from SAM.gov, no normalization
  step links it back to the agencies table. (2) USASpending cron runs
  weekly and has not fired yet, so `contract_awards` for this agency
  is empty.

**Verdict:** PARTIAL. The PAGE shipped (TASK_027 Phase 2 deliverable).
The DATA pipeline that populates it is not joined yet. Defer to
TASK_031 (agency-name→agency_id normalization + run USASpending cron).
