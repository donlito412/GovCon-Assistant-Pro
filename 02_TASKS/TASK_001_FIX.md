TASK ID: 001_FIX

STATUS: TODO

GOAL:
Fix the Netlify deployment failure caused by govcon-app being tracked as a git submodule in the parent repo. Remove the embedded .git directory, recommit govcon-app as regular files, push to GitHub, then trigger a Netlify deploy.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- Root repo: /Volumes/Lito's Hard Drive/Murphree Enterprises/PGH-Gov-Contracts/
- App folder: /Volumes/Lito's Hard Drive/Murphree Enterprises/PGH-Gov-Contracts/govcon-app/

ROOT CAUSE:
govcon-app/ has its own .git directory, which causes Git to treat it as a submodule (mode 160000) in the parent repo. There is no .gitmodules file with a URL, so Netlify cannot check it out during build — deploy fails with "Unable to access repository."

OUTPUT:
- govcon-app/ tracked as normal directory (not submodule) in parent repo
- Changes committed and pushed to GitHub (origin: donlito412/GovCon-Assistant-Pro)
- Netlify deploy triggered and successful

STEPS:
1. Remove the embedded .git directory from govcon-app:
   cd "/Volumes/Lito's Hard Drive/Murphree Enterprises/PGH-Gov-Contracts/govcon-app"
   rm -rf .git

2. Stage govcon-app as regular files in the parent repo:
   cd "/Volumes/Lito's Hard Drive/Murphree Enterprises/PGH-Gov-Contracts"
   git rm --cached govcon-app 2>/dev/null || true
   git add govcon-app/

3. Commit and push:
   git commit -m "Fix: embed govcon-app files directly (remove submodule)"
   git push origin main

4. Trigger Netlify deploy:
   - Go to https://app.netlify.com
   - Open project: govcon-assistant-pro
   - Go to Deploys tab
   - Click "Trigger deploy" → "Deploy site"

5. Monitor deploy log — confirm build succeeds and site is live

CONSTRAINTS:
- Do NOT use git submodule add — govcon-app must be committed as plain files
- Do NOT delete any source files inside govcon-app/
- Only remove the .git directory inside govcon-app/
- Push to main branch only
- Verify deploy log shows no errors before marking this task DONE
