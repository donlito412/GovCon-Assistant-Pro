#!/bin/bash
# ============================================================
# STEP 1 — Push grants fix + auth fixes to GitHub → Vercel
# Run this FIRST, then run STEP2_INGEST_STATE_LOCAL.command
# ============================================================
cd "$(dirname "$0")"

echo "=== STEP 1: Pushing grants fix + auth fixes ==="
echo ""

rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

git add -A
git status --short
echo ""

git commit -m "Fix grants page (null deadline filter removed) + remove auth guards from outreach/recompetes/bids/contacts/forecasts routes"

echo ""
echo "Pushing to GitHub → Vercel..."
git push origin main

echo ""
echo "=== STEP 1 DONE ==="
echo "Vercel is deploying. Visit https://gov-con-assistant-pro.vercel.app in ~2 minutes."
echo ""
echo "While waiting, run STEP2_INGEST_STATE_LOCAL.command to pull state/local data."
echo ""
echo "Press Enter to close."
read
