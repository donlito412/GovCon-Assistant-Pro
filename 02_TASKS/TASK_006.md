TASK ID: 006

STATUS: PENDING

GOAL:
Build the Saved Searches and Alerts system. Jon can save any filter combination as a named search, and the system emails him when new matching contracts are posted.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
- /03_OUTPUTS/TASK_004_discovery_ui/components/contracts/FilterPanel.tsx
- /03_OUTPUTS/TASK_001_scaffold/supabase_schema.sql

OUTPUT:
/03_OUTPUTS/TASK_006_saved_searches/
  - /app/(dashboard)/saved-searches/page.tsx — saved searches management page
  - /components/saved-searches/SavedSearchCard.tsx — saved search card with last match count
  - /components/saved-searches/SaveSearchModal.tsx — modal to name + save current filters
  - /components/saved-searches/AlertPreferences.tsx — toggle alerts on/off per search
  - /lib/api/saved-searches.ts — CRUD hooks for saved searches
  - /app/api/saved-searches/route.ts — GET list / POST create
  - /app/api/saved-searches/[id]/route.ts — DELETE / PATCH (toggle alerts)
  - /app/api/alerts/run/route.ts — run alert check: find new matches since last run, send emails
  - /lib/email/alert-email.tsx — React Email template for alert notification
  - netlify.toml (updated: add alerts cron at 08:00 ET daily, after ingestion completes)

STEPS:
1. Build "Save Search" button on FilterPanel and ContractList page
2. SaveSearchModal: enter a name, preview current filters, choose alert on/off
3. Store in saved_searches table: name, filters_json (all active filter params), alert_enabled, last_checked_at
4. Saved Searches page: list all saved searches, last run time, match count, edit/delete
5. Build /api/alerts/run:
   - For each saved_search with alert_enabled=true:
     - Query opportunities matching filters WHERE created_at > last_checked_at
     - If new matches found: send email via Resend (resend.com — free tier 3k/mo)
     - Update last_checked_at
     - Insert rows into alerts table (opportunity_id, saved_search_id, sent_at)
6. Build React Email template:
   - Subject: "[PGH Contracts] X new matches for '{search name}'"
   - Body: list of new contracts (title, agency, value, deadline, link to detail page)
   - Unsubscribe/manage link
7. Set up Resend API key in .env (RESEND_API_KEY), send from jon@[domain]

CONSTRAINTS:
- Email provider: Resend (resend.com) — not SendGrid/Mailchimp
- Email template must be production-quality (not plain text)
- Alert run must be idempotent — running twice must not send duplicate emails
- Filters stored as JSON must be exactly re-applicable to produce same query
- Run order in netlify.toml: federal ingest (06:00) → state/local ingest (07:00) → alerts (08:00)

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_007
