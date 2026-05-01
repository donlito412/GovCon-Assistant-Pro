#!/bin/bash
cd "$(dirname "$0")"
rm -f .git/index.lock .git/HEAD.lock
git add govcon-app/app/api/assistant/route.ts \
        govcon-app/lib/ai/assistant.ts \
        vercel.env \
        02_TASKS/TASK_019.md 02_TASKS/TASK_020.md 02_TASKS/TASK_021.md \
        02_TASKS/TASK_022.md 02_TASKS/TASK_023.md 02_TASKS/TASK_024.md \
        02_TASKS/TASK_025.md 02_TASKS/TASK_026.md
git commit -m "Fix: remove auth gate from assistant, update model to claude-sonnet-4-6, add TASK_019-026, update email to jon@gomurphree.com"
git push origin main
echo ""
echo "Done! Press any key to close."
read -n 1
