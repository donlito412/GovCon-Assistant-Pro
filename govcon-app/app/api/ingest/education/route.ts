export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/ingest/education
// Runs all 5 education scrapers in parallel, upserts to Supabase.
// Secured by x-ingest-secret header.
// Called by Netlify cron daily at 07:30 ET.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { computeDedupHash } from '@/lib/ingestion/shared/normalize_education';
import { scrapePitt }       from '@/lib/ingestion/education/pitt';
import { scrapeCmu }        from '@/lib/ingestion/education/cmu';
import { scrapeCcac }       from '@/lib/ingestion/education/ccac';
import { scrapePghSchools } from '@/lib/ingestion/education/pgh_schools';
import { scrapeDuquesne }   from '@/lib/ingestion/education/duquesne';
import type { ScrapedOpportunity } from '@/lib/ingestion/shared/normalize_education';

const INGEST_SECRET = process.env.INGEST_SECRET ?? '';
const UPSERT_BATCH  = 50;
const SCRAPER_TIMEOUT_MS = 8_000; // 8 seconds per scraper to avoid Vercel 10s limit

/**
 * Wraps a scraper function with a timeout to prevent Vercel function timeout.
 * If the scraper times out, returns an empty result instead of blocking all scrapers.
 */
async function scrapeWithTimeout<T extends { source: string; opportunities: any[]; errors: string[]; durationMs: number }>(
  scraperFn: () => Promise<T>,
  sourceName: string
): Promise<T> {
  const start = Date.now();
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Scraper timeout after ${SCRAPER_TIMEOUT_MS}ms`)), SCRAPER_TIMEOUT_MS);
    });

    const result = await Promise.race([scraperFn(), timeoutPromise]);
    const durationMs = Date.now() - start;
    console.log(`[ingest/education] ${sourceName} completed in ${durationMs}ms (${result.opportunities.length} opportunities)`);
    return { ...result, durationMs };
  } catch (error) {
    const durationMs = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[ingest/education] ${sourceName} failed after ${durationMs}ms: ${errorMsg}`);
    return {
      source: sourceName,
      opportunities: [],
      errors: [errorMsg],
      durationMs,
    } as unknown as T;
  }
}

async function upsertBatch(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  batch: ScrapedOpportunity[],
): Promise<{ inserted: number; deduped: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;
  let deduped = 0;

  for (const opp of batch) {
    try {
      // Check for existing record by dedup_hash
      const { data: existing } = await supabase
        .from('opportunities')
        .select('id, canonical_sources')
        .eq('dedup_hash', opp.dedup_hash)
        .maybeSingle();

      if (existing) {
        // Append source to canonical_sources if not already present
        const sources: string[] = existing.canonical_sources ?? [];
        if (!sources.includes(opp.source)) {
          await supabase
            .from('opportunities')
            .update({ canonical_sources: [...sources, opp.source] })
            .eq('id', existing.id);
        }
        deduped++;
        continue;
      }

      // Insert new record
      const { error } = await supabase.from('opportunities').insert({
        source:                     opp.source,
        title:                      opp.title,
        agency_name:                opp.agency_name,
        solicitation_number:        opp.solicitation_number ?? null,
        dedup_hash:                 opp.dedup_hash,
        canonical_sources:          opp.canonical_sources,
        naics_code:                 opp.naics_code ?? null,
        naics_sector:               opp.naics_sector ?? null,
        contract_type:              opp.contract_type,
        threshold_category:         opp.threshold_category,
        set_aside_type:             opp.set_aside_type ?? null,
        value_min:                  opp.value_min ?? null,
        value_max:                  opp.value_max ?? null,
        deadline:                   opp.deadline ?? null,
        posted_date:                opp.posted_date ?? null,
        place_of_performance_city:  opp.place_of_performance_city ?? 'Pittsburgh',
        place_of_performance_state: opp.place_of_performance_state ?? 'PA',
        place_of_performance_zip:   opp.place_of_performance_zip ?? null,
        description:                opp.description ?? null,
        url:                        opp.url ?? null,
        status:                     opp.status,
        category:                   'education',
      });

      if (error) {
        if (error.code === '23505') { deduped++; } // unique constraint
        else errors.push(`Insert error (${opp.title.slice(0, 40)}): ${error.message}`);
      } else {
        inserted++;
      }
    } catch (err) {
      errors.push(`Upsert fatal (${opp.title.slice(0, 40)}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { inserted, deduped, errors };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth check
  const secret = req.headers.get('x-ingest-secret') ?? '';
  if (INGEST_SECRET && secret !== INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const runStart = Date.now();

  console.log('[ingest/education] Starting all scrapers…');

  // Run all 5 scrapers in parallel with timeout guards — one failure doesn't block others
  console.log('[ingest/education] Starting all scrapers with timeout guards...');
  const [pittResult, cmuResult, ccacResult, pghSchoolsResult, duqResult] = await Promise.allSettled([
    scrapeWithTimeout(() => scrapePitt(), 'education_pitt'),
    scrapeWithTimeout(() => scrapeCmu(), 'education_cmu'),
    scrapeWithTimeout(() => scrapeCcac(), 'education_ccac'),
    scrapeWithTimeout(() => scrapePghSchools(), 'education_pgh_schools'),
    scrapeWithTimeout(() => scrapeDuquesne(), 'education_duquesne'),
  ]);

  const results = [pittResult, cmuResult, ccacResult, pghSchoolsResult, duqResult].map((r) =>
    r.status === 'fulfilled' ? r.value : {
      source: 'unknown',
      opportunities: [],
      errors: [r.reason instanceof Error ? r.reason.message : String(r.reason)],
      durationMs: 0,
    }
  );

  // Aggregate all opportunities
  const allOpps: ScrapedOpportunity[] = results.flatMap((r) => r.opportunities);
  console.log(`[ingest/education] Total scraped: ${allOpps.length}`);

  // Upsert in batches
  let totalInserted = 0;
  let totalDeduped  = 0;
  const allErrors:   string[] = [];

  for (let i = 0; i < allOpps.length; i += UPSERT_BATCH) {
    const batch = allOpps.slice(i, i + UPSERT_BATCH);
    const { inserted, deduped, errors } = await upsertBatch(supabase, batch);
    totalInserted += inserted;
    totalDeduped  += deduped;
    allErrors.push(...errors);
  }

  // Per-source summary
  const summary = results.map((r) => ({
    source:   r.source,
    scraped:  r.opportunities.length,
    errors:   r.errors,
    durationMs: r.durationMs,
  }));

  const totalMs = Date.now() - runStart;
  console.log(`[ingest/education] Done — inserted: ${totalInserted}, deduped: ${totalDeduped}, errors: ${allErrors.length} (${totalMs}ms)`);

  return NextResponse.json({
    records_upserted: totalInserted,
    deduped:          totalDeduped,
    scrape_errors:    allErrors.length,
    total_duration_ms: totalMs,
    sources: summary,
  }, { status: 200 });
}

// Also support GET for cron trigger (Netlify scheduled functions call GET)
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = req.headers.get('x-netlify-scheduled-function-secret') ?? '';
  const envSecret  = process.env.CRON_SECRET ?? '';
  if (envSecret && cronSecret !== envSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return POST(req);
}
