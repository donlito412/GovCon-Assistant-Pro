#!/bin/bash
cd "$(dirname "$0")"
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null
git add -A
git commit -m "Fix: awards page TypeScript error — use ContractListItem type, remove unused imports"
git push origin main
echo ""
echo "=== DONE — Vercel redeploying ==="
echo "Live app: https://gov-con-assistant-pro.vercel.app"
echo ""
echo "Press Enter to close."
read
