#!/bin/bash
# Trigger a Vercel rebuild by pushing an empty commit.
# The Git integration was just reconnected; the webhook missed my earlier
# commits (2f930c4, 8c3365d), so we need a fresh push to wake it up.

cd "$(dirname "$0")" || exit 1

echo "===== Triggering Vercel rebuild ====="
echo ""
echo "Current local HEAD:"
git log --oneline -1
echo ""

git commit --allow-empty -m "chore: trigger Vercel rebuild after webhook reconnection" 2>&1
status=$?

if [ $status -eq 0 ]; then
  echo ""
  echo "Pushing empty commit + the missed TASK_027 commits..."
  git push origin main
  push_status=$?
  echo ""
  if [ $push_status -eq 0 ]; then
    echo "✅ Pushed. Vercel should now build commit:"
    git log --oneline -1
    echo ""
    echo "   Watch the deploy: https://vercel.com/donlito412-s-projects2/gov-con-assistant-pro/deployments"
    echo "   Build typically takes 1–3 minutes."
  else
    echo "❌ Push failed (exit $push_status)."
  fi
else
  echo "❌ Empty commit failed (exit $status)."
fi

echo ""
echo "Press any key to close…"
read -n 1
