export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/ingest/federal
// Triggers SAM.gov federal contract ingestion for Pittsburgh area.
// Secured with INGEST_SECRET header.
// Designed to be called by Netlify cron (daily at 06:00 ET)
// or manually via curl/Postman with the correct secret.
//
// Headers required:
//   x-ingest-secret: <INGEST_SECRET env var value>
//
// Returns JSON summary of ingestion results.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { fetchPAOpportunities } from '@/lib/ingestion/samgov';
import { normalizePittsburghOpportunities, type NormalizedOpportunity } from '@/lib/ingestion/normalize';

const UPSERT_BATCH_SIZE = 50;

interface IngestSummary {
  success: boolean;
  totalFetchedFromSAM: number;
  totalAvailableInPA: number;
  pittsburghMatches: number;
  newRecords: number;
  deduplicatedRecords: number;
  errorCount: number;
  fetchErrors: string[];
  upsertErrors: string[];
  durationMs: number;
}

/**
 * Upserts a batch of normalized opportunities into Supabase.
 * On dedup_hash conflict: appends 'federal_samgov' to canonical_sources.
 * Returns counts of new vs deduplicated records.
 */
async function upsertBatch(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  batch: NormalizedOpportunity[],
): Promise<{ newCount: number; dedupCount: number; errors: string[] }> {
  const errors: string[] = [];
  let newCount = 0;
  let dedupCount = 0;

  // First: check which dedup_hashes already exist
  const hashes = batch.map((o) => o.dedup_hash);

  const { data: existing, error: selectError } = await supabase
    .from('opportunities')
    .select('id, dedup_hash, canonical_sources')
    .in('dedup_hash', hashes);

  if (selectError) {
    const msg = `SELECT error: ${selectError.message}`;
    console.error(`[ingest/federal] ${msg}`);
    errors.push(msg);
    return { newCount: 0, dedupCount: 0, errors };
  }

  const existingHashMap = new Map<string, { id: number; canonical_sources: string[] }>(
    (existing ?? []).map((row) => [
      row.dedup_hash as string,
      {
        id: row.id as number,
        canonical_sources: (row.canonical_sources as string[]) ?? [],
      },
    ]),
  );

  const toInsert: NormalizedOpportunity[] = [];
  const toUpdate: Array<{ id: number; canonical_sources: string[] }> = [];

  for (const opp of batch) {
    const existing = existingHashMap.get(opp.dedup_hash);
    if (existing) {
      // Dedup hit — append source if not already present
      const sources = existing.canonical_sources;
      if (!sources.includes('federal_samgov')) {
        toUpdate.push({
          id: existing.id,
          canonical_sources: [...sources, 'federal_samgov'],
        });
      }
      dedupCount++;
    } else {
      toInsert.push(opp);
    }
  }

  // Insert new records
  if (toInsert.length > 0) {
    const rows = toInsert.map((opp) => ({
      source: opp.source,
      title: opp.title,
      agency_name: opp.agency_name,
      solicitation_number: opp.solicitation_number ?? null,
      dedup_hash: opp.dedup_hash,
      canonical_sources: opp.canonical_sources,
      naics_code: opp.naics_code ?? null,
      naics_sector: opp.naics_sector ?? null,
      contract_type: opp.contract_type,
      threshold_category: opp.threshold_category,
      set_aside_type: opp.set_aside_type ?? null,
      value_min: opp.value_min ?? null,
      value_max: opp.value_max ?? null,
      deadline: opp.deadline ?? null,
      posted_date: opp.posted_date ?? null,
      place_of_performance_city: opp.place_of_performance_city ?? null,
      place_of_performance_state: opp.place_of_performance_state ?? null,
      place_of_performance_zip: opp.place_of_performance_zip ?? null,
      description: opp.description ?? null,
      url: opp.url ?? null,
      status: opp.status,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase.from('opportunities').insert(rows);

    if (insertError) {
      const msg = `INSERT error: ${insertError.message}`;
      console.error(`[ingest/federal] ${msg}`);
      errors.push(msg);
    } else {
      newCount = toInsert.length;
      console.log(`[ingest/federal] Inserted ${newCount} new records.`);
    }
  }

  // Update canonical_sources on deduplicated records
  for (const update of toUpdate) {
    const { error: updateError } = await supabase
      .from('opportunities')
      .update({
        canonical_sources: update.canonical_sources,
        updated_at: new Date().toISOString(),
      })
      .eq('id', update.id);

    if (updateError) {
      const msg = `UPDATE canonical_sources error (id=${update.id}): ${updateError.message}`;
      console.error(`[ingest/federal] ${msg}`);
      errors.push(msg);
    }
  }

  if (toUpdate.length > 0) {
    console.log(`[ingest/federal] Updated canonical_sources on ${toUpdate.length} deduped records.`);
  }

  return { newCount, dedupCount, errors };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startMs = Date.now();

  // ---- AUTH CHECK ----
  const ingestSecret = process.env.INGEST_SECRET;
  if (!ingestSecret) {
    console.error('[ingest/federal] INGEST_SECRET env var is not set.');
    return NextResponse.json({ error: 'Server misconfiguration: INGEST_SECRET missing.' }, { status: 500 });
  }

  const providedSecret = req.headers.get('x-ingest-secret') ?? '';
  if (providedSecret !== ingestSecret) {
    console.warn('[ingest/federal] Unauthorized request — bad or missing x-ingest-secret header.');
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // ---- ENV CHECKS ----
  const apiKey = process.env.SAMGOV_API_KEY;
  if (!apiKey) {
    console.error('[ingest/federal] SAMGOV_API_KEY env var is not set.');
    return NextResponse.json({ error: 'Server misconfiguration: SAMGOV_API_KEY missing.' }, { status: 500 });
  }

  console.log('[ingest/federal] Starting SAM.gov federal ingestion...');

  // ---- FETCH FROM SAM.GOV ----
  const fetchResult = await fetchPAOpportunities(apiKey);

  console.log(
    `[ingest/federal] SAM.gov fetch complete. Fetched: ${fetchResult.totalFetched} / Available: ${fetchResult.totalAvailable}`,
  );

  if (fetchResult.errors.length > 0) {
    console.warn(`[ingest/federal] ${fetchResult.errors.length} fetch error(s):\n${fetchResult.errors.join('\n')}`);
  }

  // ---- NORMALIZE + PITTSBURGH FILTER ----
  const { normalized, filteredCount } = normalizePittsburghOpportunities(fetchResult.opportunities);

  console.log(
    `[ingest/federal] Pittsburgh filter: ${normalized.length} matches, ${filteredCount} non-Pittsburgh records excluded.`,
  );

  if (normalized.length === 0) {
    const summary: IngestSummary = {
      success: true,
      totalFetchedFromSAM: fetchResult.totalFetched,
      totalAvailableInPA: fetchResult.totalAvailable,
      pittsburghMatches: 0,
      newRecords: 0,
      deduplicatedRecords: 0,
      errorCount: fetchResult.errors.length,
      fetchErrors: fetchResult.errors,
      upsertErrors: [],
      durationMs: Date.now() - startMs,
    };
    console.log('[ingest/federal] No Pittsburgh-area opportunities found. Ingestion complete.');
    return NextResponse.json(summary, { status: 200 });
  }

  // ---- UPSERT TO SUPABASE ----
  const supabase = createServerSupabaseClient();
  let totalNew = 0;
  let totalDedup = 0;
  const allUpsertErrors: string[] = [];

  // Process in batches to avoid hitting Supabase row limits per request
  for (let i = 0; i < normalized.length; i += UPSERT_BATCH_SIZE) {
    const batch = normalized.slice(i, i + UPSERT_BATCH_SIZE);
    console.log(
      `[ingest/federal] Upserting batch ${Math.floor(i / UPSERT_BATCH_SIZE) + 1}/${Math.ceil(normalized.length / UPSERT_BATCH_SIZE)} (${batch.length} records)`,
    );

    const { newCount, dedupCount, errors } = await upsertBatch(supabase, batch);
    totalNew += newCount;
    totalDedup += dedupCount;
    allUpsertErrors.push(...errors);
  }

  const durationMs = Date.now() - startMs;
  const totalErrors = fetchResult.errors.length + allUpsertErrors.length;

  const summary: IngestSummary = {
    success: allUpsertErrors.length === 0,
    totalFetchedFromSAM: fetchResult.totalFetched,
    totalAvailableInPA: fetchResult.totalAvailable,
    pittsburghMatches: normalized.length,
    newRecords: totalNew,
    deduplicatedRecords: totalDedup,
    errorCount: totalErrors,
    fetchErrors: fetchResult.errors,
    upsertErrors: allUpsertErrors,
    durationMs,
  };

  console.log(
    `[ingest/federal] DONE — New: ${totalNew} | Deduped: ${totalDedup} | Errors: ${totalErrors} | Duration: ${durationMs}ms`,
  );

  return NextResponse.json(summary, { status: 200 });
}
