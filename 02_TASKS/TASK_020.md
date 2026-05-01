TASK ID: 020

STATUS: PENDING

GOAL:
Fix SAM.gov ingestion to return significantly more Pittsburgh-area federal contracts. Currently only returning 11 results — should be pulling 100–400+. Expand search parameters and NAICS code coverage.

ASSIGNED TO: Claude

CONTEXT:
- Current SAM.gov ingestion: /govcon-app/lib/ingestion/samgov.ts
- Current result: only 11 contracts (VA VAMC + USACE Pittsburgh District)
- SAM.gov API key is set in SAMGOV_API_KEY Vercel env var
- Pittsburgh MSA includes: Pittsburgh city, Allegheny County, plus Butler, Beaver, Washington, Westmoreland, Armstrong counties
- SAM.gov Opportunities API v2: https://api.sam.gov/opportunities/v2/search
- Supabase project: eejhxfyyooublgbcuyow

LIKELY CAUSES OF LOW RESULTS:
1. Search radius too tight (ZIP 15219 only, no radius expansion)
2. Missing NAICS codes — only searching a subset
3. postedFrom date window too short
4. Not paginating through all results (API returns max 1000/page)
5. Not searching by state (PA) as fallback

INPUTS:
- /govcon-app/lib/ingestion/samgov.ts (current implementation)
- /govcon-app/app/api/ingest/federal/route.ts

OUTPUT:
- Updated /govcon-app/lib/ingestion/samgov.ts

STEPS:
1. Review current search parameters in samgov.ts
2. Expand search to:
   - Add ZIP codes for all Pittsburgh MSA counties (Allegheny, Butler, Beaver, Washington, Westmoreland, Armstrong)
   - Or use placeOfPerformance.state=PA as a broad net, then filter to Pittsburgh MSA in normalize step
   - Expand postedFrom window to 90 days (currently likely 30)
   - Add pagination: loop through all pages until totalRecords exhausted
3. Expand NAICS code coverage to include all common Pittsburgh sectors:
   - 236 (Construction)
   - 237 (Heavy/Civil Engineering Construction)  
   - 238 (Specialty Trade Contractors)
   - 334 (Computer/Electronic Manufacturing)
   - 518 (Data Processing/Hosting)
   - 541 (Professional/Scientific/Technical Services)
   - 561 (Administrative/Support Services)
   - 611 (Educational Services)
   - 621 (Ambulatory Health Care)
   - 722 (Food Services)
   - 811 (Repair/Maintenance)
4. Update normalizePittsburghOpportunities() in /govcon-app/lib/ingestion/normalize.ts:
   - Accept all PA results, then filter by Pittsburgh MSA city names OR zip code prefix 15xxx
5. Test by triggering POST /api/ingest/federal and checking new record count
6. Commit and push

ACCEPTANCE CRITERIA:
- Federal ingestion returns 50+ Pittsburgh-area contracts (up from 11)
- No duplicates (dedup_hash constraint still enforced)
- All existing 11 records preserved (not deleted/replaced)
