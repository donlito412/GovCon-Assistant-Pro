TASK ID: 021

STATUS: PENDING

GOAL:
Fix the three broken scrapers: PA eMarketplace (returning 0), City of Pittsburgh (403 blocked), and Education (timing out). Each needs a targeted fix.

ASSIGNED TO: Claude

CONTEXT:
- App: https://gov-con-assistant-pro.vercel.app
- Supabase project: eejhxfyyooublgbcuyow
- Current ingest results:
    state_pa_emarketplace: 0 scraped (broken — no data coming through)
    local_pittsburgh: 0 — "OpenGov portal fetch failed: HTTP 403"  and "Fallback page fetch failed: HTTP 404"
    education ingest: times out on Vercel (10s serverless limit exceeded)
- Ingest route files:
    /govcon-app/lib/ingestion/state_pa_emarketplace.ts  (or similar)
    /govcon-app/lib/ingestion/local_pittsburgh.ts
    /govcon-app/app/api/ingest/education/route.ts

SCRAPER-SPECIFIC FIXES:

1. PA eMarketplace (state_pa_emarketplace):
   - URL: https://www.emarketplace.state.pa.us/Solicitations.aspx
   - Currently returns 0 — likely the page structure changed or requires JS rendering
   - Fix: Try direct HTTP fetch with proper headers (User-Agent, Accept). If still blocked, try the PA eMarketplace RSS feed or public API alternative at https://www.dgs.pa.gov/Materials-Services-Procurement/Procurement-Resources/Pages/Bid-Opportunities.aspx

2. City of Pittsburgh (local_pittsburgh):  
   - OpenGov portal returns 403 (bot detection)
   - Fallback pittsburghpa.gov/omb/solicitations returns 404
   - Fix: Update to correct current URL. Try:
       https://pittsburghpa.gov/finance/bids-rfps (current procurement page)
       https://www.opengov.com/procurement-portal/pittsburghpa (try with different headers/user agent)
   - If still blocked, scrape the Pittsburgh Finance Department bids page directly

3. Education (timeout):
   - Times out because scraping 5+ university procurement pages in sequence exceeds Vercel's 10s limit
   - Fix: Split into per-university endpoints OR add max-time limits per scraper
   - Create individual routes: /api/ingest/education/pitt, /api/ingest/education/cmu, etc.
   - Or add Promise.race() with 8s timeout per scraper so slow ones get skipped, not block all

INPUTS:
- All files in /govcon-app/lib/ingestion/ directory
- /govcon-app/app/api/ingest/education/route.ts
- /govcon-app/app/api/ingest/state-local/route.ts

OUTPUT:
- Updated scraper files with working implementations
- Updated education route with timeout handling

STEPS:
1. Read and diagnose each scraper file
2. Fix PA eMarketplace scraper
3. Fix City of Pittsburgh scraper  
4. Add per-scraper timeout guards to education ingest
5. Test each by triggering the relevant ingest endpoint
6. Verify new records appear in Supabase
7. Commit and push

ACCEPTANCE CRITERIA:
- state_pa_emarketplace returns > 0 records
- local_pittsburgh returns > 0 records OR documents why it's permanently blocked and provides alternative
- Education ingest completes without timeout (even if some universities return 0)
