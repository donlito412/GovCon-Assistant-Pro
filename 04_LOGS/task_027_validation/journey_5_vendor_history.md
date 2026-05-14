# Journey 5: Click a vendor, see what else they've won

**Validated against:** live build `e53786e` on https://gov-con-assistant-pro.vercel.app/vendors/TEST123456789 (deployed 2026-05-05)

**GovTribe:** Vendor profile = total dollars won, agencies they work
with, recent prime awards.

**Our App:**
- `/vendors` (no UEI) returns 404 — no index page exists.
- `/vendors/[uei]` (with any UEI) renders an empty-state shell:
  > Vendor not found or has no award history in our system.

**What works:**
- Dynamic route `[uei]` handles arbitrary UEIs gracefully (no crash).
- The page component exists (105 lines per `wc -l`).

**What doesn't work:**
- No `/vendors` index → users can't browse vendors at all unless they
  arrive via a vendor link on another page (and Journey 4 showed those
  links won't render either, because Top Vendors aggregations are empty).
- No vendor profile renders with real data because `contract_awards`
  has no USASpending rows yet.

**Verdict:** PARTIAL. The shell ships; nothing routes to it. Defer to
TASK_031 (USASpending cron + agency/vendor join) and TASK_032 (vendor
index page if Jon wants browsable vendors).
