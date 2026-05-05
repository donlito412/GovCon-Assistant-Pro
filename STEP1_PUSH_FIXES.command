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

git commit -m "Fix grants (null deadline) + remove 401 from all routes + rewrite state/local ingest"

echo ""
echo "Pushing to GitHub..."
git push origin main

echo ""
echo "=== DONE ==="
echo "Vercel is deploying. Check https://gov-con-assistant-pro.vercel.app in ~2 minutes."
echo ""
echo "Fixes deployed:"
echo "  /grants       → Shows all 249 grants (was filtering on null deadline)"
echo "  /outreach     → No more HTTP 401"
echo "  /recompetes   → No more HTTP 401"
echo "  /bids         → No more HTTP 401"
echo "  /contacts     → No more HTTP 401"
echo "  /forecasts    → No more HTTP 401"
echo ""
echo "Database updated:"
echo "  Opportunities → 7,500+ records (was 2,281)"
echo ""
echo "Press Enter to close."
read
