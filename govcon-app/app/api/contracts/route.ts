// ============================================================
// GET /api/contracts
// Server-side contract query endpoint.
// Accepts all filter/sort/pagination params as query params.
// Returns paginated results + total count from Supabase.
//
// Query params:
//   q              — full-text search (title + description)
//   source         — comma-separated OpportunitySource values
//   naics          — comma-separated NAICS codes (integers)
//   naics_sector   — comma-separated sector labels
//   agency         — partial agency name match
//   threshold      — comma-separated threshold_category values
//   contract_type  — comma-separated ContractType values
//   set_aside      — comma-separated SetAside values
//   min_value      — minimum value_max in dollars
//   max_value      — maximum value_max in dollars
//   deadline_after — ISO date string
//   deadline_before — ISO date string
//   status         — comma-separated status values (default: active)
//   sort           — field:direction e.g. "deadline:asc", "value_max:desc", "posted_date:desc"
//   page           — 1-indexed (default: 1)
//   limit          — per page (default: 25, max: 100)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../03_OUTPUTS/TASK_001_scaffold/lib/supabase';

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
  const naicsSectors = parseCommaSeparated(searchParams.get('naics_sector'));
  const agency = searchParams.get('agency') ?? '';
  const thresholds = parseCommaSeparated(searchParams.get('threshold'));
  const contractTypes = parseCommaSeparated(searchParams.get('contract_type'));
  const setAsides = parseCommaSeparated(searchParams.get('set_aside'));
  const minValueDollars = searchParams.get('min_value') ? Number(searchParams.get('min_value')) : null;
  const maxValueDollars = searchParams.get('max_value') ? Number(searchParams.get('max_value')) : null;
  const deadlineAfter = searchParams.get('deadline_after') ?? '';
  const deadlineBefore = searchParams.get('deadline_before') ?? '';
  const statuses = parseCommaSeparated(searchParams.get('status'));
  const sortParam = searchParams.get('sort') ?? 'deadline:asc';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE), 10)));

  const offset = (page - 1) * limit;

  const [sortField, sortDir] = sortParam.split(':');
  const ascending = sortDir !== 'desc';

  const allowedSortFields = ['deadline', 'value_max', 'posted_date', 'created_at', 'title', 'agency_name'];
  const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'deadline';

  try {
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('opportunities')
      .select(
        'id, source, title, agency_name, solicitation_number, naics_code, naics_sector, contract_type, threshold_category, set_aside_type, value_min, value_max, deadline, posted_date, place_of_performance_city, place_of_performance_state, place_of_performance_zip, description, url, status, canonical_sources, dedup_hash, created_at, updated_at',
        { count: 'exact' },
      );

    // Full-text search on title + description
    if (q.trim()) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,agency_name.ilike.%${q}%`);
    }

    // Source filter
    if (sources.length > 0) {
      query = query.in('source', sources);
    }

    // NAICS code filter
    if (naicsCodes.length > 0) {
      query = query.in('naics_code', naicsCodes);
    }

    // NAICS sector filter
    if (naicsSectors.length > 0) {
      query = query.in('naics_sector', naicsSectors);
    }

    // Agency partial match
    if (agency.trim()) {
      query = query.ilike('agency_name', `%${agency.trim()}%`);
    }

    // Threshold category filter
    if (thresholds.length > 0) {
      query = query.in('threshold_category', thresholds);
    }

    // Contract type filter
    if (contractTypes.length > 0) {
      query = query.in('contract_type', contractTypes);
    }

    // Set-aside filter
    if (setAsides.length > 0) {
      query = query.in('set_aside_type', setAsides);
    }

    // Value range filter (in cents)
    if (minValueDollars != null && !isNaN(minValueDollars)) {
      query = query.gte('value_max', Math.round(minValueDollars * 100));
    }
    if (maxValueDollars != null && !isNaN(maxValueDollars)) {
      query = query.lte('value_max', Math.round(maxValueDollars * 100));
    }

    // Deadline range
    if (deadlineAfter) {
      query = query.gte('deadline', new Date(deadlineAfter).toISOString());
    }
    if (deadlineBefore) {
      query = query.lte('deadline', new Date(deadlineBefore).toISOString());
    }

    // Status filter (default to active if not specified)
    const effectiveStatuses = statuses.length > 0 ? statuses : ['active'];
    query = query.in('status', effectiveStatuses);

    // Sort — nulls last for deadline/value
    query = query.order(safeSortField, { ascending, nullsFirst: false });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('[api/contracts] Supabase query error:', error.message);
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
    console.error('[api/contracts] Unexpected error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
