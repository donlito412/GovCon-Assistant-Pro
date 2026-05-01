TASK ID: 026

STATUS: PENDING

GOAL:
Polish the UI/UX across the full app — fix empty states, loading skeletons, mobile responsiveness, and any broken pages. Make the app feel production-ready, not like a scaffold.

ASSIGNED TO: Claude

CONTEXT:
- App: https://gov-con-assistant-pro.vercel.app
- Supabase project: eejhxfyyooublgbcuyow
- All pages exist but some may show empty states, broken layouts, or missing data connections
- Known issues from navigation:
    /subcontractors — no data yet (TASK_023 seeds it)
    /analytics — may have empty charts
    /recompetes — likely empty
    /forecasts — likely empty
    /community — likely empty
    /bids — likely empty
    /outreach — likely empty

AUDIT ALL PAGES:
For each route, check:
1. Does it load without JS errors?
2. Does the empty state look intentional (not broken)?
3. Are loading states shown while data fetches?
4. Does it work on mobile (375px viewport)?
5. Are there any hardcoded placeholder values that should be real data?

PAGES TO AUDIT AND FIX:
- / (dashboard) — ✅ working
- /contracts — ✅ working  
- /contracts/[id] — verify detail page renders all fields
- /pipeline — verify kanban works with real data
- /grants — verify grants load from grants table
- /grants/[id] — verify detail page
- /events — verify events load
- /analytics — wire up real aggregate queries
- /agencies — seed needed (TASK_024)
- /agencies/[id] — verify works once seeded
- /subcontractors — seed needed (TASK_023)
- /saved-searches — verify save/load works
- /assistant — ✅ working nav link
- /bids — verify empty state and create flow
- /outreach — verify empty state
- /community — verify empty state
- /recompetes — verify empty state
- /forecasts — verify empty state
- /settings — verify settings save

SPECIFIC FIXES:
1. Add skeleton loading components to all server-component pages
2. Fix any broken Supabase queries (wrong column names, missing joins)
3. Add "No data yet" empty states with helpful call-to-action text
4. Ensure all pages are mobile-responsive (sidebar collapses, tables scroll horizontally)
5. Fix any TypeScript errors visible in Vercel build logs
6. Remove /subcontractors from NAV_ITEMS (it's there but page has no data — move to after TASK_023)

INPUTS:
- All files in /govcon-app/app/(dashboard)/*/page.tsx

OUTPUT:
- Updated page files with loading states, empty states, real data connections
- No visible JS errors across any page

ACCEPTANCE CRITERIA:
- Every page loads without a white screen or JS error
- Every empty page has a meaningful empty state (not just blank)
- Mobile layout works on 375px viewport
- Vercel build has 0 TypeScript errors
