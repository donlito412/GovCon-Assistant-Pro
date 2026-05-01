TASK ID: 023

STATUS: PENDING

GOAL:
Populate the Subcontractor Directory with real data from SAM.gov Entity API, SBA DSBS, and PA MWBE registry. The UI is built at /subcontractors — it just has no data.

ASSIGNED TO: Claude

CONTEXT:
- App: https://gov-con-assistant-pro.vercel.app/subcontractors
- Supabase project: eejhxfyyooublgbcuyow
- SAMGOV_API_KEY is set in Vercel env vars
- Subcontractor data sources:
    1. SAM.gov Entity API — registered federal contractors in Pittsburgh MSA
       Endpoint: https://api.sam.gov/entity-information/v3/entities
       Filter: physicalAddress.stateOrProvinceCode=PA, naicsCode relevant sectors
       Pittsburgh ZIP prefixes: 15xxx
    2. SBA DSBS (Dynamic Small Business Search) — small business profiles
       Public search: https://dsbs.sba.gov/search/dsp_dsbs.cfm
    3. PA MWBE — PHFA and PA DGS MWDBE certified firms
       https://www.dgs.pa.gov/Materials-Services-Procurement/Small-Diverse-Business/Pages/default.aspx

DATA MODEL:
- contacts table in Supabase (already created in schema):
    user_id UUID, company_name TEXT, contact_name TEXT, email TEXT, phone TEXT
    naics_codes INTEGER[], sam_registered BOOLEAN, cage_code TEXT
    certifications TEXT[] (small_business, 8a, hubzone, sdvosb, wosb, mwbe, etc.)
    capabilities TEXT, website TEXT, city TEXT, state TEXT, zip TEXT
    fts TSVECTOR GENERATED ALWAYS AS (to_tsvector(...)) STORED

STEPS:
1. Create /govcon-app/lib/ingestion/subcontractors/ directory with:
   - samgov_entities.ts — fetch Pittsburgh-area registered entities from SAM.gov Entity API
   - sba_dsbs.ts — scrape SBA DSBS for Pittsburgh small businesses
   - pa_mwbe.ts — scrape PA DGS MWDBE certified firms list

2. Create /govcon-app/app/api/ingest/subcontractors/route.ts:
   - POST handler secured with x-ingest-secret
   - Run all three scrapers, upsert to contacts table
   - Deduplicate on cage_code or (company_name + zip)

3. Trigger ingestion to seed initial data

4. Verify /subcontractors page renders the data

5. Add to cron in TASK_019 vercel.json

6. Commit and push

ACCEPTANCE CRITERIA:
- contacts table has 50+ Pittsburgh-area subcontractor records
- /subcontractors page shows real companies with name, NAICS codes, certifications
- Search/filter works on the populated data
