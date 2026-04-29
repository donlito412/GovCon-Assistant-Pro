# PROJECT: GovCon Assistant Pro

---

## PROJECT NAME
GovCon Assistant Pro — Pittsburgh-Area Government Business Intelligence Platform

## GITHUB REPO
https://github.com/donlito412/GovCon-Assistant-Pro.git

---

## GOAL
Build a personal intelligence platform that aggregates government contracts, educational institution procurement, grants, and business meetings/events from every relevant Pittsburgh-area source — all searchable in one place. Purpose: find, track, and win business opportunities and never miss a relevant meeting or funding opportunity.

---

## PRODUCT / SYSTEM DESCRIPTION
A full-stack web app with 4 core modules:

### MODULE 1 — CONTRACTS
- Federal contracts (SAM.gov), PA State contracts (eMarketplace, PA Treasury), Local contracts (City of Pittsburgh, Allegheny County, URA)
- Educational institution RFPs/bids (Pitt, CMU, CCAC, Pittsburgh Public Schools, Duquesne)
- Search, filter, sort by NAICS, agency, dollar value, deadline, set-aside type, source
- Contract detail pages with full solicitation info
- Pipeline board (drag-and-drop Kanban: Identified → Qualifying → Pursuing → Submitted → Won/Lost)
- Agency intelligence pages (spending history, award patterns, key contacts)

### MODULE 2 — GRANTS
- Federal grants (Grants.gov API), PA State grants (DCED, PA.gov), Local grants/loans (URA, Allegheny County), SBA/SBIR
- Filter by eligibility, amount range, deadline, type (grant vs loan vs tax credit)
- Separate from contracts but included in unified search and alerts

### MODULE 3 — EVENTS & MEETINGS
- Public government meetings: Pittsburgh City Council, City Planning, URA Board, Allegheny County Council
- Business networking events: Pittsburgh Business Collective, Pittsburgh Chamber, Eventbrite business events
- Unified calendar view + list view
- .ics export for any event (Google Calendar / Apple Calendar / Outlook)
- Events tagged by relevance: contracts announced, grants discussed, networking, development plans

### MODULE 4 — SUBCONTRACTOR DIRECTORY
- Search registered Pittsburgh-area contractors by NAICS code, certification, and capability
- Data from SAM.gov Entity API, SBA Dynamic Small Business Search, PHFA MWBE Directory, Allegheny County MWDBE
- Subcontractor profiles with award history (from USASpending), certifications (8(a), HUBZone, SDVOSB, WOSB, MWBE)
- "Find Subs for This Contract" — auto-suggest subs whose NAICS matches any contract Jon is pursuing
- One-click outreach directly from sub profile

### MODULE 5 — OUTREACH CRM
- Contact subcontractors directly via email from within the platform (sent via Resend)
- Full conversation thread history per contact
- Status tracking: Not Contacted → Sent → Replied → Meeting Set → Teaming Agreed / Declined
- Follow-up reminders if no reply after N days
- Link contacts to specific bids

### MODULE 6 — BID TRACKER
- Log every bid submitted: amount, team composition, documents, strategy notes
- BidTeamBuilder: assemble subcontractor team for each bid, assign roles + % of work
- Record outcomes: Won (award amount) or Lost (who won, their price, debriefing notes)
- Bid history with full timeline: opportunity posted → bid submitted → award decision
- Win rate, total $ won, $ pending — shown on analytics dashboard

### MODULE 7 — PIPELINE & ALERTS
- Kanban pipeline board for tracking opportunities through stages
- Pipeline → Bid Tracker integration: submitting a bid auto-opens bid logging form
- Saved searches with daily email alerts (Resend)
- Morning digest of upcoming events this week
- Analytics dashboard: spending trends, deadline radar, pipeline value by stage, win rate

---

## TARGET USER
- Phase 1 (NOW): Jon — personal use, finding and winning Pittsburgh-area contracts, grants, and business opportunities
- Phase 2 (FUTURE): Small businesses, contractors, and consultants in the Pittsburgh metro area (public SaaS)

---

