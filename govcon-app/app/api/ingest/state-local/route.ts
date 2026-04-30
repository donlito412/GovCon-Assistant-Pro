// ============================================================
// POST /api/ingest/state-local
// Runs all 4 state/local scrapers sequentially.
// Each scraper failure is isolated — others continue.
// Secured with x-ingest-secret header.
// Called by Netlify cron daily at 07:00 ET.
//
// Scrapers:
//   1. PA eMarketplace  (state_pa_emarketplace)
//   2. PA Treasury      (state_pa_treasury)
//   3. Allegheny County (local_allegheny)
//   4. City of PGH      (local_pittsburgh)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { scrapeEMarketplace } from '../../../../lib/ingestion/pa_emarketplace';
import { scrapePaTreasury } from '../../../../lib/ingestion/pa_treasury';
import { scrapeAlleghenyCounty } from '../../../../lib/ingestion/allegheny_county';
import { scrapePittsburghCity } from '../../../../lib/ingestion/pittsburgh_city';
import type { ScrapedOpportunity, ScraperResult } from '../../../../lib/ingestion/shared/normalize_shared';
import type { OpportunitySource } from '@/lib/types';

const UPSERT_BATCH_SIZE = 50;

interface ScraperSummary {
  source: OpportunitySource;
  totalScraped: number;
  newRecords: number;
  deduplicatedRecords: number;
  errors: string[];
  durationMs: number;
}

interface IngestSummary {
  success: boolean;
  scrapers: ScraperSummary[];
  totalNew: number;
  totalDeduped: number;
  totalErrors: number;
  durationMs: number;
}

// ============================================================
// UPSERT HELPERS
// ============================================================

/**
 * Checks existing dedup_hashes and solicitation_numbers to identify duplicates.
 * Returns sets of existing hashes and solicitation_numbers per source.
 */
async function getExistingKeys(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  hashes: string[],
  source: OpportunitySource,
  solicitationNumbers: string[],
): Promise<{
  existingHashMap: Map<string, { id: number; canonical_sources: string[] }>;
  existingSolNums: Set<string>;
}> {
  const existingHashMap = new Map<string, { id: number; canonical_sources: string[] }>();
  const existingSolNums = new Set<string>();

  if (hashes.length > 0) {
    const { data: byHash } = await supabase
      .from('opportunities')
      .select('id, dedup_hash, canonical_sources')
      .in('dedup_hash', hashes);

    for (const row of byHash ?? []) {
      existingHashMap.set(row.dedup_hash as string, {
        id: row.id as number,
        canonical_sources: (row.canonical_sources as string[]) ?? [],
      });
    }
  }

  const filteredSolNums = solicitationNumbers.filter(Boolean);
  if (filteredSolNums.length > 0) {
    const { data: bySol } = await supabase
      .from('opportunities')
      .select('solicitation_number')
      .eq('source', source)
      .in('solicitation_number', filteredSolNums);

    for (const row of bySol ?? []) {
      if (row.solicitation_number) existingSolNums.add(row.solicitation_number as string);
    }
  }

  return { existingHashMap, existingSolNums };
}

/**
 * Upserts a batch of scraped opportunities into Supabase.
 * Deduplicates on dedup_hash (primary) and solicitation_number within same source (secondary).
 */
