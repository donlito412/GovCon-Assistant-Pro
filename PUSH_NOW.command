#!/bin/bash
# ============================================================
# PUSH ALL FIXES TO GITHUB — double-click to run
# ============================================================
cd "$(dirname "$0")"

echo "=== GovCon Assistant Pro — Pushing all fixes ==="
echo ""

# Clear any stale git lock files
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null && echo "✓ Lock files cleared" || echo "(no lock files to clear)"

# Stage everything
git add -A
echo "✓ All files staged"

# Show summary of what's being committed
echo ""
echo "Changed files:"
git status --short | head -20
echo ""

# Commit
git commit -m "Fix: full nav with Grants/Events/Bids/Outreach/Forecasts/Recompetes; fix SAM.gov Pittsburgh filter bug (no-POP opps were being dropped); remove NAICS param from SAM.gov API call (was returning 0); expand lookback to 180 days; seed 32 agencies"

echo ""
echo "Pushing to GitHub..."
git push origin main

echo ""
echo "=== DONE — Vercel is now deploying ==="
echo "Check: https://vercel.com/dashboard"
echo "Live app: https://gov-con-assistant-pro.vercel.app"
echo ""
echo "After deploy, trigger a fresh ingest at:"
echo "POST https://gov-con-assistant-pro.vercel.app/api/cron/ingest"
echo ""
echo "Press Enter to close."
read