## TECH STACK
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API routes (serverless functions on Netlify)
- **Database**: Supabase (PostgreSQL — free tier)
- **Email**: Resend (alert emails + event digests — free tier 3k/mo)
- **Hosting**: Netlify (frontend + serverless + cron jobs) + GitHub (version control)
- **Auth**: Supabase Auth (email/password)

## DATA SOURCES (20+ sources across 7 categories)
Contracts (Federal): SAM.gov, USASpending.gov, FPDS
Contracts (State): PA eMarketplace, PA Treasury, PA Bulletin
Contracts (Local): City of Pittsburgh, Allegheny County, URA
Contracts (Education): Pitt, CMU, CCAC, Pittsburgh Public Schools, Duquesne
Grants: Grants.gov, PA.gov/grants, PA DCED, URA, Allegheny County, SBA/SBIR
Events: Pittsburgh City Council, City Planning, URA Board, Allegheny County Council, Eventbrite, Pittsburgh Business Collective
Subcontractors: SAM.gov Entity API, SBA DSBS, PHFA MWBE Directory, Allegheny County MWDBE
Forecasts + Incumbents: SAM.gov Forecast API, USASpending.gov FPDS Award Data
AI: Anthropic Claude API (claude-sonnet-4-6)

Full details: /05_ASSETS/data_sources.md

---

## SUCCESS CRITERIA
1. All Pittsburgh-area contracts (federal + state + local + educational) searchable in one place
2. All Pittsburgh-area grants visible with eligibility + deadline info
3. All relevant public meetings + business events on one calendar
4. Pipeline board tracking opportunities from discovery to award
5. Subcontractor directory searchable by NAICS — "Find Subs" works from any contract
6. Can email a subcontractor and track the full conversation without leaving the platform
7. Every bid Jon submits is logged with amount, team, and outcome
8. Win rate, total $ won, and bid analytics visible on dashboard
9. AI Assistant answers questions, analyzes RFP documents, recommends bid strategy, identifies incumbents
10. Recompete Radar shows expiring Pittsburgh-area contracts 6–18 months in advance
11. Forecast Opportunities shows what agencies plan to buy before the RFP drops
12. Daily email alerts for new matches on saved searches
13. Site deployed on Netlify, accessible from any browser
14. All data refreshes automatically via daily/weekly cron jobs

---

## BUILD STANDARD
**PRODUCTION ONLY — no shortcuts, no placeholders, no prototypes. Every task delivers real, working, production-quality code that Jon can use immediately.**

---

## CURRENT STATUS
**NOT STARTED**

---

## TASK SEQUENCE (18 tasks)
- TASK_001 — Scaffold Next.js app, Supabase schema, Netlify deploy
- TASK_002 — Federal contracts ingestion (SAM.gov)
- TASK_003 — State + local contracts ingestion (PA + Pittsburgh + Allegheny County + URA)
- TASK_004 — Contract discovery UI (search, filter, detail pages)
- TASK_005 — Pipeline Kanban board
- TASK_006 — Saved searches + email alerts
- TASK_007 — Agency intelligence profiles
- TASK_008 — Analytics dashboard
- TASK_009 — Auth + user settings
- TASK_010 — Production deployment
- TASK_011 — Educational institution procurement ingestion (Pitt, CMU, CCAC, PPS, Duquesne)
- TASK_012 — Grants module (Grants.gov, PA DCED, URA, SBA)
- TASK_013 — Events & meetings module (City Council, Planning, URA, Eventbrite, networking)
- TASK_014 — Subcontractor directory (SAM.gov Entity API, SBA DSBS, PHFA MWBE, Allegheny MWDBE)
- TASK_015 — Outreach CRM + Bid Tracker (email subs, track conversations, log bids, record outcomes)
- TASK_016 — Local Business Community (directory of non-SAM Pittsburgh businesses, teaming board, messaging)
- TASK_017 — AI Assistant (Claude-powered expert: RFP analysis, bid strategy, competitor intel, document upload)
- TASK_018 — Incumbent Tracker + Forecast Opportunities (recompete radar, who holds contracts now, pre-solicitation intel)

---

## NEXT MILESTONE
TASK_001 — Scaffold the Next.js project, initialize GitHub repo, connect Supabase, deploy skeleton to Netlify
