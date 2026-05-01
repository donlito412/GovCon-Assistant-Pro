TASK ID: 019

STATUS: PENDING

GOAL:
Set up automated daily cron ingestion so all data sources refresh every morning without manual intervention. Wire up Vercel cron jobs to call all ingest endpoints on a schedule.

ASSIGNED TO: Claude

CONTEXT:
- App is live at https://gov-con-assistant-pro.vercel.app
- All ingest endpoints exist and work:
    POST /api/ingest/federal       — SAM.gov (runs at 06:00 ET)
    POST /api/ingest/state-local   — PA eMarketplace, PA Treasury, Allegheny, Pittsburgh
    POST /api/ingest/grants        — Grants.gov, PA DCED, URA, SBA
    POST /api/ingest/events        — City Council, Planning, URA, Eventbrite
    POST /api/ingest/education     — Pitt, CMU, CCAC, PPS, Duquesne
    POST /api/ingest/forecasts     — SAM.gov forecast API
- All endpoints secured with x-ingest-secret header (value in INGEST_SECRET env var)
- CRON_SECRET env var: 885d72de381c3669784e164774332936544eea44bbe49e71f47b261a710565c6
- vercel.json currently has a netlify.toml — need to convert to vercel.json cron config
- Supabase project: eejhxfyyooublgbcuyow

INPUTS:
- /govcon-app/vercel.json (create if missing)
- All existing /app/api/ingest/*/route.ts files

OUTPUT:
- /govcon-app/vercel.json — cron schedule config
- /govcon-app/app/api/cron/ingest/route.ts — single cron handler that calls all ingest routes in sequence

STEPS:
1. Create /govcon-app/vercel.json with cron jobs:
   - /api/cron/ingest runs daily at 11:00 UTC (07:00 ET)
   - Use CRON_SECRET to secure the endpoint

2. Create /govcon-app/app/api/cron/ingest/route.ts:
   - GET handler (Vercel crons use GET)
   - Verify Authorization header contains CRON_SECRET
   - Call all ingest endpoints in sequence: federal → state-local → grants → events → education → forecasts
   - Pass x-ingest-secret header to each
   - Return JSON summary of all results

3. Commit and push — Vercel will auto-detect the cron config and schedule it

ACCEPTANCE CRITERIA:
- vercel.json cron entry exists and is valid
- /api/cron/ingest returns 200 with summary JSON when called with correct secret
- Returns 401 without secret
- Vercel dashboard shows cron job scheduled
