TASK ID: 013

STATUS: DONE

GOAL:
Build the Business Meetings & Events module. Aggregate public meetings (City Council, Planning, URA, Allegheny County) and business networking events (Chamber, Pittsburgh Business Collective, Eventbrite) into a unified calendar view so Jon never misses a relevant meeting or networking opportunity.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /05_ASSETS/data_sources.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts

OUTPUT:
/03_OUTPUTS/TASK_013_events/
  - supabase_events_schema.sql — events table schema
  - /lib/ingestion/events/city_council.ts — Pittsburgh City Council meeting scraper
  - /lib/ingestion/events/city_planning.ts — City Planning meetings scraper
  - /lib/ingestion/events/ura_meetings.ts — URA board meetings scraper
  - /lib/ingestion/events/allegheny_council.ts — Allegheny County Council scraper
  - /lib/ingestion/events/eventbrite.ts — Eventbrite Pittsburgh business events (API)
  - /lib/ingestion/events/pgh_business_collective.ts — Pittsburgh Business Collective events scraper
  - /app/api/ingest/events/route.ts — unified events ingestion endpoint
  - /app/(dashboard)/events/page.tsx — events calendar + list page
  - /components/events/EventCard.tsx — event card component
  - /components/events/EventCalendar.tsx — monthly calendar view
  - /components/events/EventFilterPanel.tsx — filter by type, date range, category
  - /lib/api/events.ts — events data hooks
  - /app/api/events/route.ts — events query endpoint
  - netlify.toml (updated: add events cron at 08:00 ET daily)

DATABASE SCHEMA — events table:
- id, source, title, organizer
- event_type (city_council/planning/ura/county_council/networking/conference/chamber/workshop)
- event_date, end_date, time_start, time_end
- location (address or "virtual"), meeting_link (Zoom/Teams URL if virtual)
- description, agenda_url
- why_relevant (enum: contracts_announced/grants_discussed/networking/development_plans/budget_decisions)
- url (source link)
- created_at

EVENT SOURCES:
1. Pittsburgh City Council (https://www.pittsburghpa.gov/City-Government/City-Council/Clerks-Office/Council-Meeting-Schedule)
   - Scrape: meeting dates, agenda PDFs, livestream links
   - Relevance: budget votes, contract approvals, development decisions
   - source = "city_council_pgh"

2. City Planning Meetings (https://www.pittsburghpa.gov/Business-Development/City-Planning/City-Planning-Meetings)
   - Scrape: planning board + commission meeting calendar
   - Relevance: zoning, development projects — contract opportunities follow
   - source = "city_planning_pgh"

3. URA Board Meetings (https://www.ura.org/)
   - Scrape: URA board meeting schedule and minutes/agendas
   - Relevance: grant/loan approvals, development contracts, minority business programs
   - source = "ura_pgh"

4. Allegheny County Council (https://www.alleghenycounty.us/)
   - Scrape: county council meeting schedule
   - Relevance: county contracts, budget decisions
   - source = "county_council_allegheny"

5. Eventbrite Pittsburgh Business Events (Eventbrite API)
   - Query: location=Pittsburgh PA, category=business, date=future
   - Filter: free + paid, networking + conferences + workshops
   - API endpoint: https://www.eventbriteapi.com/v3/events/search/
   - Requires Eventbrite API key (free — register at eventbrite.com/platform)
   - source = "eventbrite"

6. Pittsburgh Business Collective (https://pghbusinesscollective.com/events)
   - Scrape upcoming events list
   - source = "pgh_business_collective"

STEPS:
1. Create events table in Supabase with schema above
2. Build each scraper/API client
3. Build /api/events query endpoint (filter by type, date range, why_relevant)
4. Build Events page:
   - Toggle between Calendar view and List view
   - Calendar view: monthly grid with event dots, click to see day's events
   - List view: chronological, grouped by week
   - EventCard: title, organizer, date/time, location, type badge, why_relevant tag
   - Filter panel: event type checkboxes, date range, relevance filter
5. "Add to Calendar" button (generates .ics file download for any event)
6. Events included in email alerts — morning digest of events this week
7. Pin/save events (stored in user_saved_events table)
8. Eventbrite integration requires EVENTBRITE_API_KEY in .env

CONSTRAINTS:
- Public government meetings are always free — mark clearly
- Virtual vs in-person clearly distinguished with location chip
- Events that directly relate to contracts/grants/development tagged in why_relevant
- Calendar must show events from all sources in one unified view
- .ics export must work with Google Calendar, Apple Calendar, Outlook
- Eventbrite API key required — document in .env.example

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- PROJECT CORE COMPLETE — all 13 tasks done
