# Journey 2: Click an opportunity, see contracting officer contact info

**Validated against:** live build `e53786e` on https://gov-con-assistant-pro.vercel.app/contracts/928 (deployed 2026-05-05)

**GovTribe:** Click an opportunity → detail view shows parsed Primary +
Secondary Points of Contact (Name, Email, Phone) extracted from the
solicitation.

**Our App:** **BROKEN.** Clicking the first card on /contracts links to
`/contracts/928`. That route returns "Record not found." The list page
and detail page are reading from different sources/tables — the list
shows ID 928 but the detail-page query can't find it. This is a data
integrity regression introduced when the awards/opportunities split was
merged into a unified `records` table (per Antigravity's
"complete task 27" commit).

Even when working, the SAM.gov scraper does capture
`pointOfContact: [{name, email, phone}]` from the API, but the unified
records schema does not appear to surface those fields on detail pages.

**Verdict:** FAILED.
- Detail route 404s from a list-page click — schema mismatch must be
  fixed before contact info can render.
- Even after that fix, the contracting-officer block must be added to
  the ContractDetailPage component (separate work — TASK_030).
