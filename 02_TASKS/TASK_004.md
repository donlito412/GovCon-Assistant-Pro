TASK ID: 004

STATUS: PENDING

GOAL:
Build the core contract discovery UI — the main page of the application. A searchable, filterable, sortable list of all Pittsburgh-area contracts from all sources. This is the heart of the product.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /03_OUTPUTS/TASK_001_scaffold/ (full scaffold)
- /05_ASSETS/govtribe_feature_deconstruction.md

OUTPUT:
/03_OUTPUTS/TASK_004_discovery_ui/
  - /app/(dashboard)/layout.tsx — dashboard shell with sidebar nav
  - /app/(dashboard)/page.tsx — home/dashboard overview
  - /app/(dashboard)/contracts/page.tsx — main contracts list page
  - /app/(dashboard)/contracts/[id]/page.tsx — contract detail page
  - /components/contracts/ContractCard.tsx — card component for list view
  - /components/contracts/ContractTable.tsx — table component for table view
  - /components/contracts/ContractDetail.tsx — full detail component
  - /components/contracts/FilterPanel.tsx — sidebar filter panel
  - /components/contracts/SearchBar.tsx — full-text search component
  - /components/contracts/SortControls.tsx — sort dropdown
  - /components/ui/Badge.tsx — status/source/type badges
  - /components/ui/DeadlineChip.tsx — color-coded deadline display
  - /lib/api/contracts.ts — client-side data fetching hooks (SWR)
  - /app/api/contracts/route.ts — server-side contracts query endpoint

STEPS:
1. Build dashboard layout: sidebar with nav links (Contracts, Pipeline, Saved Searches, Analytics), header with search
2. Build /app/api/contracts/route.ts:
   - Accept query params: q (text search), source, naics, agency, min_value, max_value, deadline_before, deadline_after, set_aside, sort, page
   - Query Supabase with full-text search on title+description, all filters applied
   - Return paginated results + total count
3. Build ContractCard component:
   - Title, agency name, source badge (Federal/State/Local), NAICS code
   - Dollar value (formatted), deadline (color-coded: red < 7 days, yellow < 14 days)
   - Set-aside type badge, short description excerpt
   - "Add to Pipeline" button
4. Build FilterPanel:
   - Source checkboxes (Federal / PA State / Local / Education)
   - Purchase threshold filter (radio buttons):
       All Sizes
       Micro-Purchase (≤ $15,000)
       Simplified Acquisition ($15,001 – $350,000)
       Large Acquisition (> $350,000)
   - Contract type multi-select (RFP / RFQ / RFI / IFB / IDIQ / BPA / Sources Sought)
   - NAICS sector multi-select (broad sectors: IT & Technology / Construction / Professional Services /
     Healthcare / Facilities & Maintenance / Transportation / Research & Development /
     Education & Training / Security / Other)
   - NAICS code multi-select (searchable — specific 6-digit codes)
   - Agency multi-select
   - Dollar value range slider
   - Deadline date range picker
   - Set-aside type checkboxes (SDVOSB, 8(a), HUBZone, WOSB, Small Business, Unrestricted)
5. Build ContractDetail page (/contracts/[id]):
   - Full title, agency, solicitation number
   - All metadata fields in organized layout
   - Full description (expandable)
   - External link to original source
   - "Add to Pipeline" + "Save Search" CTAs
6. Build list/table toggle view
7. Pagination (25 per page)

CONSTRAINTS:
- Server components where possible (Next.js App Router)
- Loading states for all async data
- Empty state when no results match filters
- Mobile responsive (works on phone screen)
- All filter state persisted in URL query params (shareable links)
- No placeholder content — all data rendered from real Supabase queries

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_005
