export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/company-search
// Body: { query, naicsCode, location, requireCertified, certificationTypes, limit }
// Returns ranked CompanyResult[] from SAM.gov + Google Places + Web
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { searchCompanies } from '@/lib/search/company_search';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { query, naicsCode, location, requireCertified, certificationTypes, limit } = body;

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return NextResponse.json({ error: 'query is required (min 2 chars)' }, { status: 400 });
  }

  const { results, errors, sources } = await searchCompanies({
    query:            query.trim(),
    naicsCode:        naicsCode ?? undefined,
    location:         location ?? 'Pittsburgh, PA',
    requireCertified: requireCertified === true,
    certificationTypes: Array.isArray(certificationTypes) ? certificationTypes : [],
    limit:            typeof limit === 'number' ? limit : 20,
  });

  return NextResponse.json({ results, sources, errors: errors.slice(0, 5) });
}
