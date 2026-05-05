# GovCon Assistant Pro — Problem & Solution Brief
Date: 2026-05-05
Author: Claude (diagnostic pass)

## What Jon said
> "nothing is working for this project. this is nothing like govtribe. figure
> out the problem and solution. create the task for another agent to fix.
> nothing works."

## The honest read
Jon is right. The project_log says "26 tasks complete, production platform
live," but the database has 5 active opportunities, 0 subcontractors, and
local scrapers that fail silently. The git log shows four full architectural
rewrites in two weeks. The app exists; the value loop GovTribe provides does
not.

## Three things are wrong (in priority order)

1. **The data layer is structurally broken, not just buggy.**
   The SAM.gov scraper fetches every US opportunity (50K cap, 90-day window,
   no state filter) then post-filters to Pittsburgh in code. That guarantees
   timeouts on Vercel and burns the SAM.gov rate limit. The HTML scrapers
   for PA eMarketplace, Pittsburgh City, URA, Housing Authority, and the
   five education sites have been "fixed" three times each and still return
   0 records. Each fix has been a code change, not a verification against
   the live site.

2. **The UI doesn't replicate GovTribe's value loop.**
   GovTribe isn't valuable because it has data — it's valuable because every
   entity links to every other entity. Click a contract → click the agency →
   see their award history → click a top vendor → see their other wins →
   see their contracts expiring soon. This app has the tables but not the
   joins. /agencies/[id] and /vendors/[uei] either don't exist as detail
   pages or render generic listings.

3. **The development pattern is "complete and move on" without validation.**
   Twenty-six tasks marked DONE. Zero evidence anyone walked through the
   live site comparing it to GovTribe. The memory file says TASK_002 is
   next; project_log says all 26 are done. Both can't be true. The pattern
   of "write code → claim done → start next task" is why the app stayed
   broken through 26 tasks.

## The fix in one sentence
Stop scraping, start joining: lean on SAM.gov + USASpending.gov (free,
reliable APIs that already power GovTribe), delete the flaky HTML scrapers,
and build the cross-linked agency/vendor detail pages that make the data
actually useful.

## What another agent should do
TASK_027.md has the full spec. Summary:

- **Phase 0**: Delete the broken HTML scrapers. Add a manual-add UI for
  things Jon spots elsewhere.
- **Phase 1**: Rewrite SAM.gov ingest to use placeOfPerformance.state=PA at
  the API level (not post-fetch). Add USASpending.gov for award history.
  Consolidate the opportunities/awards split into one table.
- **Phase 2**: Build /agencies/[id], /vendors/[uei], and a universal search
  bar. This is where "feels like GovTribe" lives.
- **Phase 3**: Verify the email-alert path actually delivers an email.
- **Phase 4 (mandatory)**: Walk through five user journeys on the live
  Vercel site AND on GovTribe, screenshot both, write up the gaps. No DONE
  status without this.

## Non-negotiables for the next agent
- One task, one PR. Not eight sub-tasks. The 26-task pattern is what got us
  here.
- DONE means the five Phase 4 journeys work end-to-end on the live site.
  Not "code compiled."
- Reconcile memory/project_govcon.md and 04_LOGS/project_log.md on day 1.
  They contradict each other right now.
