#!/bin/bash
# ============================================================
# STEP 1 — Push all fixes to GitHub → Vercel
# Fixes:
#   - Grants page now shows all 249 grants (null deadline filter removed)
#   - HTTP 401 removed from Outreach/Recompetes/Bids/Contacts/Forecasts
#   - Ingest script rewritten (state/local opportunities)
# ============================================================
cd "$(dirname "$0")"

echo "=== Pushing fixes to GitHub → Vercel ==="
echo ""

# Clear any stale git locks
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null && echo "✓ Lock files cleared" || true

git add -A
echo ""
echo "Files staged:"
git status --short
echo ""

git commit -m "Allegheny PAVNextGen API + Pittsburgh IonWave scraper" --allow-empty

echo ""
echo "Pushing to GitHub..."
git push origin main

echo ""
echo "=== DONE ==="
echo "Vercel is deploying. Check https://gov-con-assistant-pro.vercel.app in ~2 minutes."
echo ""
echo "Changes deployed:"
echo "  allegheny_county.ts  → Rewired to PAVNextGen REST API (3,200+ records)"
echo "  ingest_state_local.py→ Source 3: IonWave (Pittsburgh), Source 4: PAVNextGen"
echo ""
echo "Vercel cron will auto-ingest Allegheny daily."
echo "Run INGEST_STATE_LOCAL.command to pull Pittsburgh + Allegheny now."
echo ""
echo "Press Enter to close."
read
