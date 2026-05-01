export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/ingest/grants
// Runs all grants sources in parallel, upserts to Supabase grants table.
// Secured by x-ingest-secret header.
// Netlify cron: daily at 12:45 UTC (07:45 ET).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ingestGrantsGov } from '@/lib/ingestion/grants/grantsgov';
import { ingestPaGrants }  from '@/lib/ingestion/grants/pa_grants';
import { ingestUraGrants } from '@/lib/ingestion/grants/ura_grants';
import { ingestSbaGrants } from '@/lib/ingestion/grants/sba_grants';
import type { GrantRecord } from '@/lib/ingestion/grants/types';

const INGEST_SECRET = process.env.INGEST_SECRET ?? '';
const BATCH_SIZE    = 50;

async function upsertGrants(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  grants: GrantRecord[],
): Promise<{ inserted: number; deduped: number; errors: string[] }> {
  let inserted = 0, deduped = 0;
  const errors: string[] = [];

  for (let i = 0; i < grants.length; i += BATCH_SIZE) {
    const batch = grants.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('grants')
      .upsert(
        batch.map((g) => ({
          source:               g.source,
          category:             g.category,
          title:                g.title,
          agency:               g.agency,
          grant_type:           g.grant_type,
          eligible_entities:    g.eligible_entities,
          min_amount:           g.min_amount ?? null,
          max_amount:           g.max_amount ?? null,
          application_deadline: g.application_deadline ?? null,
          posted_date:          g.posted_date ?? null,
          description:          g.description ?? null,
          requirements:         g.requirements ?? null,
          how_to_apply:         g.how_to_apply ?? null,
          url:                  g.url ?? null,
          dedup_hash:           g.dedup_hash,
          external_id:          g.external_id ?? null,
          status:               g.status,
        })),
        { onConflict: 'dedup_hash', ignoreDuplicates: false },
      )
      .select('id');

    if (error) {
      errors.push(`Upsert batch error: ${error.message}`);
    } else {
      inserted += data?.length ?? 0;
    }
  }

  return { inserted, deduped, errors };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-ingest-secret') ?? '';
  if (INGEST_SECRET && secret !== INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const runStart = Date.now();

  console.log('[ingest/grants] Starting all grant sources…');

  // Run all sources in parallel
  const [grantsgov, paResults, ura, sba] = await Promise.allSettled([
    ingestGrantsGov(),
    ingestPaGrants(),
    ingestUraGrants(),
    ingestSbaGrants(),
  ]);

  // Flatten PA results (returns array of two results)
  const paGrants = paResults.status === 'fulfilled' ? paResults.value : [];
  const paGrantsFlat = Array.isArray(paGrants) ? paGrants.flatMap((r) => r.grants) : [];

  const allGrants: GrantRecord[] = [
    ...(grantsgov.status === 'fulfilled' ? grantsgov.value.grants : []),
    ...paGrantsFlat,
    ...(ura.status === 'fulfilled' ? ura.value.grants : []),
    ...(sba.status === 'fulfilled' ? sba.value.grants : []),
  ];

  console.log(`[ingest/grants] Total grants to upsert: ${allGrants.length}`);

  const { inserted, deduped, errors } = await upsertGrants(supabase, allGrants);

  const summary = {
    grantsgov: grantsgov.status === 'fulfilled' ? grantsgov.value.grants.length : 0,
    pa_grants: paGrantsFlat.filter((g) => g.source === 'state_pa_grants').length,
    pa_dced:   paGrantsFlat.filter((g) => g.source === 'state_pa_dced').length,
    ura:       ura.status === 'fulfilled' ? ura.value.grants.length : 0,
    sba:       sba.status === 'fulfilled' ? sba.value.grants.length : 0,
  };

  const totalMs = Date.now() - runStart;
  console.log(`[ingest/grants] Done — inserted: ${inserted}, errors: ${errors.length} (${totalMs}ms)`);

  return NextResponse.json({
    records_upserted: inserted,
    total_scraped:    allGrants.length,
    sources:          summary,
    errors:           errors.slice(0, 10),
    duration_ms:      totalMs,
  }, { status: 200 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = req.headers.get('x-netlify-scheduled-function-secret') ?? '';
  const envSecret  = process.env.CRON_SECRET ?? '';
  if (envSecret && cronSecret !== envSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return POST(req);
}
