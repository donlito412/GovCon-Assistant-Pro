TASK ID: 025

STATUS: PENDING

GOAL:
Make the AI Assistant actually useful by connecting it to live Supabase data, giving it full context about the platform's data, and ensuring it can answer real questions like "what contracts are due this week?" or "find me IT contracts under $350K."

ASSIGNED TO: Claude

CONTEXT:
- App: https://gov-con-assistant-pro.vercel.app/assistant
- ANTHROPIC_API_KEY is set in Vercel env vars (claude-sonnet-4-6)
- AI Assistant route: /govcon-app/app/api/assistant/route.ts
- AI library: /govcon-app/lib/ai/assistant.ts
- Prompts: /govcon-app/lib/ai/prompts.ts
- Supabase project: eejhxfyyooublgbcuyow
- Current data: 221 contracts, 249 grants, 11 events, 0 subcontractors (will grow with prior tasks)
- Owner: Jon Murphree / Murphree Enterprises, Pittsburgh PA

WHAT GOOD LOOKS LIKE:
The assistant should be able to answer:
- "What new contracts were added today?"
- "Show me IT contracts under $350K due in the next 30 days"
- "What grants is my company eligible for?"
- "Find subcontractors with 8(a) certification in construction"
- "Analyze this RFP and tell me if we should bid"
- "What's my pipeline status?"

STEPS:
1. Read /govcon-app/lib/ai/assistant.ts and /govcon-app/lib/ai/prompts.ts
2. Check if assistant currently has Supabase tool access — if not, add it:
   - Tool: search_opportunities(query, filters) — full-text + filter search on opportunities table
   - Tool: search_grants(query) — search grants table
   - Tool: get_pipeline() — fetch user's pipeline_items
   - Tool: get_upcoming_deadlines(days) — opportunities with deadline within N days
   - Tool: search_subcontractors(naics, certifications) — search contacts table
3. Update system prompt in prompts.ts to include:
   - Jon's context: Murphree Enterprises, Pittsburgh PA, small business
   - Data overview: what tables exist, what sources are ingested
   - Today's date (inject dynamically)
   - Instructions to use tools before answering data questions
4. Ensure conversation history is stored/loaded from Supabase (check if conversations table exists)
   - If missing, create migration: conversations(id, title, messages JSONB, context JSONB, created_at, updated_at)
5. Test with 5 real questions, verify answers pull live data
6. Commit and push

INPUTS:
- /govcon-app/lib/ai/assistant.ts
- /govcon-app/lib/ai/prompts.ts
- /govcon-app/app/api/assistant/route.ts
- /govcon-app/app/(dashboard)/assistant/page.tsx

OUTPUT:
- Updated assistant.ts with Supabase tool integrations
- Updated prompts.ts with rich system context
- Conversations table in Supabase (if missing)

ACCEPTANCE CRITERIA:
- Assistant answers "what contracts are due this week?" with real data from DB
- Assistant answers "find me construction grants" with real grants from DB
- Conversation history persists across page reloads
- No hallucinated data — all answers grounded in tool results
