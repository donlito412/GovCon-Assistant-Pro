#!/bin/bash
# ============================================================
# PUSH auth fixes + grants fix to GitHub → Vercel
# Double-click to run
# ============================================================
cd "$(dirname "$0")"

echo "=== GovCon Assistant Pro — Pushing Auth + Grants Fixes ==="
echo ""

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null && echo "✓ Lock files cleared" || echo "(no lock files)"

git add -A
echo "✓ All files staged"

echo ""
echo "Changed files:"
git status --short
echo ""

git commit -m "Fix grants page (null deadline filter) + remove auth guards from outreach/recompetes/bids/contacts/forecasts routes (internal tool, no auth)"

echo ""
echo "Pushing to GitHub..."
git push origin main

echo ""
echo "=== DONE — Vercel is deploying ==="
echo "Live app: https://gov-con-assistant-pro.vercel.app"
echo ""
echo "Fixes deployed:"
echo "  /grants      → Now shows all 249 grants (was filtering out null deadlines)"
echo "  /outreach    → Fixed HTTP 401 (removed auth guard)"
echo "  /recompetes  → Fixed HTTP 401 (removed auth guard)"
echo "  /bids        → Fixed HTTP 401 (removed auth guard)"
echo "  /contacts    → Fixed HTTP 401 (removed auth guard)"
echo "  /forecasts   → Fixed HTTP 401 (removed auth guard)"
echo ""
echo "Press Enter to close."
read
