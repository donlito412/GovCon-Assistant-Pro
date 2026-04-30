TASK ID: 017

STATUS: DONE

GOAL:
Build the AI Assistant — a Claude-powered expert embedded in every corner of the platform. It reads full solicitation documents, breaks down requirements, researches companies and pricing, analyzes compliance and subcontracting rules, and surfaces everything Jon needs to make decisions. The AI presents information and options. All decisions and actions belong to Jon. Nothing executes without his explicit approval.

ASSIGNED TO: Claude

INPUTS:
- /01_BRIEF/project.md
- /03_OUTPUTS/TASK_001_scaffold/ (full scaffold + types)
- /03_OUTPUTS/TASK_004_discovery_ui/ (contracts data)
- /03_OUTPUTS/TASK_007_agency_profiles/ (agency + award data)
- /03_OUTPUTS/TASK_014_company_finder/ (on-demand company search)

OUTPUT:
/03_OUTPUTS/TASK_017_ai_assistant/
  - /app/(dashboard)/assistant/page.tsx — AI assistant chat page
  - /components/assistant/ChatWindow.tsx — message thread UI
  - /components/assistant/ChatInput.tsx — message input with file upload
  - /components/assistant/MessageBubble.tsx — user + assistant message rendering (supports markdown)
  - /components/assistant/ContextPanel.tsx — shows what data the AI is referencing
  - /components/assistant/QuickPrompts.tsx — suggested starter prompts
  - /components/assistant/ContractContextCard.tsx — inline contract card shown in AI responses
  - /components/assistant/ApprovalCard.tsx — approval UI: AI suggests an action, Jon approves or rejects
  - /lib/ai/assistant.ts — AI chat logic + context builder
  - /lib/ai/tools.ts — all AI tool definitions
  - /lib/ai/prompts.ts — system prompt + context injection
  - /app/api/assistant/route.ts — streaming chat API endpoint (calls Anthropic API)
  - /app/api/assistant/analyze-document/route.ts — full solicitation/RFP analysis endpoint

---

## CORE PRINCIPLE: AI INFORMS, JON DECIDES

The AI presents facts, analysis, options, and drafted actions. Jon makes every decision. Jon approves every action. The AI never acts autonomously — it always stops and presents results for Jon's review before anything is saved, sent, or executed.

---

## WHAT THE AI DOES

### 1. FULL SOLICITATION ANALYSIS (most important feature)

Jon uploads a PDF (RFP, RFQ, IFB, SOW, amendment) or pastes a SAM.gov link.
The AI reads the entire document and returns a structured breakdown:

**Requirements:**
- All mandatory qualifications, certifications, and licenses required
- Size standards (what NAICS code applies, what the size limit is)
- Past performance requirements (how many years, minimum contract values, similar scope)
- Bonding and insurance requirements (types, coverage amounts)
- Geographic or facility requirements
- Security clearance requirements if any
- Any other eligibility requirements stated in the solicitation

**Subcontracting Rules:**
- Which FAR clauses apply (specifically: 52.219-14 Limitations on Subcontracting, 52.219-27, 52.244-2, etc.)
- What percentage of work must be self-performed (varies by contract type and set-aside)
- Which specific tasks or scopes cannot be subcontracted
- Whether the contract permits subcontracting at all
- Ostensible subcontractor rule implications if set-aside applies
- Any teaming or joint venture restrictions

**Key Contract Details:**
- Period of performance (start date, end date, option periods)
- Place of performance (on-site, remote, specific facility)
- Deliverables and milestones
- Evaluation criteria and their weights/order of importance
- Submission requirements (what to include in the bid package)
- All deadlines (questions due, proposal due, award expected)
- Incumbent contractor if identified

**Red Flags:**
- Unusual or restrictive clauses
- Tight timelines
- Ambiguous scope language
- Qualifications that are difficult to meet
- Any clause that limits competition or favors a specific vendor

Jon reads the full breakdown and decides whether to pursue.

---

### 2. ON-DEMAND COMPANY SEARCH

- "Find me a janitorial supply company in Pittsburgh for this contract"
- "Find an 8(a) certified IT subcontractor for NAICS 541512"
- "Who supplies construction materials in Allegheny County?"
- "Find a woman-owned marketing firm that can handle the communications scope"

AI searches live across SAM.gov Entity API + Google Places + web search (see TASK_014).
Returns a list of companies with name, type, location, certifications (if registered), contact info.
Jon reviews results and decides which to save, contact, or add to bid team.
Every action requires Jon's approval.

---

### 3. PRICING INTELLIGENCE

- "What did similar IT contracts under $350K go for in Pittsburgh in the last 2 years?"
- "What's the average award value for NAICS 541512 contracts from Allegheny County?"
- "What did the incumbent win this contract for last time?"
- "What price range is competitive for this type of work with this agency?"

AI queries USASpending.gov API (free, no key needed) for historical award data:
  - Endpoint: https://api.usaspending.gov/api/v2/search/spending_by_award/
  - Filter by: NAICS code, place of performance (Pittsburgh/PA), date range, award type
  - Returns: award amounts, awardee names, agencies, dates
AI presents pricing data and lets Jon draw his own conclusions.

---

### 4. CONTRACT INTELLIGENCE

- "Find me IT contracts under $350K with a deadline in the next 30 days"
- "Which agencies are spending the most on construction in Pittsburgh?"
- "Show me all contracts related to workforce development"
- "What contracts are expiring in the next 6 months I should be watching?"

---

### 5. INCUMBENT & COMPETITOR RESEARCH

