# PGH Gov Contracts — Deployment Checklist

Complete each item in order. Check off as you go.

---

## Phase 1: Supabase Setup

- [ ] **Create Supabase project**
  - Go to https://supabase.com → New Project
  - Name: `pgh-gov-contracts` (or similar)
  - Region: `us-east-1` (closest to Pittsburgh)
  - Copy: Project URL, anon key, service role key

- [ ] **Apply database migrations**
  - Recommended: Supabase Dashboard → SQL Editor → paste `03_OUTPUTS/TASK_001_scaffold/supabase_schema.sql` → Run
  - Alternative: `psql "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" -f 03_OUTPUTS/TASK_001_scaffold/supabase_schema.sql`

- [ ] **Enable pgsodium (Vault) for API key encryption**
  - Supabase Dashboard → Database → Extensions → enable `pgsodium`
  - Create the vault RPC function (see PRODUCTION_RUNBOOK.md §Vault Setup)

- [ ] **Create the first user in Supabase Auth**
  - Supabase Dashboard → Authentication → Users → Invite User
  - Email: `jon@murphreeenterprises.com`
  - User sets password on first login

- [ ] **Confirm tables exist** (verify in Supabase Table Editor)
  - `opportunities`
  - `agencies`
  - `pipeline_items`
  - `saved_searches`
  - `alerts`
  - `user_settings`

---

## Phase 2: GitHub Repository

- [ ] **Create private GitHub repo**
  - Name: `pgh-gov-contracts`
  - Visibility: Private

- [ ] **Push all code**
  ```bash
  git init
  git add .
  git commit -m "chore: initial commit — all tasks 001-009 complete"
  git remote add origin git@github.com:murphreeenterprises/pgh-gov-contracts.git
  git push -u origin main
  ```

- [ ] **Add GitHub Secrets** (for CI build check)
  - Repo → Settings → Secrets and variables → Actions → New repository secret
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY`
  - `SAMGOV_API_KEY`

- [ ] **Verify CI passes** on first push (`.github/workflows/deploy.yml`)

---

## Phase 3: Netlify Deployment

- [ ] **Create Netlify site**
  - https://app.netlify.com → Add new site → Import from Git → GitHub
  - Select repo: `pgh-gov-contracts`
  - Branch: `main`
  - Build command: `npm run build`
  - Publish directory: `.next`

- [ ] **Add Netlify plugin** (if not auto-detected)
  - Netlify Dashboard → Site → Plugins → Add `@netlify/plugin-nextjs`

- [ ] **Set all environment variables** (Netlify → Site → Environment Variables)

  | Variable | Value |
  |---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | From Supabase project settings |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase project settings |
  | `SUPABASE_SERVICE_ROLE_KEY` | From Supabase project settings |
  | `SAMGOV_API_KEY` | From sam.gov API key portal |
  | `RESEND_API_KEY` | From resend.com dashboard |
  | `INGEST_SECRET` | Generate: `openssl rand -hex 32` |
  | `CRON_SECRET` | Generate: `openssl rand -hex 32` |
  | `ALERT_FROM_EMAIL` | `alerts@govconassistant.pro` (or your domain) |
  | `ALERT_TO_EMAIL` | `jon@murphreeenterprises.com` |
  | `NEXT_PUBLIC_APP_URL` | `https://govconassistant.pro` (or Netlify default URL) |

- [ ] **Trigger first deploy** — click Deploy Site (or push a commit)

- [ ] **Build passes with no errors**

- [ ] **Verify scheduled functions** appear in Netlify → Functions tab
  - `ingest-federal` (0 11 * * *)
  - `ingest-state-local` (0 12 * * *)
  - `run-alerts` (0 13 * * *)

---

## Phase 4: First Data Ingestion

- [ ] **Trigger federal ingestion** (manual first run)
  ```bash
  curl -X POST https://[YOUR-SITE].netlify.app/api/ingest/federal \
    -H "x-ingest-secret: [INGEST_SECRET]"
  ```

- [ ] **Trigger state/local ingestion**
  ```bash
  curl -X POST https://[YOUR-SITE].netlify.app/api/ingest/state-local \
    -H "x-ingest-secret: [INGEST_SECRET]"
  ```

- [ ] **Or use the seed script:**
  ```bash
  SITE_URL=https://[YOUR-SITE].netlify.app \
  INGEST_SECRET=[YOUR_SECRET] \
  npx ts-node scripts/seed_first_run.ts
  ```

- [ ] **Verify data in Supabase** — Table Editor → `opportunities`
  - Expect: **50+ rows** for federal (SAM.gov Pittsburgh/Allegheny filter)
  - Expect: rows with `source = 'federal_sam'`, `source = 'local_allegheny'`, etc.

---

## Phase 5: Functional Verification

- [ ] **Login works**
  - Visit `https://[YOUR-SITE].netlify.app/login`
  - Sign in with `jon@murphreeenterprises.com`
  - Redirected to `/`

- [ ] **Contracts list loads** with real data (`/contracts`)
  - At least 50+ results appear
  - Filter by source, NAICS, value range — results update

- [ ] **Contract detail page loads** (`/contracts/[id]`)
  - Title, agency, description, deadline, value, source badge all visible
  - "Add to Pipeline" button works

- [ ] **Pipeline board loads** (`/pipeline`)
  - Kanban columns visible
  - Drag-and-drop card between stages — persists on refresh
  - Slide-out detail panel opens with notes

- [ ] **Agency directory loads** (`/agencies`)
  - Agencies appear (auto-created from ingested contracts)
  - Click an agency → profile page shows active contracts + NAICS

- [ ] **Analytics dashboard loads** (`/analytics`)
  - KPI cards show real numbers
  - Charts render with data
  - Deadline radar shows upcoming contracts

- [ ] **Saved search creates successfully** (`/saved-searches`)
  - Click "New Saved Search" → name + filters → Save
  - Card appears in list with filter summary

- [ ] **Test alert email received**
  - Create a saved search with alert enabled
  - Manually trigger: `curl https://[SITE]/api/alerts/run -H "x-cron-secret: [CRON_SECRET]"`
  - Check `jon@murphreeenterprises.com` inbox for email

- [ ] **Settings page accessible** (`/settings`)
  - Profile tab: change display name
  - Notifications tab: update alert email
  - API Keys tab: enter SAM.gov API key

- [ ] **Mobile browser check**
  - Open site on iPhone/Android
  - Contracts list scrollable, filters usable, pipeline board scrolls horizontally

---

## Phase 6: Optional — Custom Domain

- [ ] **Add custom domain** in Netlify → Domain Management
  - e.g. `govconassistant.pro`
  - Point DNS to Netlify nameservers
  - Netlify auto-provisions SSL via Let's Encrypt

- [ ] **Update env vars** with new domain
  - `NEXT_PUBLIC_APP_URL` → `https://govconassistant.pro`
  - `ALERT_FROM_EMAIL` → must match verified domain in Resend

- [ ] **Verify Resend domain** in Resend.com dashboard
  - Add DNS TXT + CNAME records for sending domain
  - Status shows "Verified"

---

## Sign-Off

- [ ] All checklist items above are checked
- [ ] Jon has reviewed the site on desktop and mobile
- [ ] Jon has received a test alert email
- [ ] PRODUCTION_RUNBOOK.md has been reviewed

**Deployment complete — PROJECT IS LIVE** 🚀
