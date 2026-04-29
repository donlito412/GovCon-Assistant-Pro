TASK ID: 005

STATUS: PENDING

GOAL:
Build the Pipeline / Opportunity Tracking Board — a Kanban-style board where Jon can drag opportunities through stages from discovery to award. This is the core workflow tool for managing bids.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /03_OUTPUTS/TASK_001_scaffold/lib/types.ts
- /03_OUTPUTS/TASK_004_discovery_ui/components/contracts/ContractCard.tsx

OUTPUT:
/03_OUTPUTS/TASK_005_pipeline/
  - /app/(dashboard)/pipeline/page.tsx — pipeline board page
  - /components/pipeline/PipelineBoard.tsx — full Kanban board
  - /components/pipeline/PipelineColumn.tsx — individual stage column
  - /components/pipeline/PipelineCard.tsx — opportunity card on board
  - /components/pipeline/PipelineCardDetail.tsx — slide-out detail panel
  - /components/pipeline/AddNoteForm.tsx — add note to opportunity
  - /components/pipeline/StageSelector.tsx — move to stage dropdown
  - /lib/api/pipeline.ts — pipeline CRUD hooks
  - /app/api/pipeline/route.ts — GET all pipeline items
  - /app/api/pipeline/[id]/route.ts — PATCH stage, DELETE item
  - /app/api/pipeline/[id]/notes/route.ts — GET/POST notes

PIPELINE STAGES:
1. Identified — newly added, evaluating fit
2. Qualifying — researching agency, incumbents, competition
3. Pursuing — actively working bid strategy
4. Proposal In Progress — writing the response
5. Submitted — bid submitted, awaiting award
6. Won — contract awarded to us
7. Lost / No Bid — passed or lost

STEPS:
1. Build Kanban board with drag-and-drop (use @hello-pangea/dnd — React 18 compatible DnD)
2. Each column shows: stage name, opportunity count, total $ value in stage
3. PipelineCard shows: title, agency, deadline countdown, value, source badge
4. Click card → slide-out panel (PipelineCardDetail):
   - Full opportunity details
   - Stage selector (move between stages)
   - Notes log (timestamped)
   - Add note form
   - Link to full contract detail page
   - Remove from pipeline button
5. "Add to Pipeline" action from ContractCard/ContractDetail (TASK_004 integration)
6. Pipeline value summary header: total $ tracked, by stage
7. Sort within columns by deadline (soonest first default)

CONSTRAINTS:
- Drag and drop must persist stage change to Supabase immediately on drop
- No lost data on page refresh — all state from database
- Optimistic UI updates (card moves instantly, reverts if DB write fails)
- Notes stored with timestamp in pipeline_items.notes_json (JSONB array)
- All pipeline operations logged
- Deadline countdown shows days remaining, goes red under 7 days

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_006