- "Who currently holds this contract?" → looks up USASpending + FPDS award history
- "When does this contract expire and when will it likely recompete?"
- "Who are the top 5 companies winning IT contracts from the City of Pittsburgh?"
- "Has [Company Name] ever won a contract from [Agency]?"
- "Is this agency known for keeping incumbents or switching vendors?"

---

### 6. BID STRATEGY

- "I'm bidding on [contract]. Who are the likely competitors?"
- "Should I pursue this as a small business set-aside or full and open?"
- "What's the win rate for small businesses on this type of contract?"
- "Draft an executive summary / capability statement for this RFP"

---

### 7. GRANT DISCOVERY

- "What grants am I eligible for as a small business in Pittsburgh?"
- "Find me grants related to technology with deadlines in the next 60 days"
- "What's the best URA program for a small service business?"

---

### 8. GENERAL EXPERT QUESTIONS

- "How do I register as an 8(a) small business?"
- "What's the difference between an RFP and an RFQ?"
- "How does the competitive bidding process work for federal contracts?"
- "What is a teaming agreement and when do I need one?"
- "What are the limitations on subcontracting for a small business set-aside?"

---

## TECHNICAL IMPLEMENTATION

### API ENDPOINT (/api/assistant)
- Uses Anthropic Claude API (claude-sonnet-4-6 model)
- Streaming response (text/event-stream) for real-time typing effect
- System prompt: expert government contracting advisor with full context about Jon's business (Murphree Enterprises), his pipeline, and the Pittsburgh-area market
- Tool use: AI has access to tools to pull live data and search the web

### AI TOOLS (function calling)

**Database tools (Supabase):**
- search_contracts({ query, filters }) → returns matching opportunities
- get_contract_detail({ id }) → full contract record
- get_agency_profile({ agency_name }) → agency spending history + active contracts
- get_pipeline_status() → Jon's current pipeline
- search_grants({ eligibility, keywords, deadline_before }) → matching grants
- get_saved_contacts({ query, certification }) → Jon's saved contacts

**Live data tools:**
- get_award_history({ naics, agency, place_of_performance, date_range }) → USASpending.gov historical awards + pricing
- get_incumbent({ solicitation_number }) → current contract holder from USASpending/FPDS
- get_expiring_contracts({ days_ahead, naics, agency }) → contracts expiring soon
- search_companies({ query, naics, location, require_certified, certification_type }) → live search across SAM.gov Entity API + Google Places + web (TASK_014)

**Document tool:**
- analyze_solicitation({ text }) → full structured breakdown: requirements, subcontracting rules, key details, red flags (see Section 1 above)

### APPROVAL-BASED ACTIONS
When the AI wants to take an action on Jon's behalf, it renders an ApprovalCard:
- Save a company to contacts → ApprovalCard shows company details → Jon clicks Approve or Dismiss
- Add a company to a bid team → ApprovalCard shows team assignment → Jon clicks Approve or Dismiss
- Draft an outreach email → ApprovalCard shows full email draft → Jon edits if needed → Jon clicks Send or Dismiss
- Add an opportunity to pipeline → ApprovalCard shows opportunity + stage → Jon clicks Approve or Dismiss
Nothing executes until Jon approves. The AI never acts silently.

### DOCUMENT ANALYSIS (/api/assistant/analyze-document)
- Accept PDF upload (multipart/form-data, max 20MB)
- Also accept: SAM.gov opportunity URL (AI fetches the full description)
- Extract full text from PDF using pdf-parse
- Pass complete text to Claude with structured analysis prompt
- Return full breakdown as defined in Section 1 (requirements, subcontracting rules, key details, red flags)
- Render inline in chat with collapsible sections

### SYSTEM PROMPT CONTEXT
- Jon's business: Murphree Enterprises, Pittsburgh PA
- Jon's focus: Pittsburgh-area government contracts across all levels (federal, state, local, education)
- Jon's philosophy: open to any contract he can fulfill — he decides what he can handle
- Current pipeline summary
- Current date (for deadline calculations)
- Instructions: present all requirements and facts — do not make eligibility decisions for Jon
- Instructions: always cite specific data sources when referencing contracts, awards, or pricing
- Instructions: be direct, specific, and actionable
- Instructions: all actions require Jon's explicit approval before executing

### QUICK PROMPTS (shown on fresh chat)
- "Analyze an RFP" (triggers file upload)
- "Find companies for my current bid"
- "What did similar contracts go for?"
- "Who's winning contracts in my space?"
- "What contracts are expiring soon?"
- "What grants am I eligible for?"

### CHAT PERSISTENCE
- Store conversation history in assistant_conversations table (Supabase)
- Multiple named conversations (organized by contract/topic)
- "Ask AI about this contract" button on contract detail pages → opens assistant pre-loaded with that contract's context
- "Analyze this RFP" button on contract detail pages → triggers document analysis flow

---

## REQUIRED ENV VARS
- ANTHROPIC_API_KEY — Anthropic API key
- SAMGOV_API_KEY — already in use (TASK_002 + TASK_014)
- GOOGLE_PLACES_API_KEY — for company search (TASK_014)
- SEARCH_API_KEY — Brave Search or equivalent (TASK_014)
- USASpending.gov API is free and open — no key needed

---

## CONSTRAINTS
- Streaming required — responses appear word by word, not all at once
- AI must use tool calls to fetch real data — no hallucinating contract details or pricing
- AI presents all requirements — does not make go/no-go decisions for Jon
- PDF upload max 20MB
- Conversation history passed with each message (last 20 messages for context window)
- Anthropic API key stored server-side only — never exposed to client
- Model: claude-sonnet-4-6

AFTER COMPLETION:
- Update /04_LOGS/project_log.md
- Change STATUS to DONE
- Next task: TASK_018
