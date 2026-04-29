TASK ID: 010

STATUS: PENDING

GOAL:
Final production deployment. Set up GitHub repo, connect to Netlify with environment variables, configure Supabase production project, run all migrations, trigger first data ingestion, and verify the live site is fully operational.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- All outputs from TASK_001 through TASK_009
- Jon's credentials: Supabase project URL + anon key, SAM.gov API key, Resend API key
- GitHub repo name (to be confirmed by Jon)
- Netlify site name (to be confirmed by Jon)

OUTPUT:
/03_OUTPUTS/TASK_010_deployment/
  - .github/workflows/deploy.yml — GitHub Actions CI (lint + type-check on PR)
  - netlify.toml (final — all cron jobs configured)
  - /scripts/run_migrations.ts — apply supabase_schema.sql to production DB
  - /scripts/seed_first_run.ts — trigger first ingestion of all sources
  - DEPLOYMENT_CHECKLIST.md — step-by-step deployment verification checklist
  - PRODUCTION_RUNBOOK.md — how to maintain, debug, and update the system

DEPLOYMENT STEPS:
1. Create GitHub repo (pgh-gov-contracts), push all code
2. Create Supabase production project, run migrations (supabase_schema.sql)
3. Set up Netlify site connected to GitHub repo:
   - Framework: Next.js
   - Build command: next build
   - Publish dir: .next
4. Add all environment variables in Netlify dashboard:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - SAMGOV_API_KEY
   - RESEND_API_KEY
   - INGEST_SECRET (random secure string)
5. Deploy to Netlify → verify build passes
6. Run database migrations against production Supabase
7. Trigger first ingestion manually: POST /api/ingest/federal, then /api/ingest/state-local
8. Verify data in Supabase dashboard (expect 50+ federal records for Pittsburgh)
9. Confirm login works, contracts list loads, pipeline works, alerts configured
10. Set up custom domain (optional — document in checklist)

DEPLOYMENT CHECKLIST (included in DEPLOYMENT_CHECKLIST.md):
[ ] GitHub repo created and code pushed
[ ] Supabase project created
[ ] All DB migrations applied
[ ] Netlify site created and deployed
[ ] All env vars set in Netlify
[ ] Build passes with no errors
[ ] Login works
[ ] Federal contracts appear in list (50+ results)
[ ] State contracts appear in list
[ ] Local contracts appear in list
[ ] Contract detail page loads
[ ] Pipeline board loads and drag-and-drop works
[ ] Saved search creates successfully
[ ] Test alert email received
[ ] Analytics dashboard loads with real data
[ ] Cron jobs scheduled (verify in Netlify Functions tab)
[ ] Site accessible from mobile browser

CONSTRAINTS:
- No hardcoded credentials anywhere in code
- All secrets in Netlify environment variables only
- GitHub repo can be private — no secrets in repo
- First ingestion run must produce real data (verify before marking complete)
- PRODUCTION_RUNBOOK.md must be complete enough for Jon to maintain independently

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- PROJECT IS LIVE
