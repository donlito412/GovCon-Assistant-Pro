# PGH Gov Contracts — Production Runbook

> **Audience:** Jon Murphree, site owner and sole operator  
> **Purpose:** Day-to-day maintenance, troubleshooting, and update procedures

---

## System Overview

| Component | Service | URL |
|---|---|---|
| Frontend + API | Netlify | https://govconassistant.pro |
| Database | Supabase | https://app.supabase.com |
| Email | Resend | https://resend.com/emails |
| Code | GitHub | github.com/murphreeenterprises/pgh-gov-contracts |
| Monitoring | Netlify Logs | Netlify → Site → Functions |

### Daily Cron Schedule (all UTC)
| Time UTC | ET (EST) | Job |
|---|---|---|
| 06:30 | 01:30 AM | Forecasts (SAM.gov) |
| 07:30 | 02:30 AM | Grants |
| 08:00 | 03:00 AM | Events |
| 11:00 | 06:00 AM | **Federal contracts (SAM.gov)** |
| 12:00 | 07:00 AM | **State + local contracts** |
| 13:00 | 08:00 AM | **Alert emails** |

---

## Routine Maintenance

### Checking if ingestion ran today
1. Go to Netlify → Site → **Functions** tab
2. Look for `ingest-federal` and `ingest-state-local` in the function list
3. Click → **Function log** → check today's execution and exit code
4. Or check Supabase → Table Editor → `opportunities` → sort by `created_at DESC`

### Manually re-running ingestion
If a cron job failed or you want fresh data immediately:
```bash
# Federal
curl -X POST https://govconassistant.pro/api/ingest/federal \
  -H "x-ingest-secret: [INGEST_SECRET]"

# State + Local
curl -X POST https://govconassistant.pro/api/ingest/state-local \
  -H "x-ingest-secret: [INGEST_SECRET]"

# Run alert emails immediately
curl https://govconassistant.pro/api/alerts/run \
  -H "x-cron-secret: [CRON_SECRET]"
```
> Find `INGEST_SECRET` and `CRON_SECRET` in Netlify → Site → Environment Variables

### Checking alert email delivery
1. Go to https://resend.com/emails
2. Filter by `from: alerts@govconassistant.pro`
3. Check delivery status — should show "Delivered" within minutes of alert run

---

## Troubleshooting

### "No contracts appearing in list"
1. Check if ingestion ran: Netlify → Functions → `ingest-federal` log
2. Verify `SAMGOV_API_KEY` is set: Netlify → Environment Variables
3. Check Supabase → `opportunities` table for recent `created_at` rows
4. Manually trigger ingestion (see above)
5. Verify SAM.gov API key is still valid at https://sam.gov

### "Login isn't working"
1. Check Supabase → Authentication → Users — confirm user exists
2. Try password reset: Supabase Dashboard → Auth → Users → select user → Send Recovery Email
3. Check Supabase Auth settings → Email confirmations are disabled for single-user app

### "Alert email not received"
1. Check Resend dashboard for delivery errors
2. Verify `ALERT_TO_EMAIL` env var is correct
3. Check spam/junk folder
4. Manually trigger alerts endpoint (see above) and watch Netlify function log
5. Confirm at least one saved search exists with `alert_enabled = true`

### "Pipeline drag-and-drop not saving"
1. Open browser DevTools → Network tab → look for failed PATCH to `/api/pipeline/[id]`
2. Check Supabase → `pipeline_items` table for the record
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly in Netlify

### "Analytics charts show no data"
1. Confirm ingestion has run and `opportunities` table has rows
2. Check browser DevTools → `/api/analytics` response for errors
3. `pipeline_by_stage` will be empty until you add items to the pipeline — this is expected

### "Build failing on Netlify"
1. Netlify → Site → Deploys → click failed deploy → View deploy log
2. Look for TypeScript errors or missing env vars
3. Common fix: ensure all env vars are set in Netlify dashboard
4. Run locally: `npm run build` to reproduce the error

---

## Code Updates

### Deploying a change
1. Edit code locally
2. `git add . && git commit -m "fix: description of change"`
3. `git push origin main`
4. Netlify auto-deploys within 2-3 minutes
5. Watch build progress in Netlify → Deploys

