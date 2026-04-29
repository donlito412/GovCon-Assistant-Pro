TASK ID: 003

STATUS: PENDING

GOAL:
Build scrapers for Pennsylvania state contracts (PA eMarketplace + PA Treasury) and local Pittsburgh/Allegheny County contracts. Store normalized records in Supabase alongside federal data.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /05_ASSETS/data_sources.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
- /03_OUTPUTS/TASK_001_scaffold/lib/supabase.ts

OUTPUT:
/03_OUTPUTS/TASK_003_state_local_ingestion/
  - /lib/ingestion/pa_emarketplace.ts — PA eMarketplace scraper
  - /lib/ingestion/pa_treasury.ts — PA Treasury contracts scraper
  - /lib/ingestion/allegheny_county.ts — Allegheny County purchasing scraper
  - /lib/ingestion/pittsburgh_city.ts — City of Pittsburgh solicitations scraper
  - /app/api/ingest/state-local/route.ts — API route that triggers all state/local scrapers
  - netlify.toml (updated: add state-local cron at 07:00 ET daily)
  - /scripts/test_scrapers.ts — test script to verify each scraper returns data

STEPS:
1. PA eMarketplace scraper (https://www.emarketplace.state.pa.us/)
   - Fetch active solicitations listing page
   - Parse: solicitation number, title, agency, category, due date, detail page URL
   - Follow detail page URLs to get full description
   - Normalize to Opportunity type, source = "state_pa_emarketplace"

2. PA Treasury scraper (https://contracts.patreasury.gov/search.aspx)
   - POST search form for active contracts
   - Parse: contract number, vendor/agency, description, value, dates
   - Normalize to Opportunity type, source = "state_pa_treasury"

3. Allegheny County Purchasing scraper (https://www.alleghenycounty.us/...)
   - Fetch open solicitations and public works bids pages
   - Parse: bid number, title, department, due date, contact, detail URL
   - Normalize to Opportunity type, source = "local_allegheny"

4. City of Pittsburgh scraper (https://pittsburghpa.gov/omb/solicitations)
   - Fetch active solicitations
   - Parse: RFP/RFQ number, title, department, due date, download links
   - Normalize to Opportunity type, source = "local_pittsburgh"

5. Build unified /api/ingest/state-local route that runs all 4 scrapers in sequence
6. Write test script verifying each scraper returns >= 1 result

CONSTRAINTS:
- Use fetch + cheerio for HTML scraping (no Puppeteer/browser automation)
- Respect robots.txt for each site
- Handle errors per scraper independently — one failure must not block others
- Log each scraper: started, completed, N new records, N deduplicated, any errors
- DEDUPLICATION REQUIRED on every record before upsert:
  - Compute dedup_hash = SHA-256(lower(trim(title)) + lower(trim(agency)) + deadline_date)
  - On conflict (dedup_hash): append this source to canonical_sources array — do NOT insert duplicate row
  - Also check solicitation_number uniqueness within same source as secondary guard
  - A state contract that also appears on BidNet and a county portal = 1 row, 3 sources in canonical_sources
- CATEGORIZATION REQUIRED at ingestion time:
  - threshold_category: use same Oct 2025 thresholds as federal
  - naics_sector: map from NAICS code if available; set to "unknown" if no NAICS provided
  - contract_type: map from solicitation type field (RFP/RFQ/IFB/etc.)
- All fields populated from real scraped data — no placeholder values

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_004
