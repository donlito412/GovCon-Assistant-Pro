#!/bin/bash
# ============================================================
# PUSH TASKS 19-26 + SCRAPER FIX TO GITHUB
# Double-click this file to run it.
# ============================================================

cd "$(dirname "$0")"

echo "=== GovCon Assistant Pro — Push TASK_019-026 ==="
echo ""

# Clear any stale git lock files
rm -f .git/index.lock .git/HEAD.lock .git/MERGE_HEAD.lock 2>/dev/null
echo "✓ Cleared git lock files"

# Stage all changes
git add -A
echo "✓ Staged all changes"

# Show what's being committed
echo ""
echo "Files to commit:"
git status --short | head -30
echo ""

# Commit
git commit -m "Feat: complete TASK_019-026 — cron ingestion, scraper fixes, subcontractors, agencies, AI assistant, UI polish; fix Allegheny County scraper to only return real procurement bids (purge nav link fallback)"

echo ""
echo "Pushing to GitHub..."
git push origin main

echo ""
echo "=== DONE ==="
echo "Vercel will now auto-deploy. Check: https://vercel.com/dashboard"
echo ""
echo "Press Enter to close."
read
