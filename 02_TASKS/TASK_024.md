TASK ID: 024

STATUS: PENDING

GOAL:
Connect Eventbrite API for Pittsburgh government/business events, and fix the Agencies directory with real data from SAM.gov agency hierarchy.

ASSIGNED TO: Claude

CONTEXT:
- App: https://gov-con-assistant-pro.vercel.app
- EVENTBRITE_API_KEY is set in Vercel env vars
- Supabase project: eejhxfyyooublgbcuyow
- Current events count: 11 (City Council + URA only)
- Current agencies count: 0 (agencies table is empty)
- SAMGOV_API_KEY is set in Vercel env vars

PART A — EVENTBRITE EVENTS:
1. Read /govcon-app/lib/ingestion/events/eventbrite.ts
2. Current error: "Eventbrite API HTTP 404 on page 1" — likely wrong endpoint URL
3. Eventbrite API v3: https://www.eventbriteapi.com/v3/events/search/
   Params: q="government OR procurement OR contract", location.address="Pittsburgh, PA", location.within=25mi
   Auth: Authorization: Bearer {EVENTBRITE_API_KEY}
4. Fix the endpoint URL and auth header
5. Test: POST /api/ingest/events — Eventbrite should return 10+ events

PART B — AGENCIES DIRECTORY:
1. Read /govcon-app/app/(dashboard)/agencies/page.tsx to understand expected data shape
2. Seed agencies table with real Pittsburgh-area agencies:
   Federal: VA Pittsburgh Healthcare, USACE Pittsburgh District, EPA Region 3 (Pittsburgh office),
            GSA Region 3, HUD Pittsburgh Field Office, SBA Pittsburgh District
   State: PA DGS, PA DOT District 11, PA DCED, PA DEP Southwest, PA DHS Southwest
   Local: City of Pittsburgh (Finance/OMB), Allegheny County (DAS), Port Authority of Allegheny County,
          URA Pittsburgh, Pittsburgh Water & Sewer Authority, Pittsburgh Housing Authority
   Education: University of Pittsburgh, CMU, CCAC, Pittsburgh Public Schools, Duquesne University
3. Write a seed migration or one-time ingest script to INSERT these into agencies table
4. Verify /agencies page renders populated data

INPUTS:
- /govcon-app/lib/ingestion/events/eventbrite.ts
- /govcon-app/app/(dashboard)/agencies/page.tsx
- Supabase agencies table schema

OUTPUT:
- Fixed eventbrite.ts scraper
- Agencies table seeded with 25+ real agencies
- Both pages render real data

ACCEPTANCE CRITERIA:
- POST /api/ingest/events returns eventbrite scraped > 0
- /agencies page shows 25+ real agencies with correct level (federal/state/local/education)
- Clicking an agency shows its contracts