async function upsertBatch(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  batch: ScrapedOpportunity[],
): Promise<{ newCount: number; dedupCount: number; errors: string[] }> {
  const errors: string[] = [];
  let newCount = 0;
  let dedupCount = 0;

  const hashes = batch.map((o) => o.dedup_hash);
  const solNums = batch.map((o) => o.solicitation_number ?? '').filter(Boolean);

  const source = batch[0]?.source;
  if (!source) return { newCount: 0, dedupCount: 0, errors: ['Empty batch'] };

  const { existingHashMap, existingSolNums } = await getExistingKeys(supabase, hashes, source, solNums);

  const toInsert: ScrapedOpportunity[] = [];
  const toUpdate: Array<{ id: number; canonical_sources: string[] }> = [];

  for (const opp of batch) {
    // Primary dedup: hash match
    const existing = existingHashMap.get(opp.dedup_hash);
    if (existing) {
      const sources = existing.canonical_sources;
      if (!sources.includes(opp.source)) {
        toUpdate.push({ id: existing.id, canonical_sources: [...sources, opp.source] });
      }
      dedupCount++;
      continue;
    }

    // Secondary dedup: solicitation_number within same source
    if (opp.solicitation_number && existingSolNums.has(opp.solicitation_number)) {
      dedupCount++;
      continue;
    }

    toInsert.push(opp);
  }

  // Insert new records
  if (toInsert.length > 0) {
    const rows = toInsert.map((opp) => ({
      source: opp.source,
      title: opp.title,
      agency_name: opp.agency_name,
      solicitation_number: opp.solicitation_number ?? null,
      dedup_hash: opp.dedup_hash,
      canonical_sources: JSON.stringify(opp.canonical_sources),
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
      const msg = `INSERT error (${source}): ${insertError.message}`;
      console.error(`[ingest/state-local] ${msg}`);
      errors.push(msg);
    } else {
      newCount = toInsert.length;
      console.log(`[ingest/state-local] Inserted ${newCount} new records for ${source}.`);
    }
  }

  // Update canonical_sources on deduped records
  for (const update of toUpdate) {
    const { error: updateError } = await supabase
      .from('opportunities')
      .update({
        canonical_sources: JSON.stringify(update.canonical_sources),
        updated_at: new Date().toISOString(),
      })
      .eq('id', update.id);

    if (updateError) {
      const msg = `UPDATE error (id=${update.id}): ${updateError.message}`;
      console.error(`[ingest/state-local] ${msg}`);
      errors.push(msg);
    }
  }

  if (toUpdate.length > 0) {
    console.log(`[ingest/state-local] Updated canonical_sources on ${toUpdate.length} deduped record(s) for ${source}.`);
  }

  return { newCount, dedupCount, errors };
}

/**
 * Runs upsert for all opportunities from one scraper result.
 */
async function upsertScraperResult(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  result: ScraperResult,
): Promise<{ newCount: number; dedupCount: number; upsertErrors: string[] }> {
  let newCount = 0;
  let dedupCount = 0;
  const upsertErrors: string[] = [];

  const { opportunities, source } = result;
  const totalBatches = Math.ceil(opportunities.length / UPSERT_BATCH_SIZE);

  for (let i = 0; i < opportunities.length; i += UPSERT_BATCH_SIZE) {
    const batch = opportunities.slice(i, i + UPSERT_BATCH_SIZE);
    const batchNum = Math.floor(i / UPSERT_BATCH_SIZE) + 1;
    console.log(`[ingest/state-local] ${source}: Upserting batch ${batchNum}/${totalBatches} (${batch.length} records)`);

    const { newCount: n, dedupCount: d, errors } = await upsertBatch(supabase, batch);
    newCount += n;
    dedupCount += d;
    upsertErrors.push(...errors);
  }

  return { newCount, dedupCount, upsertErrors };
}

// ============================================================
// ROUTE HANDLER
// ============================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startMs = Date.now();

  // ---- AUTH ----
  const ingestSecret = process.env.INGEST_SECRET;
  if (!ingestSecret) {
    return NextResponse.json({ error: 'Server misconfiguration: INGEST_SECRET missing.' }, { status: 500 });
  }
  if (req.headers.get('x-ingest-secret') !== ingestSecret) {
    console.warn('[ingest/state-local] Unauthorized request.');
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  console.log('[ingest/state-local] Starting state/local ingestion run...');

  const supabase = createServerSupabaseClient();
  const scraperSummaries: ScraperSummary[] = [];

  // Define all scrapers — run sequentially so failures are isolated
  const scraperDefs: Array<{ label: string; fn: () => Promise<ScraperResult> }> = [
    { label: 'PA eMarketplace', fn: scrapeEMarketplace },
    { label: 'PA Treasury', fn: scrapePaTreasury },
    { label: 'Allegheny County', fn: scrapeAlleghenyCounty },
    { label: 'City of Pittsburgh', fn: scrapePittsburghCity },
  ];

  let totalNew = 0;
  let totalDeduped = 0;
  let totalErrors = 0;

  for (const def of scraperDefs) {
    console.log(`\n[ingest/state-local] ---- Running: ${def.label} ----`);

    let result: ScraperResult;
    try {
      result = await def.fn();
    } catch (err) {
      const msg = `Scraper "${def.label}" threw uncaught error: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[ingest/state-local] ${msg}`);
      scraperSummaries.push({
        source: 'other',
        totalScraped: 0,
        newRecords: 0,
        deduplicatedRecords: 0,
        errors: [msg],
        durationMs: 0,
      });
      totalErrors++;
      continue;
    }

    console.log(
      `[ingest/state-local] ${def.label}: ${result.opportunities.length} scraped, ${result.errors.length} scrape errors`,
    );

    // Upsert to Supabase
    let newCount = 0;
    let dedupCount = 0;
    let upsertErrors: string[] = [];

    if (result.opportunities.length > 0) {
      ({ newCount, dedupCount, upsertErrors } = await upsertScraperResult(supabase, result));
    }

    totalNew += newCount;
    totalDeduped += dedupCount;
    totalErrors += result.errors.length + upsertErrors.length;

    scraperSummaries.push({
      source: result.source,
      totalScraped: result.opportunities.length,
      newRecords: newCount,
      deduplicatedRecords: dedupCount,
      errors: [...result.errors, ...upsertErrors],
      durationMs: result.durationMs,
    });

    console.log(
      `[ingest/state-local] ${def.label} complete: new=${newCount} deduped=${dedupCount} errors=${result.errors.length + upsertErrors.length}`,
    );
  }

  const durationMs = Date.now() - startMs;

  const summary: IngestSummary = {
    success: totalErrors === 0,
    scrapers: scraperSummaries,
    totalNew,
    totalDeduped,
    totalErrors,
    durationMs,
  };

  console.log(
    `\n[ingest/state-local] ALL DONE — New: ${totalNew} | Deduped: ${totalDeduped} | Errors: ${totalErrors} | ${durationMs}ms`,
  );

  return NextResponse.json(summary, { status: 200 });
}
