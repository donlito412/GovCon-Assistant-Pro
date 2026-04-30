TASK ID: 016

STATUS: DONE

GOAL:
Build the Local Business Community module — a directory and networking layer for Pittsburgh-area business owners who are NOT necessarily registered with SAM.gov. Business owners can discover each other, propose teaming arrangements, and collaborate on bids. This fills the gap between Jon's subcontractor directory (registered federal vendors) and the broader local business ecosystem.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
- /03_OUTPUTS/TASK_014_subcontractors/ (registered sub directory — complement, not replace)
- /03_OUTPUTS/TASK_015_outreach_crm/ (outreach CRM — extend for community messaging)

OUTPUT:
/03_OUTPUTS/TASK_016_community/
  - supabase_community_schema.sql — community_profiles, teaming_posts, connection_requests, messages tables
  - /lib/ingestion/community/pa_corps.ts — PA Dept of State business scraper (seed data)
  - /app/(dashboard)/community/page.tsx — community directory + feed page
  - /app/(dashboard)/community/[profileId]/page.tsx — business profile page
  - /app/(dashboard)/community/my-profile/page.tsx — edit own profile page
  - /app/(dashboard)/community/teaming/page.tsx — teaming board (open teaming requests)
  - /components/community/BusinessProfileCard.tsx — business card for directory
  - /components/community/BusinessProfileFull.tsx — full profile view
  - /components/community/TeamingPostCard.tsx — teaming opportunity post
  - /components/community/PostTeamingRequest.tsx — form to post a teaming request
  - /components/community/ConnectionRequest.tsx — send/accept connection
  - /components/community/MessageThread.tsx — direct message thread
  - /components/community/ProfileSetupForm.tsx — onboarding form for new community members
  - /lib/api/community.ts — community CRUD hooks
  - /app/api/community/profiles/route.ts — GET list / POST create
  - /app/api/community/profiles/[id]/route.ts — GET profile / PATCH update
  - /app/api/community/teaming/route.ts — GET posts / POST create teaming request
  - /app/api/community/connections/route.ts — send / accept / reject connection
  - /app/api/community/messages/route.ts — GET thread / POST message

---

## DATABASE SCHEMA

community_profiles table:
- id, user_id (nullable — for platform users who also have a community profile)
- business_name, owner_name
- email, phone, website
- neighborhood (Pittsburgh neighborhood / suburb)
- city, zip
- business_type (LLC, sole_prop, corp, partnership, nonprofit)
- industry (free text + NAICS code optional)
- naics_codes (JSONB array — optional, for those who know them)
- services_offered (JSONB array of service descriptions)
- years_in_business
- employee_count_range (1, 2-5, 6-10, 11-50, 50+)
- certifications (JSONB — mwbe, veteran_owned, minority_owned, woman_owned, etc.)
- sam_registered (boolean — do they have a SAM.gov registration?)
- sam_uei (nullable — if they're also in the sub directory)
- bio (text — what the business does, what they're looking for)
- looking_for (JSONB array: subcontractor_work, prime_teaming, suppliers, mentorship, partnerships)
- profile_photo_url
- is_verified (boolean — verified via PA Dept of State lookup)
- source (self_registered / pa_corps_import)
- created_at, updated_at

teaming_posts table:
- id, author_profile_id (FK → community_profiles.id)
- linked_opportunity_id (nullable FK → opportunities.id — the contract being pursued)
- title (e.g., "Looking for IT subcontractor — CCAC RFP #2026-045")
- description (what you need, what you're offering)
- contract_value_range
- naics_needed (JSONB array)
- certifications_needed (JSONB array)
- response_deadline
- status (open / filled / expired)
- created_at

connection_requests table:
- id, from_profile_id, to_profile_id
- message (intro message)
- status (pending / accepted / declined)
- created_at

community_messages table:
- id, from_profile_id, to_profile_id
- body (text)
- read_at
- created_at

---

## SEED DATA — PA DEPARTMENT OF STATE SCRAPER
Source: https://www.corporations.pa.gov/Search/CorpSearch
- Scrape active business entities in Pittsburgh (Allegheny County)
- Fields: business name, entity type, status (active), registered address, filing date
- Filter: active status only, Allegheny County address
- These become unverified stub profiles — business owners can "claim" them
- Scrape weekly (Sunday cron alongside subcontractor refresh)
- source = "pa_corps_import", is_verified = false until claimed

---

## FEATURES

1. Community Directory page:
   - Search by: business name, service keyword, neighborhood, industry/NAICS
   - Filter by: SAM-registered toggle, certifications, looking_for type
   - Sort by: newest, most connections, verified first
   - BusinessProfileCard: name, neighborhood, industry, cert badges, connection button

2. Business Profile page:
   - Full profile with all fields
   - Services offered tags
   - "Connect" button (sends connection request)
   - "Message" button (opens direct message — only after connection accepted)
   - "View Teaming Posts" (their open teaming requests)
   - If sam_registered=true: link to Subcontractor Profile (TASK_014)

3. Teaming Board page:
   - Feed of open teaming posts from all community members
   - Each post shows: what they're bidding on, what they need, deadline
   - Filter by: NAICS needed, certification needed, contract value range
   - "I'm Interested" button → sends intro message to poster
   - Jon can post his own teaming requests (linked to a pipeline opportunity)

4. Post Teaming Request form:
   - Link to an opportunity from Jon's pipeline (or enter manually)
   - Describe what subcontractor/partner capability is needed
   - NAICS code(s) needed, certifications needed
   - Deadline for response

5. Direct Messaging:
   - Simple inbox — after connection accepted, can message directly
   - Message stored in community_messages table
   - Email notification on new message (via Resend)

6. My Profile setup:
   - First-time setup wizard for Jon's own community profile
   - Mirrors his Murphree Enterprises information
   - looking_for options: subcontractors, prime teaming partners, mentorship, suppliers

7. Profile Claiming (for PA Corps seed data):
   - Business owners found in PA Corps seed data can "claim" their profile
   - Claiming: enter business name → verify via email → fill out full profile
   - On claim: is_verified = true, source updated to self_registered

---

## INTEGRATION POINTS
- Pipeline card → "Post Teaming Request" button (links to Teaming Board post form, pre-fills opportunity)
- Subcontractor profile (TASK_014): if sub is also in community, show community profile link
- Analytics dashboard (TASK_008): community stats widget (total members, active teaming posts)

---

CONSTRAINTS:
- Community messaging is within-platform only (not external email) for privacy
- Notification emails (new message, connection request) sent via Resend
- PA Corps scraper runs weekly — not daily (data stable)
- All community profiles are public within the platform
- No phone numbers or emails displayed publicly — only after mutual connection
- Platform accounts (Supabase Auth) and community profiles are separate — Jon has both; general community members have only a community profile (no platform login for Phase 1)
- Phase 1: community is Jon-only-visible (private) — Phase 2 opens to public when product launches

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- ALL 16 TASKS COMPLETE — FULL PRODUCT BUILT
