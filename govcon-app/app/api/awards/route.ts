export const dynamic = 'force-dynamic';

// ============================================================
// GET /api/awards
// Server-side awards query endpoint (separate from opportunities)
// Returns historical contract awards from contract_awards table
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function parseCommaSeparated(val: string | null): string[] {
  if (!val) return [];
  return val.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;

  const q = searchParams.get('q') ?? '';
  const sources = parseCommaSeparated(searchParams.get('source'));
  const naicsCodes = parseCommaSeparated(searchParams.get('naics')).map(Number).filter((n) => !isNaN(n));
  const agency = searchParams.get('agency') ?? '';
  const awardee = searchParams.get('awardee') ?? '';
  const minValueDollars = searchParams.get('min_value') ? Number(searchParams.get('min_value')) : null;
  const maxValueDollars = searchParams.get('max_value') ? Number(searchParams.get('max_value')) : null;
  const awardedAfter = searchParams.get('awarded_after') ?? '';
  const awardedBefore = searchParams.get('awarded_before') ?? '';
  const sortParam = searchParams.get('sort') ?? 'award_date:desc';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE), 10)));

  const offset = (page - 1) * limit;

  const [sortField, sortDir] = sortParam.split(':');
  const ascending = sortDir !== 'desc';

  const allowedSortFields = ['award_date', 'award_amount', 'contract_end_date', 'created_at', 'title', 'agency_name', 'awardee_name'];
  const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'award_date';

  try {
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('contract_awards')
      .select(
        'id, source, title, agency_name, solicitation_number, naics_code, naics_sector, contract_type, set_aside_type, award_date, award_amount, contract_start_date, contract_end_date, awardee_name, awardee_uei, place_of_performance_city, place_of_performance_state, place_of_performance_zip, description, url, usaspending_award_id, status, created_at, updated_at',
        { count: 'exact' },
      );

    // Full-text search on title + description + awardee
    if (q.trim()) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,agency_name.ilike.%${q}%,awardee_name.ilike.%${q}%`);
    }

    // Source filter
    if (sources.length > 0) {
      query = query.in('source', sources);
    }

    // NAICS code filter
    if (naicsCodes.length > 0) {
      query = query.in('naics_code', naicsCodes);
    }

    // Agency partial match
    if (agency.trim()) {
      query = query.ilike('agency_name', `%${agency.trim()}%`);
    }

    // Awardee filter
    if (awardee.trim()) {
      query = query.ilike('awardee_name', `%${awardee.trim()}%`);
    }

    // Value range filter (in cents)
    if (minValueDollars != null && !isNaN(minValueDollars)) {
      query = query.gte('award_amount', Math.round(minValueDollars * 100));
    }
    if (maxValueDollars != null && !isNaN(maxValueDollars)) {
      query = query.lte('award_amount', Math.round(maxValueDollars * 100));
    }

    // Award date range
    if (awardedAfter) {
      query = query.gte('award_date', new Date(awardedAfter).toISOString());
    }
    if (awardedBefore) {
      query = query.lte('award_date', new Date(awardedBefore).toISOString());
    }

    // Sort — nulls last for dates
    query = query.order(safeSortField, { ascending, nullsFirst: false });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('[api/awards] Supabase query error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        data: data ?? [],
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=60',
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/awards] Unexpected error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
