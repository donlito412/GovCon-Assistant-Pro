// ============================================================
// GET /api/agencies/[id]/awards
// Fetches past contract awards from USASpending.gov for an agency.
// Uses /api/v2/search/spending_by_award/ filtered to Pittsburgh area.
// Handles 429 rate limiting with retry + exponential backoff.
// Returns top 20 most recent awards.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../../../03_OUTPUTS/TASK_001_scaffold/lib/supabase';

const USASPENDING_BASE = 'https://api.usaspending.gov';
const PGH_PLACE_FIPS = '4261000'; // Pittsburgh city FIPS

// Pittsburgh-area zip codes for place_of_performance filter
const PGH_ZIPS = [
  '15201','15202','15203','15204','15205','15206','15207','15208','15209','15210',
  '15211','15212','15213','15214','15215','15216','15217','15218','15219','15220',
  '15221','15222','15223','15224','15225','15226','15227','15228','15229','15230',
  '15232','15233','15234','15235','15236','15237','15238','15239','15240','15241',
  '15242','15243','15260','15261','15290',
];

async function fetchWithRetry(url: string, body: object, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      lastError = new Error('USASpending rate limit hit');
      continue;
    }
    return res;
  }
  throw lastError ?? new Error('Failed after retries');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const supabase = createServerSupabaseClient();

    // Get agency name from DB
    const { data: agency, error: agErr } = await supabase
      .from('agencies')
      .select('name, level')
      .eq('id', id)
      .single();

    if (agErr || !agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    // Build USASpending filter
    const requestBody = {
      filters: {
        awarding_agency_name: [agency.name],
        place_of_performance_locations: [
          { country: 'USA', state: 'PA', city: 'Pittsburgh' },
        ],
        time_period: [
          {
            start_date: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
          },
        ],
        award_type_codes: ['A', 'B', 'C', 'D'], // Contracts only
      },
      fields: [
        'Award ID',
        'Recipient Name',
        'Start Date',
        'End Date',
        'Award Amount',
        'Description',
        'awarding_agency_name',
        'Contract Award Type',
        'Place of Performance City Code',
      ],
      sort: 'Award Amount',
      order: 'desc',
      limit: 20,
      page: 1,
    };

    const res = await fetchWithRetry(
      `${USASPENDING_BASE}/api/v2/search/spending_by_award/`,
      requestBody,
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[api/agencies/awards] USASpending error ${res.status}:`, text);
      // Return empty rather than failing — awards are supplementary data
      return NextResponse.json({ awards: [], agency: agency.name, source: 'usaspending' }, { status: 200 });
    }

    const json = await res.json();
    const results = json.results ?? [];

    const awards = results.map((r: Record<string, unknown>) => ({
      award_id: r['Award ID'],
      recipient_name: r['Recipient Name'],
      start_date: r['Start Date'],
      end_date: r['End Date'],
      amount_dollars: r['Award Amount'],
      description: r['Description'],
      award_type: r['Contract Award Type'],
    }));

    return NextResponse.json({
      awards,
      agency: agency.name,
      total: json.page_metadata?.total ?? awards.length,
      source: 'usaspending',
    }, {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=3600' }, // Cache for 1h — awards data is stable
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/agencies/awards]', msg);
    // Return empty gracefully — awards are optional intelligence
    return NextResponse.json({ awards: [], error: msg, source: 'usaspending' }, { status: 200 });
  }
}
