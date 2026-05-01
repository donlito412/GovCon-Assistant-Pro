#!/bin/bash
# ============================================================
# PUSH GovTribe-style redesign to GitHub
# Double-click to run
# ============================================================
cd "$(dirname "$0")"

echo "=== GovCon Assistant Pro — Pushing GovTribe Redesign ==="
echo ""

# Clear stale git lock files
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null && echo "✓ Lock files cleared" || echo "(no lock files)"

# Stage everything
git add -A
echo "✓ All files staged"

echo ""
echo "Changed files:"
git status --short
echo ""

# Commit
git commit -m "GovTribe-style redesign: dark collapsible sidebar, Awards page (1927 USASpending records), updated dashboard with category counts (federal opps, awards, grants)"

echo ""
echo "Pushing to GitHub..."
git push origin main

echo ""
echo "=== DONE — Vercel is deploying ==="
echo "Live app: https://gov-con-assistant-pro.vercel.app"
echo ""
echo "New pages:"
echo "  /           → Updated dashboard with category counts"
echo "  /awards     → Federal Contract Awards (1,927 USASpending records)"
echo "  Sidebar     → Dark GovTribe-style collapsible nav"
echo ""
echo "Press Enter to close."
read
