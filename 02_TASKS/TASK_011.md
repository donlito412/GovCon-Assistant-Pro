TASK ID: 011

STATUS: DONE

GOAL:
Build scrapers for educational institution procurement portals in the Pittsburgh area: University of Pittsburgh, Carnegie Mellon University, CCAC, Pittsburgh Public Schools, and Duquesne University. Normalize and store their RFPs/bids alongside government contracts in Supabase.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /05_ASSETS/data_sources.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
- /03_OUTPUTS/TASK_001_scaffold/lib/supabase.ts

OUTPUT:
/03_OUTPUTS/TASK_011_education_ingestion/
  - /lib/ingestion/education/pitt.ts — University of Pittsburgh RFP scraper
  - /lib/ingestion/education/cmu.ts — Carnegie Mellon procurement scraper
  - /lib/ingestion/education/ccac.ts — CCAC bids and RFPs scraper
  - /lib/ingestion/education/pgh_schools.ts — Pittsburgh Public Schools scraper
  - /lib/ingestion/education/duquesne.ts — Duquesne University procurement scraper
  - /app/api/ingest/education/route.ts — API route that runs all education scrapers
  - netlify.toml (updated: add education ingest cron at 07:30 ET daily)
  - /scripts/test_education_scrapers.ts — verify each scraper returns data

TARGET SOURCES:
1. University of Pittsburgh — https://www.ppt.pitt.edu/suppliers/info-suppliers/rfps
   - Scrape active RFPs and RFQs table
   - Fields: solicitation number, title, department, due date, description, contact, attachments
   - source = "education_pitt"

2. Carnegie Mellon University — https://www.cmu.edu/finance/procurementservices/doing-business/index.html
   - Scrape current solicitations list
   - Fields: opportunity title, department, due date, type (RFP/RFQ/Bid), contact
   - source = "education_cmu"

3. CCAC — https://www.ccac.edu/about/procurement.php
   - Scrape Invitations to Bid and RFPs table
   - Fields: bid number, title, due date, description, contact info
   - source = "education_ccac"

4. Pittsburgh Public Schools — https://www.pghschools.org/community/business-opportunities/bids-proposals
   - Scrape active bids and proposals
   - Fields: bid number, title, department, due date, download links
   - source = "education_pgh_schools"

5. Duquesne University — https://www.duq.edu/about/administration/finance/procurement
   - Scrape current RFPs/bids
   - Fields: title, department, due date, contact
   - source = "education_duquesne"

STEPS:
1. Build each scraper using fetch + cheerio
2. Normalize all results to the Opportunity type with category = "education"
3. Upsert to Supabase opportunities table (deduplicate on source + solicitation_number)
4. Build unified /api/ingest/education route — runs all 5 scrapers, logs counts
5. Test script: verify each scraper returns >= 1 result before marking complete

CONSTRAINTS:
- Respect robots.txt for each institution
- One scraper failure must not block others
- All fields populated from real scraped data — no placeholders
- Education contracts tagged with category = "education" for UI filtering
- Run as part of daily cron sequence
- DEDUPLICATION REQUIRED on every record:
  - Compute dedup_hash = SHA-256(lower(trim(title)) + lower(trim(institution_name)) + deadline_date)
  - On conflict (dedup_hash): append source to canonical_sources — no duplicate rows
  - Log new vs. deduplicated counts per institution scraper
- CATEGORIZATION REQUIRED:
  - threshold_category: compute from value using Oct 2025 thresholds where value is available
  - contract_type: map from solicitation type (RFP/RFQ/IFB)
  - naics_sector: set from NAICS if provided; otherwise derive from title keywords (e.g., "IT services" → IT & Technology)

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_012