### Adding a new data source scraper
1. Create scraper in `/lib/ingestion/scrapers/[source-name].ts`
2. Add to `/app/api/ingest/state-local/route.ts` sources array
3. Add cron entry in `netlify.toml` if running on a separate schedule
4. Deploy and test by triggering manually

### Updating environment variables
1. Netlify → Site → Environment Variables → Edit
2. After saving, trigger a new deploy (Netlify → Deploys → Trigger deploy)

---

## Database Management

### Viewing and querying data
- Supabase Dashboard → Table Editor (visual)
- Supabase Dashboard → SQL Editor (raw SQL queries)

### Useful SQL queries
```sql
-- How many active contracts by source?
SELECT source, COUNT(*) FROM opportunities WHERE status = 'active' GROUP BY source ORDER BY count DESC;

-- Contracts added in last 24 hours
SELECT title, source, agency_name, created_at FROM opportunities WHERE created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC;

-- Pipeline summary
SELECT stage, COUNT(*), SUM(o.value_max) / 100 as total_dollars
FROM pipeline_items pi
JOIN opportunities o ON o.id = pi.opportunity_id
GROUP BY stage ORDER BY stage;

-- Alert-enabled saved searches
SELECT name, last_checked_at, filters_json FROM saved_searches WHERE alert_enabled = true;

-- Recent alert sends
SELECT ss.name, a.sent_at, o.title FROM alerts a
JOIN saved_searches ss ON ss.id = a.saved_search_id
JOIN opportunities o ON o.id = a.opportunity_id
ORDER BY a.sent_at DESC LIMIT 20;
```

### Backing up the database
Supabase provides daily automated backups on the Pro plan.
For manual backup: Supabase → Project Settings → Database → Download backup

### Resetting a stuck pipeline item
```sql
-- Move a stuck item back to Identified
UPDATE pipeline_items SET stage = 'Identified' WHERE id = [ITEM_ID];
```

---

## Vault Setup (SAM.gov API Key Encryption)

Run this in Supabase SQL Editor after enabling the `pgsodium` extension:

```sql
-- Create vault secret store function
CREATE OR REPLACE FUNCTION vault_store_sam_api_key(p_user_id UUID, p_api_key TEXT)
RETURNS VOID AS $$
DECLARE
  v_secret_name TEXT := 'sam_api_key_' || p_user_id::TEXT;
BEGIN
  -- Delete existing if present
  DELETE FROM vault.secrets WHERE name = v_secret_name;
  -- Insert new encrypted secret
  INSERT INTO vault.secrets (name, secret, description)
  VALUES (v_secret_name, p_api_key, 'SAM.gov API key for user ' || p_user_id::TEXT);
  -- Update hint in user_settings
  UPDATE user_settings
  SET has_sam_api_key = TRUE,
      sam_api_key_hint = repeat('*', length(p_api_key) - 4) || right(p_api_key, 4)
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to retrieve key (server-side only)
CREATE OR REPLACE FUNCTION vault_get_sam_api_key(p_user_id UUID)
RETURNS TEXT AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'sam_api_key_' || p_user_id::TEXT
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Cost Overview (Estimated Monthly)

| Service | Plan | Est. Cost |
|---|---|---|
| Supabase | Free tier (up to 500MB DB) | $0 |
| Supabase | Pro (if > 500MB or backups needed) | $25/mo |
| Netlify | Starter (free, 100GB bandwidth) | $0 |
| Netlify | Pro (if > 100GB or team features) | $19/mo |
| Resend | Free (100 emails/day) | $0 |
| GitHub | Free private repos | $0 |
| **Total** | | **$0–$44/mo** |

---

## Emergency Contacts / Resources

- **Supabase docs:** https://supabase.com/docs
- **Netlify docs:** https://docs.netlify.com
- **Resend docs:** https://resend.com/docs
- **SAM.gov API:** https://open.gsa.gov/api/sam-entity-extracts-api/
- **USASpending API:** https://api.usaspending.gov/docs/

---

*Last updated: April 2026 — Built by Claude (Anthropic) for Murphree Enterprises*
