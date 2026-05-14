# Journey 1: Find federal opportunities posted in PA in the last 14 days

**Validated against:** live build `e53786e` on https://gov-con-assistant-pro.vercel.app/contracts (deployed 2026-05-05)

**GovTribe:** Opportunities tab → Status=Active, Source=Federal,
Place of Performance=PA → sort by Posted Date desc → freshest first.

**Our App:** /contracts loads with "2,181 opportunities". SAM.gov data
is flowing — agency (DoD / Defense Logistics Agency) and NAICS codes are
populated on every card. 2,181 records is real volume vs the 5 active-opps
the project memory previously claimed.

**What works:**
- Cards render with source tag, NAICS, agency, deadline status
- Volume is real now (TASK_027 SAM.gov rewrite verified)

**What doesn't work:**
- **Page label lies.** Tagline says "Active Pittsburgh-area opportunities
  — bid before the deadline" but the first four cards visible on initial
  load are "Closed 23 days ago", "Closed 21 days ago", "Closed 21 days
  ago", "Closed 15 days ago." Closed solicitations are mixed with active.
- **Default sort is broken.** Sort says "Deadline: Soonest First" yet
  surfaces already-closed deadlines at the top.
- **Source filter checkboxes don't filter.** Clicking
  SAM.gov (Pittsburgh MSA) leaves count at 2,181 and "Filters 0" stays
  at 0 — confirmed live. State, Local, and Education checkboxes are still
  wired to deprecated scrapers (PA eMarketplace, City of Pittsburgh, etc.)
  that TASK_027 stubbed; they will return zero records even when wired.
- **No "posted in last N days" filter.** GovTribe's posted-date scoping
  does not exist here.

**Verdict:** PARTIAL. Data exists; page UI is misleading. Defer to
TASK_029 (filter wiring) and TASK_030 (active/closed split + sort fix).
