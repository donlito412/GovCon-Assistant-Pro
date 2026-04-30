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
