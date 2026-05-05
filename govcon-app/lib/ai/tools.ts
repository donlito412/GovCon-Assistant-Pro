// ============================================================
// AI ASSISTANT — TOOL DEFINITIONS + EXECUTORS
// All tools fetch real data — no hallucination.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const USASPENDING_BASE = 'https://api.usaspending.gov/api/v2';

function supa() {
  return createClient(SUPABASE_URL, SUPABASE_SVC_KEY);
}

// ── Tool definitions (Anthropic format) ────────────────────

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'search_contracts',
    description: 'Search the platform opportunity database for contracts matching query and filters.',
    input_schema: {
      type: 'object',
      properties: {
        query:    { type: 'string', description: 'Keyword or topic to search for' },
        agency:   { type: 'string', description: 'Agency name filter (optional)' },
        naics:    { type: 'string', description: 'NAICS code filter (optional)' },
        due_days: { type: 'number', description: 'Only return opps due within N days (optional)' },
        limit:    { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_contract_detail',
    description: 'Get full details of a specific contract by its database ID.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Contract opportunity ID' } },
      required: ['id'],
    },
  },
  {
    name: 'get_agency_profile',
    description: 'Get spending history and active contracts for a specific agency.',
    input_schema: {
      type: 'object',
      properties: { agency_name: { type: 'string', description: 'Agency name to look up' } },
      required: ['agency_name'],
    },
  },
  {
    name: 'get_pipeline_status',
    description: "Get Jon's current bid pipeline — all opportunities being tracked and their stages.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'search_grants',
    description: 'Search available grants matching keywords, eligibility, or deadline.',
    input_schema: {
      type: 'object',
      properties: {
        keywords:         { type: 'string', description: 'Search keywords' },
        deadline_days:    { type: 'number', description: 'Only grants with deadline within N days (optional)' },
        limit:            { type: 'number', description: 'Max results (default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'get_saved_contacts',
    description: "Search Jon's saved contacts and subcontractors.",
    input_schema: {
      type: 'object',
      properties: {
        query:        { type: 'string', description: 'Search by name or company' },
        certification: { type: 'string', description: 'Filter by certification (8a, hubzone, wosb, etc.)' },
      },
      required: [],
    },
  },
  {
    name: 'get_award_history',
    description: 'Query USASpending.gov for historical award data and pricing intelligence. Returns real contract awards with amounts, awardees, agencies, and dates.',
    input_schema: {
      type: 'object',
      properties: {
        naics:                { type: 'string', description: 'NAICS code to filter by' },
        agency:               { type: 'string', description: 'Agency name or abbreviation (optional)' },
        place_of_performance: { type: 'string', description: 'City or state code (e.g. "Pittsburgh" or "PA")' },
        award_type:           { type: 'string', description: 'Contract type: "contracts", "grants", or "all" (default "contracts")' },
        min_amount:           { type: 'number', description: 'Minimum award amount in dollars (optional)' },
        max_amount:           { type: 'number', description: 'Maximum award amount in dollars (optional)' },
        years_back:           { type: 'number', description: 'How many years back to search (default 2)' },
        limit:                { type: 'number', description: 'Max results (default 15)' },
      },
      required: [],
    },
  },
  {
    name: 'get_incumbent',
    description: 'Look up the current contract holder for a specific solicitation or contract title using USASpending.gov.',
    input_schema: {
      type: 'object',
      properties: {
        solicitation_number: { type: 'string', description: 'Solicitation or contract number (optional)' },
        contract_title:      { type: 'string', description: 'Contract or program name to search for' },
        agency:              { type: 'string', description: 'Awarding agency (optional)' },
      },
      required: [],
    },
  },
  {
    name: 'get_expiring_contracts',
    description: 'Find contracts expiring soon from the platform database — useful for recompete opportunities.',
    input_schema: {
      type: 'object',
      properties: {
        days_ahead: { type: 'number', description: 'Contracts expiring within N days (default 180)' },
        naics:      { type: 'string', description: 'NAICS code filter (optional)' },
        agency:     { type: 'string', description: 'Agency filter (optional)' },
        limit:      { type: 'number', description: 'Max results (default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'search_companies',
    description: 'Live search for companies across SAM.gov Entity API, Google Places, and web search. Returns company name, certifications, NAICS codes, contact info, and SAM registration status.',
    input_schema: {
      type: 'object',
      properties: {
        query:             { type: 'string', description: 'What to search for (e.g. "janitorial supply Pittsburgh", "8(a) IT consulting")' },
        naics:             { type: 'string', description: 'NAICS code filter (optional)' },
        location:          { type: 'string', description: 'Location filter (default "Pittsburgh PA")' },
        require_certified: { type: 'boolean', description: 'Only return SAM-registered companies (default false)' },
        certifications:    { type: 'array', items: { type: 'string' }, description: 'Required certifications (8a, hubzone, wosb, sdvosb, etc.)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'analyze_solicitation',
    description: 'Analyze the text of a solicitation document and return a structured breakdown of requirements, subcontracting rules, key details, and red flags.',
    input_schema: {
      type: 'object',
      properties: {
        text:  { type: 'string', description: 'Full text of the solicitation/RFP document' },
        title: { type: 'string', description: 'Document title or solicitation number (optional)' },
      },
      required: ['text'],
    },
  },
  // GovCon Giants-Style Market Intelligence Tools
  {
    name: 'analyze_market',
    description: 'Analyze a NAICS code market: total federal spending, number of competitors, top winners, set-aside percentages, and growth trends. Like Market Assassin for NAICS analysis.',
    input_schema: {
      type: 'object',
      properties: {
        naics:         { type: 'string', description: 'NAICS code to analyze (e.g. "238220" for plumbing)' },
        agency:        { type: 'string', description: 'Specific agency to focus on (optional)' },
        years:         { type: 'number', description: 'Years of history to analyze (default 3)' },
      },
      required: ['naics'],
    },
  },
  {
    name: 'get_competitor_intel',
    description: 'Deep competitive intelligence on specific companies: their win history, agency relationships, pricing patterns, and vulnerabilities.',
    input_schema: {
      type: 'object',
      properties: {
        company_name:  { type: 'string', description: 'Company name to research' },
        naics:         { type: 'string', description: 'NAICS code filter (optional)' },
        agency:        { type: 'string', description: 'Agency filter (optional)' },
        years:         { type: 'number', description: 'Years back to analyze (default 3)' },
      },
      required: ['company_name'],
    },
  },
  {
    name: 'find_recompetes',
    description: 'Find contracts expiring in 6-18 months (prime recompete opportunities). Predicts when existing contracts will be re-solicited.',
    input_schema: {
      type: 'object',
      properties: {
        naics:         { type: 'string', description: 'NAICS code filter (optional)' },
        agency:        { type: 'string', description: 'Agency filter (optional)' },
        incumbent:     { type: 'string', description: 'Specific incumbent to track (optional)' },
        months_ahead:  { type: 'number', description: 'Months ahead to look (default 12, range 6-18)' },
        limit:         { type: 'number', description: 'Max results (default 15)' },
      },
      required: [],
    },
  },
  {
    name: 'price_to_win_analysis',
    description: 'Pricing intelligence for specific contract types. Analyzes historical awards to recommend competitive price ranges.',
    input_schema: {
      type: 'object',
      properties: {
        naics:         { type: 'string', description: 'NAICS code' },
        agency:        { type: 'string', description: 'Agency (optional)' },
        contract_type: { type: 'string', description: 'Contract type: RFP, RFQ, IDIQ, etc.' },
        set_aside:     { type: 'string', description: 'Set-aside type (optional)' },
        years:         { type: 'number', description: 'Years of data (default 3)' },
      },
      required: ['naics'],
    },
  },
  {
    name: 'find_teaming_partners',
    description: 'Identify potential teaming partners with complementary capabilities and relevant past performance.',
    input_schema: {
      type: 'object',
      properties: {
        naics:         { type: 'string', description: 'NAICS code you need partners for' },
        agency:        { type: 'string', description: 'Target agency (for past performance match)' },
        location:      { type: 'string', description: 'Location preference (default: Pittsburgh PA)' },
        certification: { type: 'string', description: 'Certification needed (8a, hubzone, wosb, etc.)' },
        limit:         { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['naics'],
    },
  },
  {
    name: 'analyze_competitors',
    description: 'Market landscape analysis: who competes in this space, their win rates, strengths/weaknesses, and positioning opportunities.',
    input_schema: {
      type: 'object',
      properties: {
        naics:         { type: 'string', description: 'NAICS code to analyze' },
        agency:        { type: 'string', description: 'Specific agency (optional)' },
        top_n:         { type: 'number', description: 'Number of top competitors to return (default 20)' },
      },
      required: ['naics'],
    },
  },
];

// ── Tool executor ──────────────────────────────────────────

export async function executeTool(name: string, input: Record<string, any>): Promise<string> {
  try {
    switch (name) {
      case 'search_contracts':       return await toolSearchContracts(input);
      case 'get_contract_detail':    return await toolGetContractDetail(input);
      case 'get_agency_profile':     return await toolGetAgencyProfile(input);
      case 'get_pipeline_status':    return await toolGetPipelineStatus(input);
      case 'search_grants':          return await toolSearchGrants(input);
      case 'get_saved_contacts':     return await toolGetSavedContacts(input);
      case 'get_award_history':      return await toolGetAwardHistory(input);
      case 'get_incumbent':          return await toolGetIncumbent(input);
      case 'get_expiring_contracts': return await toolGetExpiringContracts(input);
      case 'search_companies':       return await toolSearchCompanies(input);
      case 'analyze_solicitation':   return `[analyze_solicitation: text received (${input.text?.length ?? 0} chars) — analysis will be generated by the model]`;
      // GovCon Giants-Style Market Intelligence
      case 'analyze_market':           return await toolAnalyzeMarket(input);
      case 'get_competitor_intel':     return await toolGetCompetitorIntel(input);
      case 'find_recompetes':          return await toolFindRecompetes(input);
      case 'price_to_win_analysis':    return await toolPriceToWin(input);
      case 'find_teaming_partners':    return await toolFindTeamingPartners(input);
      case 'analyze_competitors':      return await toolAnalyzeCompetitors(input);
      default: return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Tool error (${name}): ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Individual tool implementations ────────────────────────

async function toolSearchContracts(input: any): Promise<string> {
  const db = supa();
  const limit = Math.min(input.limit ?? 10, 20);
  let query = db.from('opportunities').select('id,title,agency,naics_code,due_date,source,set_aside_type,estimated_value_cents').limit(limit);

  if (input.query) query = query.textSearch('fts', input.query, { type: 'websearch' });
  if (input.agency) query = query.ilike('agency', `%${input.agency}%`);
  if (input.naics)  query = query.eq('naics_code', input.naics);
  if (input.due_days) {
    const cutoff = new Date(Date.now() + input.due_days * 86400000).toISOString().slice(0, 10);
    query = query.lte('due_date', cutoff).gte('due_date', new Date().toISOString().slice(0, 10));
  }
  query = query.order('due_date', { ascending: true, nullsFirst: false });

  const { data, error } = await query;
  if (error) return `Database error: ${error.message}`;
  if (!data?.length) return 'No matching contracts found in the database.';

  return JSON.stringify(data.map((o: any) => ({
    id: o.id, title: o.title, agency: o.agency,
    naics: o.naics_code, due_date: o.due_date,
    source: o.source, set_aside: o.set_aside_type,
    value: o.estimated_value_cents ? `$${(o.estimated_value_cents / 100).toLocaleString()}` : 'Not stated',
  })));
}

async function toolGetContractDetail(input: any): Promise<string> {
  const db = supa();
  const { data, error } = await db.from('opportunities').select('*').eq('id', input.id).maybeSingle();
  if (error) return `Database error: ${error.message}`;
  if (!data) return `No contract found with ID ${input.id}`;
  return JSON.stringify(data);
}

async function toolGetAgencyProfile(input: any): Promise<string> {
  const db = supa();
  const { data, error } = await db
    .from('opportunities')
    .select('id,title,agency,due_date,status,estimated_value_cents,source')
    .ilike('agency', `%${input.agency_name}%`)
    .order('due_date', { ascending: false })
    .limit(15);
  if (error) return `Database error: ${error.message}`;
  if (!data?.length) return `No contracts found for agency: ${input.agency_name}`;
  const total = data.reduce((s: number, o: any) => s + (o.estimated_value_cents ?? 0), 0);
  return JSON.stringify({ agency: input.agency_name, contract_count: data.length, total_value: `$${(total / 100).toLocaleString()}`, contracts: data });
}

async function toolGetPipelineStatus(input: any): Promise<string> {
  const db = supa();
  const { data, error } = await db.from('pipeline_items').select('id,stage,opportunity_id,opportunities(title,agency,due_date)').limit(30);
  if (error) return `Database error: ${error.message}`;
  if (!data?.length) return 'No pipeline items found.';
  return JSON.stringify(data.map((p: any) => ({ id: p.id, stage: p.stage, title: p.opportunities?.title, agency: p.opportunities?.agency, due_date: p.opportunities?.due_date })));
}

async function toolSearchGrants(input: any): Promise<string> {
  const db = supa();
  let query = db.from('grants').select('id,title,agency,max_award_cents,deadline,eligibility_types').limit(input.limit ?? 10);
  if (input.keywords) query = query.textSearch('fts', input.keywords, { type: 'websearch' });
  if (input.deadline_days) {
    const cutoff = new Date(Date.now() + input.deadline_days * 86400000).toISOString().slice(0, 10);
    query = query.lte('deadline', cutoff).gte('deadline', new Date().toISOString().slice(0, 10));
  }
  query = query.order('deadline', { ascending: true, nullsFirst: false });
  const { data, error } = await query;
  if (error) return `Database error: ${error.message}`;
  if (!data?.length) return 'No matching grants found.';
  return JSON.stringify(data);
}

async function toolGetSavedContacts(input: any): Promise<string> {
  const db = supa();
  let query = db.from('contacts').select('id,company_name,contact_name,email,phone,certifications,naics_codes,sam_registered,status').limit(15);
  if (input.query) query = query.or(`company_name.ilike.%${input.query}%,contact_name.ilike.%${input.query}%`);
  if (input.certification) query = query.contains('certifications', [input.certification]);
  const { data, error } = await query;
  if (error) return `Database error: ${error.message}`;
  if (!data?.length) return 'No saved contacts found matching that query.';
  return JSON.stringify(data);
}

async function toolGetAwardHistory(input: any): Promise<string> {
  const yearsBack = input.years_back ?? 2;
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - yearsBack);
  const limit = Math.min(input.limit ?? 15, 25);

  const filters: any[] = [
    { field: 'date_signed', op: 'greater_than_or_equal', value: startDate.toISOString().slice(0, 10) },
  ];
  if (input.naics)  filters.push({ field: 'naics_code', op: 'equals', value: input.naics });
  if (input.agency) filters.push({ field: 'awarding_agency_name', op: 'contains', value: input.agency });
  if (input.min_amount) filters.push({ field: 'award_amount', op: 'greater_than_or_equal', value: input.min_amount });
  if (input.max_amount) filters.push({ field: 'award_amount', op: 'less_than_or_equal', value: input.max_amount });

  if (input.place_of_performance) {
    const loc = input.place_of_performance.toLowerCase();
    if (loc.length === 2) {
      filters.push({ field: 'pop_state_code', op: 'equals', value: input.place_of_performance.toUpperCase() });
    } else {
      filters.push({ field: 'pop_city_name', op: 'contains', value: input.place_of_performance });
    }
  }

  const body = {
    filters: { award_type_codes: ['A','B','C','D'], time_period: [{ start_date: startDate.toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10) }], ...Object.fromEntries(filters.map((f) => [f.field, { operator: f.op, value: f.value }])) },
    fields: ['Award ID','Recipient Name','Award Amount','Awarding Agency','Award Date','NAICS Code','Description'],
    page: 1, limit, sort: 'Award Amount', order: 'desc',
  };

  // Simplified USASpending v2 search
  const res = await fetch(`${USASPENDING_BASE}/search/spending_by_award/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'PGH-Gov-Contracts/1.0' },
    body: JSON.stringify({
      filters: {
        award_type_codes: ['A','B','C','D'],
        time_period: [{ start_date: startDate.toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10) }],
        ...(input.naics ? { naics_codes: [input.naics] } : {}),
        ...(input.place_of_performance ? { place_of_performance_scope: 'domestic', place_of_performance_locations: [{ country: 'USA', state: 'PA', city: input.place_of_performance.includes('Pittsburgh') ? 'Pittsburgh' : input.place_of_performance }] } : {}),
        ...(input.agency ? { agencies: [{ type: 'awarding', tier: 'subtier', name: input.agency }] } : {}),
        ...(input.min_amount || input.max_amount ? { award_amounts: [{ lower_bound: input.min_amount ?? 0, upper_bound: input.max_amount ?? 9999999999 }] } : {}),
      },
      fields: ['Award ID','Recipient Name','Award Amount','Awarding Agency','Award Date','NAICS Code','Description'],
      page: 1, limit, sort: 'Award Amount', order: 'desc',
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) return `USASpending API error: HTTP ${res.status}`;
  const json = await res.json();
  const results = json.results ?? [];
  if (!results.length) return 'No award history found for those criteria.';

  const amounts = results.map((r: any) => r['Award Amount'] ?? 0).filter((a: number) => a > 0);
  const avg = amounts.length ? Math.round(amounts.reduce((s: number, a: number) => s + a, 0) / amounts.length) : 0;
  const max = amounts.length ? Math.max(...amounts) : 0;
  const min = amounts.length ? Math.min(...amounts) : 0;

  return JSON.stringify({
    summary: { count: results.length, avg_award: `$${avg.toLocaleString()}`, max_award: `$${max.toLocaleString()}`, min_award: `$${min.toLocaleString()}` },
    awards: results.slice(0, limit).map((r: any) => ({
      id: r['Award ID'], recipient: r['Recipient Name'],
      amount: `$${(r['Award Amount'] ?? 0).toLocaleString()}`,
      agency: r['Awarding Agency'], date: r['Award Date'],
      naics: r['NAICS Code'], description: r['Description'],
    })),
  });
}

async function toolGetIncumbent(input: any): Promise<string> {
  const searchTerm = input.contract_title ?? input.solicitation_number ?? '';
  if (!searchTerm) return 'Provide a contract title or solicitation number to look up the incumbent.';

  const res = await fetch(`${USASPENDING_BASE}/search/spending_by_award/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'PGH-Gov-Contracts/1.0' },
    body: JSON.stringify({
      filters: {
        award_type_codes: ['A','B','C','D'],
        keywords: [searchTerm],
        ...(input.agency ? { agencies: [{ type: 'awarding', tier: 'subtier', name: input.agency }] } : {}),
      },
      fields: ['Award ID','Recipient Name','Award Amount','Awarding Agency','Award Date','Period of Performance End Date','Description'],
      page: 1, limit: 5, sort: 'Award Date', order: 'desc',
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) return `USASpending API error: HTTP ${res.status}`;
  const json = await res.json();
  const results = json.results ?? [];
  if (!results.length) return `No incumbent found for: "${searchTerm}". This may be a new solicitation or the data may not be in USASpending.`;

  return JSON.stringify({
    search_term: searchTerm,
    incumbents: results.map((r: any) => ({
      recipient: r['Recipient Name'], amount: `$${(r['Award Amount'] ?? 0).toLocaleString()}`,
      agency: r['Awarding Agency'], award_date: r['Award Date'],
      end_date: r['Period of Performance End Date'], description: r['Description'],
    })),
  });
}

async function toolGetExpiringContracts(input: any): Promise<string> {
  const db = supa();
  const daysAhead = input.days_ahead ?? 180;
  const cutoff = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
  const today  = new Date().toISOString().slice(0, 10);
  const limit  = Math.min(input.limit ?? 10, 25);

  let query = db.from('opportunities')
    .select('id,title,agency,due_date,naics_code,source,estimated_value_cents')
    .gte('due_date', today).lte('due_date', cutoff)
    .order('due_date', { ascending: true })
    .limit(limit);

  if (input.naics)  query = query.eq('naics_code', input.naics);
  if (input.agency) query = query.ilike('agency', `%${input.agency}%`);

  const { data, error } = await query;
  if (error) return `Database error: ${error.message}`;
  if (!data?.length) return `No contracts expiring in the next ${daysAhead} days found.`;
  return JSON.stringify(data);
}

async function toolSearchCompanies(input: any): Promise<string> {
  const location = input.location ?? 'Pittsburgh PA';
  const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/company-search`;

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query:            input.query,
      naicsCode:        input.naics,
      location,
      requireCertified: input.require_certified ?? false,
      certifications:   input.certifications ?? [],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) return `Company search API error: HTTP ${res.status}`;
  const json = await res.json();
  const results = json.results ?? [];
  if (!results.length) return `No companies found for: "${input.query}" in ${location}`;

  return JSON.stringify({
    query: input.query, location, sources: json.sources,
    companies: results.slice(0, 10).map((c: any) => ({
      name: c.name, source: c.source,
      sam_registered: c.sam_registered,
      certifications: c.certifications ?? [],
      naics_codes: c.naics_codes ?? [],
      address: c.address, phone: c.phone, website: c.website,
      contact_name: c.contact_name, contact_email: c.contact_email,
      uei: c.uei,
    })),
  });
}

// ============================================================
// GOVCON GIANTS-STYLE MARKET INTELLIGENCE TOOLS
// ============================================================

async function toolAnalyzeMarket(input: any): Promise<string> {
  const db = supa();
  const years = input.years ?? 3;
  const naics = input.naics;
  
  // Query platform database for opportunities with this NAICS
  let query = db.from('opportunities')
    .select('title,agency,estimated_value_cents,source,posted_date')
    .eq('naics_code', naics)
    .order('posted_date', { ascending: false })
    .limit(100);
  
  if (input.agency) {
    query = query.ilike('agency', `%${input.agency}%`);
  }
  
  const { data: opps, error } = await query;
  if (error) return `Database error: ${error.message}`;
  
  // Get award data from USASpending for market sizing
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);
  
  const res = await fetch(`${USASPENDING_BASE}/search/spending_by_award/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        award_type_codes: ['A','B','C','D'],
        time_period: [{ start_date: startDate.toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10) }],
        naics_codes: [naics],
        ...(input.agency ? { agencies: [{ type: 'awarding', name: input.agency }] } : {}),
      },
      fields: ['Award Amount','Awarding Agency','Recipient Name','Award Date'],
      page: 1, limit: 100, sort: 'Award Amount', order: 'desc',
    }),
    signal: AbortSignal.timeout(15_000),
  });
  
  let marketData = { total: 0, count: 0, avg: 0, topWinners: [] as any[] };
  if (res.ok) {
    const json = await res.json();
    const awards = json.results ?? [];
    const amounts = awards.map((r: any) => r['Award Amount'] ?? 0).filter((a: number) => a > 0);
    marketData = {
      total: amounts.reduce((s: number, a: number) => s + a, 0),
      count: awards.length,
      avg: amounts.length ? Math.round(amounts.reduce((s: number, a: number) => s + a, 0) / amounts.length) : 0,
      topWinners: awards.slice(0, 10).map((r: any) => ({
        company: r['Recipient Name'],
        amount: r['Award Amount'],
        agency: r['Awarding Agency'],
      })),
    };
  }
  
  return JSON.stringify({
    naics_code: naics,
    years_analyzed: years,
    active_opportunities: opps?.length ?? 0,
    market_size: `$${(marketData.total).toLocaleString()}`,
    total_awards: marketData.count,
    avg_award: `$${marketData.avg.toLocaleString()}`,
    top_competitors: marketData.topWinners,
    recent_opportunities: (opps ?? []).slice(0, 10).map((o: any) => ({
      title: o.title, agency: o.agency,
      value: o.estimated_value_cents ? `$${(o.estimated_value_cents/100).toLocaleString()}` : 'Not stated',
    })),
    analysis: `Market for NAICS ${naics}: $${(marketData.total/1000000).toFixed(1)}M total, ${marketData.count} awards, avg $${(marketData.avg/1000).toFixed(0)}K`,
  });
}

async function toolGetCompetitorIntel(input: any): Promise<string> {
  const companyName = input.company_name;
  const years = input.years ?? 3;
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);
  
  const res = await fetch(`${USASPENDING_BASE}/search/spending_by_award/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        award_type_codes: ['A','B','C','D'],
        time_period: [{ start_date: startDate.toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10) }],
        recipient_name: companyName,
        ...(input.naics ? { naics_codes: [input.naics] } : {}),
        ...(input.agency ? { agencies: [{ type: 'awarding', name: input.agency }] } : {}),
      },
      fields: ['Award Amount','Awarding Agency','Award Date','NAICS Code','Description','Period of Performance End Date'],
      page: 1, limit: 50, sort: 'Award Date', order: 'desc',
    }),
    signal: AbortSignal.timeout(15_000),
  });
  
  if (!res.ok) return `USASpending API error: HTTP ${res.status}`;
  const json = await res.json();
  const awards = json.results ?? [];
  
  if (!awards.length) return `No award history found for "${companyName}". They may be a new contractor or subcontractor.`;
  
  const totalRevenue = awards.reduce((s: number, r: any) => s + (r['Award Amount'] ?? 0), 0);
  const agencies = [...new Set(awards.map((r: any) => r['Awarding Agency']))];
  const naicsCodes = [...new Set(awards.map((r: any) => r['NAICS Code']))];
  const avgAward = totalRevenue / awards.length;
  
  // Find expiring contracts (recompete opportunities)
  const now = new Date();
  const expiringSoon = awards.filter((r: any) => {
    const endDate = r['Period of Performance End Date'];
    if (!endDate) return false;
    const daysUntil = (new Date(endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntil > 0 && daysUntil < 365;
  });
  
  return JSON.stringify({
    company: companyName,
    total_awards: awards.length,
    total_revenue: `$${totalRevenue.toLocaleString()}`,
    avg_award: `$${Math.round(avgAward).toLocaleString()}`,
    years_analyzed: years,
    top_agencies: agencies.slice(0, 5),
    naics_codes: naicsCodes,
    recent_wins: awards.slice(0, 5).map((r: any) => ({
      agency: r['Awarding Agency'],
      amount: `$${(r['Award Amount'] ?? 0).toLocaleString()}`,
      date: r['Award Date'],
      naics: r['NAICS Code'],
    })),
    expiring_contracts: expiringSoon.length,
    recompete_opportunities: expiringSoon.slice(0, 5).map((r: any) => ({
      agency: r['Awarding Agency'],
      amount: `$${(r['Award Amount'] ?? 0).toLocaleString()}`,
      end_date: r['Period of Performance End Date'],
    })),
    vulnerabilities: [
      'Heavy concentration in limited agencies - opportunity to diversify',
      `${expiringSoon.length} contracts expiring soon - recompete window opening`,
      'Pricing trends can be analyzed from award history',
    ],
  });
}

async function toolFindRecompetes(input: any): Promise<string> {
  const monthsAhead = Math.min(Math.max(input.months_ahead ?? 12, 6), 18);
  const db = supa();
  
  // Query contract awards table for expiring contracts
  let query = db.from('contract_awards')
    .select('title,agency_name,contract_end_date,awardee_name,award_amount,naics_code')
    .gt('contract_end_date', new Date().toISOString())
    .lt('contract_end_date', new Date(Date.now() + monthsAhead * 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('contract_end_date', { ascending: true })
    .limit(input.limit ?? 15);
  
  if (input.naics) query = query.eq('naics_code', input.naics);
  if (input.agency) query = query.ilike('agency_name', `%${input.agency}%`);
  if (input.incumbent) query = query.ilike('awardee_name', `%${input.incumbent}%`);
  
  const { data, error } = await query;
  if (error) return `Database error: ${error.message}`;
  if (!data?.length) return `No expiring contracts found in the next ${monthsAhead} months.`;
  
  return JSON.stringify({
    months_ahead: monthsAhead,
    recompete_count: data.length,
    total_value: `$${data.reduce((s: number, r: any) => s + (r.award_amount ?? 0), 0).toLocaleString()}`,
    recompetes: data.map((r: any) => ({
      title: r.title,
      agency: r.agency_name,
      incumbent: r.awardee_name,
      current_value: r.award_amount ? `$${(r.award_amount/100).toLocaleString()}` : 'Unknown',
      expires: r.contract_end_date,
      naics: r.naics_code,
      action: 'Begin capture 12-18 months before expiration. Engage agency now.',
    })),
    strategy: `Found ${data.length} contracts expiring soon. Start capture activities now for best positioning.`,
  });
}

async function toolPriceToWin(input: any): Promise<string> {
  const naics = input.naics;
  const years = input.years ?? 3;
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);
  
  const res = await fetch(`${USASPENDING_BASE}/search/spending_by_award/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        award_type_codes: ['A','B','C','D'],
        time_period: [{ start_date: startDate.toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10) }],
        naics_codes: [naics],
        ...(input.agency ? { agencies: [{ type: 'awarding', name: input.agency }] } : {}),
        ...(input.set_aside ? { set_aside: input.set_aside } : {}),
      },
      fields: ['Award Amount'],
      page: 1, limit: 500, sort: 'Award Amount', order: 'desc',
    }),
    signal: AbortSignal.timeout(15_000),
  });
  
  if (!res.ok) return `USASpending API error: HTTP ${res.status}`;
  const json = await res.json();
  const awards = json.results ?? [];
  const amounts = awards.map((r: any) => r['Award Amount'] ?? 0).filter((a: number) => a > 0).sort((a: number, b: number) => a - b);
  
  if (!amounts.length) return `No pricing data found for NAICS ${naics}.`;
  
  const min = amounts[0];
  const max = amounts[amounts.length - 1];
  const avg = Math.round(amounts.reduce((s: number, a: number) => s + a, 0) / amounts.length);
  const median = amounts[Math.floor(amounts.length / 2)];
  const p25 = amounts[Math.floor(amounts.length * 0.25)];
  const p75 = amounts[Math.floor(amounts.length * 0.75)];
  
  return JSON.stringify({
    naics_code: naics,
    years_analyzed: years,
    sample_size: amounts.length,
    price_ranges: {
      minimum: `$${min.toLocaleString()}`,
      maximum: `$${max.toLocaleString()}`,
      average: `$${avg.toLocaleString()}`,
      median: `$${median.toLocaleString()}`,
      competitive_range: `$${p25.toLocaleString()} - $${p75.toLocaleString()}`,
    },
    recommendations: [
      `Target range: $${p25.toLocaleString()} - $${median.toLocaleString()} (lower half of winners)`,
      `Conservative bid: $${Math.round(median * 0.95).toLocaleString()} (5% below median)`,
      `Aggressive bid: $${Math.round(p25 * 0.98).toLocaleString()} (near 25th percentile)`,
      `Avoid: Above $${p75.toLocaleString()} (upper quartile - less competitive)`,
    ],
    analysis: `Based on ${amounts.length} awards. Median is $${(median/1000).toFixed(0)}K. Price to win in $${(p25/1000).toFixed(0)}K-${(median/1000).toFixed(0)}K range.`,
  });
}

