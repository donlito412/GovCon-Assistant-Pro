TASK ID: 017

STATUS: PENDING

GOAL:
Build the AI Assistant — a Claude-powered expert that knows every contract, grant, agency, and vendor in Jon's database and can answer questions, analyze RFPs, identify incumbents, suggest bid strategy, find competitors, and help write proposals. This makes the platform an active expert advisor, not just a data viewer.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /03_OUTPUTS/TASK_001_scaffold/ (full scaffold + types)
- /03_OUTPUTS/TASK_004_discovery_ui/ (contracts data)
- /03_OUTPUTS/TASK_007_agency_profiles/ (agency + award data)
- /03_OUTPUTS/TASK_014_subcontractors/ (subcontractor data)

OUTPUT:
/03_OUTPUTS/TASK_017_ai_assistant/
  - /app/(dashboard)/assistant/page.tsx — AI assistant chat page
  - /components/assistant/ChatWindow.tsx — message thread UI
  - /components/assistant/ChatInput.tsx — message input with file upload
  - /components/assistant/MessageBubble.tsx — user + assistant message rendering (supports markdown)
  - /components/assistant/ContextPanel.tsx — shows what data the AI is referencing
  - /components/assistant/QuickPrompts.tsx — suggested starter prompts
  - /components/assistant/ContractContextCard.tsx — inline contract card shown in AI responses
  - /lib/ai/assistant.ts — AI chat logic + context builder
  - /lib/ai/tools.ts — AI tool definitions (database query functions)
  - /lib/ai/prompts.ts — system prompt + context injection
  - /app/api/assistant/route.ts — streaming chat API endpoint (calls Anthropic API)
  - /app/api/assistant/analyze-document/route.ts — PDF/document analysis endpoint

---

## WHAT THE AI CAN DO

### CONTRACT INTELLIGENCE
- "Find me IT contracts under $350K with a deadline in the next 30 days"
- "Which federal agencies are spending the most on construction in Pittsburgh right now?"
- "Show me all contracts related to workforce development"
- "What's the NAICS code I should be targeting for facilities management?"

### INCUMBENT & RECOMPETE ANALYSIS
- "Who currently holds this contract?" → looks up award history from USASpending + FPDS
- "When does this contract expire and when will it likely be re-bid?"
- "Is [Agency X] known for keeping incumbents or switching vendors?"
- "What contracts are expiring in the next 6 months that I should be watching?"

### COMPETITOR INTELLIGENCE
- "Who are the top 5 companies winning IT contracts from the City of Pittsburgh?"
- "What companies are competing against me in the $50K–$350K range?"
- "Has [Company Name] ever won a contract from [Agency]?"
- "What set-aside type wins most often with [Agency]?"

### BID STRATEGY
- "I'm bidding on [contract]. Who are the likely competitors?"
- "What price range would be competitive for this type of contract with this agency?"
- "Should I pursue this as a small business set-aside or full and open?"
- "What's the win rate for small businesses on this type of contract?"

### RFP & DOCUMENT ANALYSIS
- Upload a PDF (RFP, SOW, amendment) → AI reads it and answers:
  - "What are the key requirements?"
  - "What are the evaluation criteria and their weights?"
  - "What are the key dates and deliverables?"
  - "What certifications or qualifications are required?"
  - "What are the biggest risks or gotchas in this solicitation?"
  - "Draft an executive summary / capability statement for this RFP"

### SUBCONTRACTOR RECOMMENDATIONS
- "I'm bidding on this NAICS 541512 contract — who are the best Pittsburgh-area subs to team with?"
- "Find me an 8(a) certified IT sub in Pittsburgh for this contract"
- "Which subs in my directory have worked with [Agency] before?"

### GRANT DISCOVERY
- "What grants am I eligible for as a small business in Pittsburgh?"
- "Find me grants related to technology with deadlines in the next 60 days"
- "What's the best URA program for a small service business?"

### GENERAL EXPERT QUESTIONS
- "How do I register as an 8(a) small business?"
- "What's the difference between an RFP and an RFQ?"
- "How does the competitive bidding process work for federal contracts?"
- "What is a teaming agreement and when do I need one?"

---

## TECHNICAL IMPLEMENTATION

### API ENDPOINT (/api/assistant)
- Uses Anthropic Claude API (claude-sonnet-4-6 model)
- Streaming response (text/event-stream) for real-time typing effect
- System prompt: expert government contracting advisor with full context about Jon's business, his pipeline, and Pittsburgh-area market
- Tool use: AI has access to database query tools to look up real data

### AI TOOLS (function calling)
The AI has these tools available to pull live data from Supabase:

search_contracts({ query, filters }) → returns matching opportunities
get_contract_detail({ id }) → full contract record
get_agency_profile({ agency_name }) → agency spending history + active contracts
search_award_history({ agency, naics, date_range }) → past awards from USASpending
search_subcontractors({ naics_codes, certifications, location }) → matching subs
get_pipeline_status() → Jon's current pipeline
search_grants({ eligibility, keywords, deadline_before }) → matching grants
get_incumbent({ solicitation_number }) → current contract holder from FPDS
get_expiring_contracts({ days_ahead, naics, agency }) → contracts expiring soon

### DOCUMENT ANALYSIS (/api/assistant/analyze-document)
- Accept PDF upload (multipart/form-data)
- Extract text from PDF using pdf-parse library
- Pass extracted text to Claude with analysis prompt
- Return structured analysis: requirements, criteria, dates, risks, recommendations

### SYSTEM PROMPT CONTEXT
The system prompt includes:
- Jon's business name (Murphree Enterprises) and focus area (Pittsburgh-area government contracting)
- Current pipeline summary (active opportunities being pursued)
- Jon's registered NAICS codes and certifications
- Current date (for deadline calculations)
- Instructions to always cite specific contracts/agencies/data when making recommendations
- Instructions to be direct, specific, and actionable — not generic advice

### QUICK PROMPTS (shown on fresh chat)
- "Find me opportunities I should bid on this week"
- "Who's winning contracts in my space?"
- "Analyze an RFP document" (triggers file upload)
- "What contracts are expiring soon?"
- "Find subcontractors for my current pipeline"
- "What grants am I eligible for?"

### CHAT PERSISTENCE
- Store conversation history in assistant_conversations table (Supabase)
- Multiple named conversations (like ChatGPT thread history)
- Each conversation has context: linked opportunity, linked pipeline item (optional)
- "Ask about this contract" button on contract detail pages → opens assistant pre-loaded with that contract's context

---

## DATABASE SCHEMA ADDITION
assistant_conversations table:
- id, title (auto-generated from first message)
- linked_opportunity_id (nullable)
- messages_json (JSONB array: [{ role, content, timestamp }])
- created_at, updated_at

---

## REQUIRED ENV VARS
- ANTHROPIC_API_KEY — Anthropic API key (claude.ai account → API keys)

---

CONSTRAINTS:
- Streaming required — responses must appear word by word, not all at once
- AI must use tool calls to fetch real data — no hallucinating contract details
- PDF upload max 10MB, PDF only
- Conversation history passed with each message (last 20 messages for context window)
- Anthropic API key stored server-side only — never exposed to client
- Model: claude-sonnet-4-6 (fast, capable, cost-effective for chat)
- If AI references a contract, render it as a ContractContextCard inline in the response

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_018
