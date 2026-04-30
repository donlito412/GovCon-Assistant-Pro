TASK ID: 014

STATUS: DONE

GOAL:
Build the On-Demand Company Finder — an AI-powered search that finds any company (subcontractor, supplier, or teaming partner) when Jon needs one for a specific bid. Not a standing directory with weekly cron jobs. Jon asks the AI, the AI finds companies from any source (registered or not), presents results with approval before any action is taken. Companies Jon interacts with are saved to a lightweight contact book for future use.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /05_ASSETS/data_sources.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
- /03_OUTPUTS/TASK_005_pipeline/ (for "Find Team Members" button on pipeline card)
- /03_OUTPUTS/TASK_015_outreach_crm/ (outreach CRM — contact book integration)

OUTPUT:
/03_OUTPUTS/TASK_014_company_finder/
  - supabase_contacts_schema.sql — contacts table (companies Jon has found/saved/worked with)
  - /lib/search/company_search.ts — unified company search: queries SAM.gov Entity API + Google Places API + web search
  - /lib/search/samgov_entities.ts — SAM.gov Entity API client (for government-registered companies)
  - /lib/search/google_places.ts — Google Places API client (finds any local business by type/keyword)
  - /app/api/company-search/route.ts — POST endpoint: takes { query, naics, location, registered_only } → returns ranked results
  - /app/api/contacts/route.ts — GET list / POST save contact
  - /app/api/contacts/[id]/route.ts — GET / PATCH / DELETE saved contact
  - /app/(dashboard)/contacts/page.tsx — saved contacts / contact book page
  - /components/company-finder/CompanySearchResult.tsx — result card: name, type, location, source, certifications if registered, "Save Contact" + "Add to Bid Team" buttons (approval required)
  - /components/company-finder/CompanySearchPanel.tsx — search panel embedded in pipeline card + standalone page
  - /components/contacts/ContactCard.tsx — saved contact card (name, company, status, linked bids)
  - /lib/api/company-search.ts — client-side hooks

---

## MODEL: ON-DEMAND SEARCH, NOT A STANDING DIRECTORY

Old model (removed): Weekly cron pulls all PA-registered entities into a database. Jon browses a directory.

New model: Jon is working on a bid. He asks the AI (or clicks "Find Team Members" on a pipeline card):
  - "Find me a janitorial supply company in Pittsburgh"
  - "Find an 8(a) certified IT subcontractor for this NAICS 541512 contract"
  - "Who supplies construction materials in Allegheny County?"

The platform searches live across all sources, returns results, Jon approves which ones to save or contact. Nothing is pre-loaded. Everything is on-demand.

---

## SEARCH SOURCES (queried live, in priority order)

1. SAM.gov Entity API (https://open.gsa.gov/api/entity-api/)
   - Use when: government certification matters (set-aside requirements, 8(a), HUBZone, SDVOSB, etc.)
   - Params: naicsCode, physicalAddressStateCode=PA, keyword
   - Returns: UEI, name, address, NAICS codes, certifications, POC contact
   - Auth: SAMGOV_API_KEY (Jon already has)

2. Google Places API (https://developers.google.com/maps/documentation/places/web-service)
   - Use when: finding any local business regardless of government registration
   - Params: keyword (e.g. "janitorial supplies", "IT staffing", "concrete contractor"), location=Pittsburgh PA, radius=50mi
   - Returns: business name, address, phone, website, category, rating
   - Auth: GOOGLE_PLACES_API_KEY
   - This finds companies that are NOT SAM registered — they need Jon, Jon needs them

3. Web Search (Brave Search API or similar)
   - Use when: specialized supplier or niche company not in Places
   - Returns: business name, website, description from web
   - Auth: BRAVE_SEARCH_API_KEY (or equivalent)

---

## DATABASE SCHEMA — contacts table (lightweight contact book)

Saves companies Jon has found, interacted with, or wants to remember:
- id
- company_name (TEXT NOT NULL)
- contact_name (TEXT)
- email (TEXT)
- phone (TEXT)
- website (TEXT)
- address, city, state, zip
- source (TEXT: 'samgov' | 'google_places' | 'web_search' | 'manual')
- uei (TEXT nullable — if SAM registered)
- naics_codes (JSONB array)
- certifications (JSONB nullable — if government registered)
- sam_registered (BOOLEAN DEFAULT FALSE)
- notes (TEXT — Jon's notes)
- linked_bid_ids (JSONB array — which bids this contact is associated with)
- status (TEXT: 'saved' | 'contacted' | 'teaming' | 'declined')
- created_at, updated_at

---

## STEPS

1. Build SAM.gov Entity API client (live search, not batch ingest)
   - Search by NAICS + PA + Pittsburgh area zips
   - Return top 20 results per search

2. Build Google Places API client
   - Search by keyword + "Pittsburgh PA" location
   - Return name, address, phone, website, category
   - Flag as sam_registered = false

3. Build web search fallback (Brave Search or similar)
   - For niche searches not covered by Places

4. Build unified /api/company-search endpoint:
   - Accepts: { query, naics, location, require_certified, certification_type }
   - Queries all three sources in parallel
   - Merges + deduplicates results (match on name + address)
   - Returns ranked list: SAM-registered first if certification required, otherwise by relevance

5. Build CompanySearchPanel component:
   - Embedded in Pipeline card ("Find Team Members" button)
   - Standalone page at /contacts/search
   - Shows results as CompanySearchResult cards
   - Every action (Save Contact, Add to Bid Team, Send Outreach) requires Jon's approval before executing

6. Build Contacts page (/contacts):
   - Lists all saved contacts
   - Filter by: status, certification, linked bid, source (SAM vs non-SAM)
   - Links to Outreach CRM (TASK_015) for email history

---

## APPROVAL-BASED ACTIONS

Every action requires Jon's explicit approval before executing:
- "Save this contact" → shows contact card preview → Jon clicks Confirm Save
- "Add to Bid Team" → shows team assignment form → Jon clicks Confirm Add
- "Send outreach email" → shows drafted email → Jon clicks Confirm Send
- No company is saved, contacted, or added to a bid without Jon approving first

---

## CONSTRAINTS
- Google Places API key required (GOOGLE_PLACES_API_KEY env var)
- SAM.gov API key required (SAMGOV_API_KEY — already in use for TASK_002)
- Brave Search (or equivalent) API key required (SEARCH_API_KEY env var)
- No pre-loaded or cached company database — all searches are live
- Contact book only stores companies Jon explicitly saves
- Contact info never auto-shared or auto-emailed — always Jon's approval first
- Non-SAM companies displayed clearly labeled "Not SAM Registered" — Jon knows upfront

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_015