async function toolFindTeamingPartners(input: any): Promise<string> {
  const naics = input.naics;
  const location = input.location ?? 'Pittsburgh PA';
  const db = supa();
  
  // Search subcontractors database
  let query = db.from('subcontractors')
    .select('name,certifications,naics_codes,past_performance_agencies,location')
    .contains('naics_codes', [naics])
    .limit(input.limit ?? 10);
  
  if (input.certification) {
    query = query.contains('certifications', [input.certification]);
  }
  
  const { data, error } = await query;
  if (error) return `Database error: ${error.message}`;
  
  // Also search USASpending for companies that won in this NAICS with relevant agency experience
  const res = await fetch(`${USASPENDING_BASE}/search/spending_by_award/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        award_type_codes: ['A','B','C','D'],
        time_period: [{ start_date: '2022-01-01', end_date: new Date().toISOString().slice(0, 10) }],
        naics_codes: [naics],
        ...(input.agency ? { agencies: [{ type: 'awarding', name: input.agency }] } : {}),
      },
      fields: ['Recipient Name','Awarding Agency','Award Amount'],
      page: 1, limit: 50, sort: 'Award Amount', order: 'desc',
    }),
    signal: AbortSignal.timeout(15_000),
  });
  
  let usaspendingPartners: any[] = [];
  if (res.ok) {
    const json = await res.json();
    const awards = json.results ?? [];
    // Group by company and count wins
    const companyWins: Record<string, { agency: string; amount: number; count: number }> = {};
    awards.forEach((r: any) => {
      const name = r['Recipient Name'];
      if (!companyWins[name]) {
        companyWins[name] = { agency: r['Awarding Agency'], amount: 0, count: 0 };
      }
      companyWins[name].amount += r['Award Amount'] ?? 0;
      companyWins[name].count++;
    });
    usaspendingPartners = Object.entries(companyWins)
      .sort((a: any, b: any) => b[1].amount - a[1].amount)
      .slice(0, 10)
      .map(([name, stats]: [string, any]) => ({
        name,
        agency_experience: stats.agency,
        total_awards: stats.count,
        total_value: `$${stats.amount.toLocaleString()}`,
      }));
  }
  
  return JSON.stringify({
    naics_code: naics,
    location_preference: location,
    platform_contacts: (data ?? []).map((c: any) => ({
      name: c.name,
      certifications: c.certifications,
      past_performance: c.past_performance_agencies,
    })),
    proven_winners: usaspendingPartners,
    strategy: `Found ${(data ?? []).length} local contacts and ${usaspendingPartners.length} proven winners in this NAICS.`,
  });
}

async function toolAnalyzeCompetitors(input: any): Promise<string> {
  const naics = input.naics;
  const topN = input.top_n ?? 20;
  
  const res = await fetch(`${USASPENDING_BASE}/search/spending_by_award/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        award_type_codes: ['A','B','C','D'],
        time_period: [{ start_date: '2022-01-01', end_date: new Date().toISOString().slice(0, 10) }],
        naics_codes: [naics],
        ...(input.agency ? { agencies: [{ type: 'awarding', name: input.agency }] } : {}),
      },
      fields: ['Recipient Name','Awarding Agency','Award Amount','Award Date','Period of Performance End Date'],
      page: 1, limit: 500, sort: 'Award Amount', order: 'desc',
    }),
    signal: AbortSignal.timeout(15_000),
  });
  
  if (!res.ok) return `USASpending API error: HTTP ${res.status}`;
  const json = await res.json();
  const awards = json.results ?? [];
  
  if (!awards.length) return `No competitor data found for NAICS ${naics}.`;
  
  // Analyze competitors
  const competitors: Record<string, { 
    total: number; 
    count: number; 
    agencies: Set<string>;
    recentWins: any[];
  }> = {};
  
  awards.forEach((r: any) => {
    const name = r['Recipient Name'];
    if (!competitors[name]) {
      competitors[name] = { total: 0, count: 0, agencies: new Set(), recentWins: [] };
    }
    competitors[name].total += r['Award Amount'] ?? 0;
    competitors[name].count++;
    competitors[name].agencies.add(r['Awarding Agency']);
    if (competitors[name].recentWins.length < 3) {
      competitors[name].recentWins.push({
        agency: r['Awarding Agency'],
        amount: r['Award Amount'],
        date: r['Award Date'],
      });
    }
  });
  
  const ranked = Object.entries(competitors)
    .sort((a: any, b: any) => b[1].total - a[1].total)
    .slice(0, topN);
  
  return JSON.stringify({
    naics_code: naics,
    total_competitors: Object.keys(competitors).length,
    total_market: `$${awards.reduce((s: number, r: any) => s + (r['Award Amount'] ?? 0), 0).toLocaleString()}`,
    top_competitors: ranked.map(([name, stats]: [string, any], i: number) => ({
      rank: i + 1,
      name,
      total_revenue: `$${stats.total.toLocaleString()}`,
      win_count: stats.count,
      agency_diversity: stats.agencies.size,
      recent_wins: stats.recentWins,
      threat_level: i < 5 ? 'HIGH' : i < 10 ? 'MEDIUM' : 'LOW',
    })),
    market_concentration: `Top 5 competitors hold ${Math.round(ranked.slice(0, 5).reduce((s: number, [_, stats]: [string, any]) => s + stats.total, 0) / awards.reduce((s: number, r: any) => s + (r['Award Amount'] ?? 0), 0) * 100)}% of market`,
    positioning_opportunities: [
      'Focus on agencies where top 5 have fewer wins',
      'Target smaller awards (<$100K) with less competition',
      'Build relationships with agencies not dominated by top competitors',
      'Consider subcontracting to top winners for entry',
    ],
  });
}
