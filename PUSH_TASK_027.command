#!/bin/bash
# TASK_027 Phase 0/1 push script — kills dead scrapers + adds working crons.
# Double-click this file in Finder to push to GitHub.

cd "$(dirname "$0")" || exit 1

echo "===== TASK_027: pushing to origin/main ====="
echo ""
echo "Latest commit:"
git log --oneline -1
echo ""

git push origin main
status=$?

echo ""
if [ $status -eq 0 ]; then
  echo "✅ Push succeeded. Vercel should now redeploy automatically."
  echo "   Check: https://vercel.com/dashboard"
else
  echo "❌ Push failed (exit $status)."
  echo "   If asked for credentials, re-authenticate with: gh auth login"
fi

echo ""
echo "Press any key to close…"
read -n 1
