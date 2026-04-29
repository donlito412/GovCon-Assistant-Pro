TASK ID: 002

STATUS: PENDING

GOAL:
Build the SAM.gov federal data ingestion pipeline. Pull real contract opportunities filtered to Pittsburgh/Allegheny County and surrounding counties. Store normalized records in Supabase. Schedule daily refresh via Netlify cron.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /05_ASSETS/data_sources.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
- /03_OUTPUTS/TASK_001_scaffold/lib/supabase.ts
- Jon's SAM.gov API key (stored in .env as SAMGOV_API_KEY)

OUTPUT:
/03_OUTPUTS/TASK_002_federal_ingestion/
  - /lib/ingestion/samgov.ts — SAM.gov API client + data fetcher
  - /lib/ingestion/normalize.ts — normalize raw SAM.gov response → Opportunity type
  - /app/api/ingest/federal/route.ts — Next.js API route that triggers ingestion
  - /lib/geo/pittsburgh_zips.ts — exported list of Pittsburgh-area zip codes + county filter
  - netlify.toml (updated with cron job: daily at 6am ET)
  - /scripts/test_samgov_fetch.ts — standalone test script to verify API connection

STEPS:
1. Implement SAM.gov Get Opportunities API client
   - Endpoint: https://api.sam.gov/opportunities/v2/search
   - Auth: API key in query param
   - Filters: postedFrom (last 90 days), place_of_performance state=PA
   - Secondary filter: match zip codes against Pittsburgh area list
   - Pagination: loop all pages (limit=100 per page)
2. Normalize each raw opportunity record to the Opportunity type from TASK_001
   - Map: noticeId→id, title, fullParentPathName→agency, naicsCode, baseAndAllOptionsValue→value, responseDeadLine→deadline, placeOfPerformance, description, uiLink→url
   - Set source = "federal_samgov"
3. Upsert to Supabase opportunities table (on conflict: update)
4. Build /app/api/ingest/federal/route.ts POST endpoint secured with INGEST_SECRET env var
5. Add Netlify cron in netlify.toml: runs /api/ingest/federal at 06:00 ET daily
6. Write test script to verify: API key works, at least 1 Pittsburgh result returned

CONSTRAINTS:
- Must handle SAM.gov API pagination (up to 10,000 results)
- Must handle rate limits (exponential backoff on 429)
- Must deduplicate on noticeId — no duplicate rows
- Must log ingestion count + errors to console (visible in Netlify function logs)
- Pittsburgh zip filter applied AFTER fetching PA results (SAM.gov doesn't filter by zip natively)
- Real API calls only — no mocking
- DEDUPLICATION REQUIRED: compute dedup_hash for every record before upsert
  - Hash = SHA-256(lower(trim(title)) + lower(trim(agency)) + deadline_date)
  - On conflict (dedup_hash): append "federal_samgov" to canonical_sources array — do NOT insert duplicate row
  - Log count of deduplicated records separately from new records
- CATEGORIZATION REQUIRED: compute and store at ingestion time
  - threshold_category: derive from baseAndAllOptionsValue using Oct 2025 thresholds
    (≤$15K = micro_purchase, $15,001–$350K = simplified_acquisition, >$350K = large_acquisition, null/0 = unknown)
  - naics_sector: map naicsCode to sector label using naics_sector_map table
  - contract_type: map noticeType field from SAM.gov to enum (Presolicitation→RFI, Solicitation→RFP, etc.)

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_003
