TASK ID: 022

STATUS: PENDING

GOAL:
Activate the Resend email alert system. The code is built — it just needs the RESEND_API_KEY wired up and tested end-to-end so Jon receives real daily digest emails for new opportunities.

ASSIGNED TO: Claude

CONTEXT:
- App: https://gov-con-assistant-pro.vercel.app
- Resend account email: jon@gomurphree.com
- Alert recipient: jon@gomurphree.com
- Sender: jon@gomurphree.com (gomurphree.com domain — verify in Resend dashboard)
- RESEND_FROM_EMAIL=jon@gomurphree.com (in vercel.env)
- ALERT_FROM_EMAIL=jon@gomurphree.com
- ALERT_TO_EMAIL=jon@gomurphree.com
- RESEND_API_KEY — needs to be added to Vercel environment variables
- Alert run endpoint: POST /api/alerts/run
- Saved searches: /govcon-app/app/api/saved-searches/ 
- Supabase project: eejhxfyyooublgbcuyow

STEPS:
1. Verify RESEND_API_KEY is set in Vercel env vars (check via Vercel dashboard or Netlify MCP)
   - If missing: prompt user to add it — get it from https://resend.com/api-keys
2. Read /govcon-app/app/api/alerts/run/route.ts to understand current implementation
3. Test the alerts endpoint: POST /api/alerts/run with x-ingest-secret header
4. Check Supabase saved_searches table — if empty, create a default "All Pittsburgh Opportunities" saved search with alert_enabled=true
5. Verify email is sent and received at jon@gomurphree.com
6. If email template needs improvement (plain text vs HTML), update the Resend template
7. Wire the alerts/run call into the daily cron (TASK_019) so it fires after ingestion

IMPORTANT — Resend sender domain:
- Resend free tier allows sending from the verified email only
- If jon@gomurphree.com isn't verified as a sender in Resend, emails will bounce
- Check if a custom domain is set up; if not, use Resend's onboarding@resend.dev as sender for testing

INPUTS:
- /govcon-app/app/api/alerts/run/route.ts
- /govcon-app/app/api/saved-searches/route.ts
- Supabase saved_searches table

OUTPUT:
- Working email alerts sending to jon@gomurphree.com
- Default saved search in DB if none exists
- alerts/run wired into cron

ACCEPTANCE CRITERIA:
- POST /api/alerts/run returns 200 with email send confirmation
- Email arrives at jon@gomurphree.com showing new opportunities
- No RESEND errors in Vercel function logs
