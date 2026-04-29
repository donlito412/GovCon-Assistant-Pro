TASK ID: 007

STATUS: PENDING

GOAL:
Build Agency Profile pages — detailed intelligence pages for each agency posting Pittsburgh-area contracts. Shows spending history, active contracts, top NAICS codes, and key contacts.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
- /03_OUTPUTS/TASK_002_federal_ingestion/ (federal data with agency fields)
- /03_OUTPUTS/TASK_003_state_local_ingestion/ (state/local data with agency fields)

OUTPUT:
/03_OUTPUTS/TASK_007_agency_profiles/
  - /app/(dashboard)/agencies/page.tsx — agency directory page
  - /app/(dashboard)/agencies/[id]/page.tsx — agency detail/profile page
  - /components/agencies/AgencyCard.tsx — agency card for directory
  - /components/agencies/AgencyHeader.tsx — profile header (name, level, total spend)
  - /components/agencies/SpendingChart.tsx — spending by year bar chart (recharts)
  - /components/agencies/ActiveContractsList.tsx — current active opportunities from this agency
  - /components/agencies/TopNaicsList.tsx — top NAICS categories they buy in
  - /components/agencies/AwardHistory.tsx — past awards from USASpending API
  - /lib/api/agencies.ts — agency data hooks
  - /app/api/agencies/route.ts — agency list endpoint
  - /app/api/agencies/[id]/route.ts — agency detail + computed stats
  - /app/api/agencies/[id]/awards/route.ts — fetch award history from USASpending.gov

STEPS:
1. Agency directory page: list all agencies in DB, filter by level (Federal/State/Local), sort by active opportunity count or total spend
2. Agency detail page sections:
   a. Header: agency name, level badge, total active opportunities, total historical spend
   b. Active opportunities list (link to filtered ContractList)
   c. Spending by year chart (bar chart via recharts, data from USASpending API)
   d. Top NAICS codes (bar chart of categories this agency buys most)
   e. Award history table (past awards: vendor won, amount, date, description)
   f. Key contacts (contracting officers from SAM.gov opportunity data)
3. Build /api/agencies/[id]/awards route:
   - Call USASpending.gov API: /api/v2/search/spending_by_award/
   - Filter by: awarding_agency_name, place_of_performance_city=Pittsburgh
   - Return: top 20 most recent awards with vendor, amount, date
4. Aggregate agency stats from opportunities table in Supabase (active count, avg value, NAICS breakdown)
5. Agency records auto-created/updated during ingestion (TASK_002 + TASK_003)

CONSTRAINTS:
- USASpending API calls are real (no mocking) — handle 429 rate limits
- Charts must be interactive (hover tooltips via recharts)
- Award history must show real past winners — this is competitive intelligence
- Agency pages must load fast — pre-compute stats in Supabase, don't aggregate in real-time on every load
- All agency pages indexed and linkable from contract detail pages

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_008
