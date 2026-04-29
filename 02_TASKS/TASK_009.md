TASK ID: 009

STATUS: PENDING

GOAL:
Build authentication and user settings. Lock the app behind Supabase Auth (email/password) so only Jon can access it. Add a settings page for profile, notification preferences, and API key management.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /03_OUTPUTS/TASK_001_scaffold/lib/supabase.ts
- /03_OUTPUTS/TASK_001_scaffold/ (full scaffold)

OUTPUT:
/03_OUTPUTS/TASK_009_auth/
  - /app/(auth)/login/page.tsx — login page
  - /app/(auth)/layout.tsx — auth layout (centered card, no sidebar)
  - /middleware.ts — Next.js middleware to protect all dashboard routes
  - /lib/auth/session.ts — session helpers (getSession, requireAuth)
  - /app/(dashboard)/settings/page.tsx — settings page
  - /components/settings/ProfileForm.tsx — update name/email
  - /components/settings/NotificationPreferences.tsx — alert email, frequency
  - /components/settings/ApiKeysPanel.tsx — view/update SAM.gov API key (stored encrypted)
  - /components/settings/DataRefreshStatus.tsx — last ingestion run times + status
  - /app/api/settings/route.ts — GET/PATCH user settings

STEPS:
1. Set up Supabase Auth with email/password
2. Build login page: email + password form, error handling, redirect to /contracts on success
3. Build Next.js middleware: protect all routes under /(dashboard)/, redirect unauthenticated users to /login
4. Settings page sections:
   a. Profile: display name, email (read-only), change password
   b. Notification Preferences: alert email address, alert frequency (immediate/daily digest)
   c. API Keys: SAM.gov API key input (masked display, encrypted in DB via Supabase Vault)
   d. Data Refresh Status: table showing last_run_at and records_upserted for each ingestion source
5. Store user settings in a user_settings table in Supabase
6. Encrypt SAM.gov API key using Supabase Vault (not plaintext)

CONSTRAINTS:
- No OAuth/social login needed — email/password only for personal use
- All dashboard routes must return 401/redirect if not authenticated — no exceptions
- Session cookie managed by @supabase/auth-helpers-nextjs
- SAM.gov API key never exposed in client-side code or API responses — server-side only
- Password change flow sends confirmation email via Supabase Auth

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_010
