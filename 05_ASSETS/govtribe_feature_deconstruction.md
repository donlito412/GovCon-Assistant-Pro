# GovTribe Feature Deconstruction
# Research Date: 2026-04-29
# Purpose: Blueprint for PGH Gov Contracts build

---

## WHAT GOVTRIBE IS
GovTribe is the leading government market intelligence platform. It aggregates federal, state, and local contract opportunities, award data, agency intelligence, and vendor profiles into a single searchable platform used by contractors to find, track, and win government business.

Pricing: ~$100–$300/month (federal-only tracking)
Data sources: SAM.gov, USASpending.gov, FPDS, state procurement portals

---

## CORE FEATURE MODULES

### 1. OPPORTUNITY DISCOVERY
- Real-time feed of new contract opportunities
- Search by keyword, NAICS code, PSC code, agency, place of performance, set-aside type, contract vehicle
- Filter by dollar value range, due date, solicitation type (RFP, RFQ, IDIQ, etc.)
- Pre-award vs. post-award views
- Saved searches with email/Slack alerts for new matches
- AI-powered opportunity recommendations

### 2. OPPORTUNITY DETAIL PAGES
- Full solicitation description
- Agency name, contracting office, contracting officer name + contact
- NAICS code, PSC code, set-aside type
- Place of performance (city, state, zip)
- Response deadline, Q&A deadline
- Estimated value / award ceiling
- Attached documents (PDFs, amendments)
- Related awards (past history on this contract)
- Incumbent contractor (if recompete)

### 3. AGENCY INTELLIGENCE
- Profile page for every federal agency
- Total spending history by year
- Top contract vehicles used
- Top NAICS codes purchased
- Active vs. expiring contracts
- Forecast opportunities
- Key contacts (contracting officers)

### 4. VENDOR / COMPETITOR PROFILES
- Profile for every registered federal contractor
- Award history (what they won, from which agencies, for how much)
- Active contracts
- NAICS codes they work in
- Set-aside statuses (SDVOSB, 8(a), HUBZone, WOSB, etc.)
- Teaming suggestions (vendors who complement your profile)

### 5. PIPELINE / CAPTURE MANAGEMENT
- Kanban-style board: Identified → Qualifying → Pursuing → Submitted → Award
- Drag-and-drop opportunity cards
- Notes, tasks, and deadlines per opportunity
- Team collaboration (assign tasks, tag teammates)
- Win probability scoring
- Pipeline value dashboard ($ total in each stage)

### 6. MARKET INTELLIGENCE & ANALYTICS
- Spending trends by agency, NAICS, geography
- Competitive landscape (who's winning in your space)
- Award history search
- Contract expiration tracker (recompete radar)
- Budget forecasting

### 7. ALERTS & NOTIFICATIONS
- Email alerts for saved search matches
- Slack / Zapier integration
- Deadline reminders
- New amendment notifications
- Award announcement alerts

### 8. SEARCH INFRASTRUCTURE
- Full-text search across all entities (opportunities, agencies, vendors, awards)
- Advanced filter combinations
- Sort by relevance, deadline, value, recency
- Bulk export (CSV)

---

## OUR BUILD PRIORITIES (PGH Gov Contracts)

### PHASE 1 — CORE (Build Now)
1. Opportunity discovery with Pittsburgh/Allegheny County geo-filter
2. Search + filter (NAICS, agency, value, deadline, set-aside)
3. Opportunity detail pages
4. Pipeline board (Kanban)
5. Saved searches + email alerts
6. Data from: SAM.gov (federal) + PA eMarketplace (state) + Allegheny County (local)

### PHASE 2 — INTELLIGENCE (Build Next)
7. Agency profile pages
8. Award history / spending analytics
9. Competitor / vendor profiles
10. Recompete radar

### PHASE 3 — SCALE (Public Launch)
11. User accounts + multi-user support
12. Subscription/billing (Stripe)
13. AI-powered recommendations
14. Mobile app

---

## DATA SOURCES FOR PGH BUILD

### FEDERAL
- **SAM.gov Opportunities API** — https://open.gsa.gov/api/get-opportunities-public-api/
  - Free with API key (register at SAM.gov)
  - Filter by: placeOfPerformance.state = "PA", city = "Pittsburgh" or zip codes
  - Pittsburgh area zip codes: 152xx range (Allegheny County)
  - Covers: Allegheny, Butler, Washington, Westmoreland, Beaver counties
  - Rate limit: 1,000 requests/day (public key)

- **SAM.gov Contract Awards API** — https://open.gsa.gov/api/contract-awards/
  - Award history, incumbent contractors

- **USASpending.gov API** — https://api.usaspending.gov/
  - Federal spending data, past awards
  - Free, no key required
  - Filter by place_of_performance_city, state

### STATE (PENNSYLVANIA)
- **PA eMarketplace** — https://www.emarketplace.state.pa.us/
  - Scrape or RSS: Commonwealth of Pennsylvania solicitations
  - No official API — requires scraper

- **PA Treasury Contracts e-Library** — https://contracts.patreasury.gov/
  - Contracts $5,000+ since 2008
  - Scraper needed

- **PA Bulletin** — https://www.pacodeandbulletin.gov/
  - State contract notices published weekly

### LOCAL
- **Allegheny County Purchasing** — https://www.alleghenycounty.us/Projects-and-Initiatives/Doing-Business-with-Allegheny-County-Bids-and-Solicitations/Purchasing-Bids-and-Proposals
  - Manual bids listing, scraper needed

- **Allegheny County Public Works** — https://www.alleghenycounty.us/Projects-and-Initiatives/Doing-Business-with-Allegheny-County-Bids-and-Solicitations/Public-Works-Bids-and-Proposals
  - Construction/infrastructure bids

- **City of Pittsburgh** — https://pittsburghpa.gov/omb/solicitations
  - City solicitations, scraper needed

- **BidNet Direct PA** — https://www.bidnetdirect.com/pennsylvania
  - Aggregates many PA municipalities — may have RSS/API

---

## KEY FILTER PARAMETERS FOR PITTSBURGH FOCUS
- Place of performance: PA + Allegheny County zip codes (15201–15290)
- Surrounding counties: Butler (16001), Washington (15301), Westmoreland (15601), Beaver (15001)
- State agency: Commonwealth of Pennsylvania
- Local agency: City of Pittsburgh, Allegheny County
