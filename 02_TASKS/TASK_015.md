TASK ID: 015

STATUS: DONE

GOAL:
Build the Outreach CRM and Bid Tracker — two tightly integrated tools. The Outreach CRM lets Jon contact subcontractors directly from the platform and tracks every conversation. The Bid Tracker creates a permanent record of every bid submitted: amount, team, documents, result, and who won if Jon lost.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
- /03_OUTPUTS/TASK_005_pipeline/ (pipeline board — bid tracker extends pipeline stages)
- /03_OUTPUTS/TASK_006_saved_searches/ (Resend email — reuse for outreach emails)
- /03_OUTPUTS/TASK_014_subcontractors/ (subcontractor profiles — outreach targets)

OUTPUT:
/03_OUTPUTS/TASK_015_outreach_crm/
  - supabase_crm_schema.sql — outreach_contacts, outreach_threads, bid_records tables
  - /app/(dashboard)/outreach/page.tsx — outreach CRM main page
  - /app/(dashboard)/outreach/[contactId]/page.tsx — conversation thread page
  - /app/(dashboard)/bids/page.tsx — bid history tracker page
  - /app/(dashboard)/bids/[bidId]/page.tsx — individual bid detail page
  - /components/outreach/ContactCard.tsx — contact card with conversation status
  - /components/outreach/ComposeEmail.tsx — email compose form (send via Resend)
  - /components/outreach/ThreadView.tsx — full email thread view
  - /components/outreach/OutreachStatusBadge.tsx — status: Not Contacted / Sent / Replied / Meeting Set / Teaming Agreed / Declined
  - /components/bids/BidCard.tsx — bid record card
  - /components/bids/BidDetailPanel.tsx — full bid details with team, amount, result
  - /components/bids/BidTeamBuilder.tsx — assemble subcontractor team for a bid
  - /components/bids/SubmitBidForm.tsx — log a bid submission
  - /components/bids/BidOutcomeForm.tsx — record win/loss + details
  - /components/bids/BidStats.tsx — win rate, total bids, $ won, avg bid value
  - /lib/api/outreach.ts — outreach CRUD hooks
  - /lib/api/bids.ts — bid record CRUD hooks
  - /app/api/outreach/route.ts — GET list / POST create contact
  - /app/api/outreach/[id]/emails/route.ts — GET thread / POST send email
  - /app/api/bids/route.ts — GET list / POST create bid record
  - /app/api/bids/[id]/route.ts — PATCH (update outcome) / GET detail
  - /lib/email/outreach-email.tsx — React Email template for subcontractor outreach

---

## MODULE 1: OUTREACH CRM

DATABASE SCHEMA:
outreach_contacts table:
- id, subcontractor_id (FK → subcontractors.id)
- contact_name, company_name, email, phone
- status (not_contacted / sent / replied / meeting_set / teaming_agreed / declined / not_a_fit)
- first_contacted_at, last_activity_at
- linked_bid_ids (JSONB array — which bids this contact is associated with)
- notes (text)
- created_at

outreach_threads table:
- id, contact_id (FK → outreach_contacts.id)
- direction (outbound / inbound)
- subject, body
- sent_at, from_email, to_email
- resend_message_id (for tracking)

OUTREACH CRM FEATURES:
1. Outreach dashboard: list all contacts, grouped by status, search by name/company
2. "Contact" button on SubCard (TASK_014) creates a new outreach_contact record
3. Compose Email panel:
   - Pre-filled To: (contact email), From: Jon's email
   - Subject line auto-suggested based on contract context (e.g., "Teaming Opportunity — [Contract Title]")
   - Body: free-form rich text editor
   - Send via Resend API — real email delivery
4. ThreadView: full conversation history (outbound emails + manually logged inbound replies)
   - "Log Reply" button: paste in their response to keep thread complete
5. Status pipeline: move contacts through stages (Not Contacted → Sent → Replied → Meeting Set → Teaming Agreed / Declined)
6. "Add to Bid Team" action: links contact to a specific bid (BidTeamBuilder)
7. Filter contacts by: status, linked bid, company, last activity date
8. Follow-up reminders: if no reply after N days, show reminder badge on contact

---

## MODULE 2: BID TRACKER

DATABASE SCHEMA:
bid_records table:
- id, opportunity_id (FK → opportunities.id)
- pipeline_item_id (FK → pipeline_items.id)
- contract_title, agency, solicitation_number, source
- bid_submitted_date
- bid_amount (integer, cents)
- bid_narrative (text — notes about the bid strategy, differentiators)
- team_composition (JSONB array: [{ subcontractor_id, company_name, role, naics, percentage_of_work }])
- documents_submitted (JSONB array: [{ name, type, submitted_at }])
- status (pending / won / lost / withdrawn / cancelled / no_award)
- award_date (when decision was announced)
- award_amount (if won — actual awarded value, may differ from bid)
- if_lost_winner_name (company that won)
- if_lost_winner_amount (their bid amount, if disclosed)
- if_lost_reason (text — debriefing notes)
- created_at, updated_at

BID TRACKER FEATURES:
1. Bid History page: chronological list of all bids submitted
   - BidCard: contract title, agency, bid date, bid amount, status badge, team size
   - Sort by: date submitted, bid amount, status
   - Filter by: status (pending/won/lost/withdrawn), date range, agency, source
2. Submit Bid form (triggered from Pipeline card when moving to "Submitted" stage):
   - Contract auto-filled from pipeline item
   - Enter: bid amount, submission date, team composition, documents submitted
   - Optional: bid narrative / strategy notes
3. BidTeamBuilder:
   - Search and add subcontractors from directory (TASK_014)
   - Assign role (prime / sub) and % of work to each team member
   - Shows team's combined certifications (set-aside eligibility)
   - Shows team's combined NAICS coverage
4. Record Outcome form (when bid resolves — won or lost):
   - Won: enter award amount, award date
   - Lost: enter winner name, winner amount (if disclosed), debriefing notes
   - Withdrawn / No Award: notes field
5. Bid Detail page:
   - All bid fields displayed
   - Team composition with links to sub profiles
   - Timeline: opportunity posted → bid submitted → award decision
   - Documents list
   - Lessons learned notes (editable after outcome)
6. BidStats panel (shown on Analytics dashboard — TASK_008 integration):
   - Total bids submitted
   - Win rate (%)
   - Total $ won
   - Total $ pending (submitted, awaiting decision)
   - Average bid value
   - Win rate by agency
   - Win rate by set-aside type

---

PIPELINE INTEGRATION (TASK_005):
- When a Pipeline card is moved to "Submitted" stage → SubmitBidForm modal opens automatically
- When moved to "Won" or "Lost" → BidOutcomeForm opens automatically
- Bid record always linked back to pipeline item (bidirectional)
- Pipeline card shows bid amount + team size as chips once bid is logged

---

CONSTRAINTS:
- Emails sent via Resend (same API key as alerts) — from Jon's verified domain
- All sent emails stored in outreach_threads (Resend webhook or manual log)
- Bid amounts stored as integers in cents
- Team composition stored as JSONB — subcontractors can be from directory OR manually entered (for subs not in DB)
- Inbound replies manually logged (no email parsing) — Jon pastes them in
- Win/loss data is private — never exposed if product goes public (user-scoped data)
- BidStats only shown when >= 3 bid outcomes recorded (avoid misleading percentages)

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- ALL 15 TASKS COMPLETE — FULL PRODUCT BUILT
