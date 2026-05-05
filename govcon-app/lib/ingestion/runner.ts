// ============================================================
// CONSOLIDATED INGESTION RUNNER (TASK_027 Phase 0/1 rewrite)
//
// Runs ONLY the data sources we can rely on:
//   - SAM.gov API (federal opportunities, PA scoped at API level)
//   - Allegheny County PAVNextGen API (local awards)
//
// Removed (TASK_027 Phase 0): pittsburgh_city, housing_authority, ura,
// pa_emarketplace, pa_treasury, education scrapers — HTML scraping is
// fundamentally unreliable for a one-person tool.
// ============================================================

import { scrapeSAMGov } from './samgov';
import { scrapeAlleghenyCounty } from './allegheny_county';
import { upsertOpportunities, upsertAwards } from '@/lib/db/upsert';
import type { ScraperResult } from './shared/normalize_shared';

export interface IngestionRunResult {
  timestamp: string;
  results: ScraperResult[];
  totalOpportunities: number;
  totalAwards: number;
  errors: string[];
  durationMs: number;
}

/**
 * Runs all configured scrapers.
 * - Opportunities → opportunities table
 * - Awards → contract_awards table
 */
export async function runFullIngestion(): Promise<IngestionRunResult> {
  const start = Date.now();
  const results: ScraperResult[] = [];
  const allErrors: string[] = [];
  let totalOpportunities = 0;
  let totalAwards = 0;

  console.log('[ingestion] Starting full ingestion run...');

  // 1. SAM.gov (Federal opportunities, PA scoped at API level)
  try {
    const samResult = await scrapeSAMGov();
    results.push(samResult);
    const { inserted, errors: upsertErrors } = await upsertOpportunities(
      samResult.opportunities,
      'federal_samgov',
    );
    totalOpportunities += inserted;
    allErrors.push(...samResult.errors, ...upsertErrors);
    console.log(`[ingestion] SAM.gov: ${inserted} opportunities saved`);
  } catch (err) {
    const msg = `SAM.gov failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[ingestion] ${msg}`);
    allErrors.push(msg);
  }

  // 2. Allegheny County (Historical awards)
  try {
    const alleghenyResult = await scrapeAlleghenyCounty();
    results.push(alleghenyResult);
    const awards = (alleghenyResult as any).awards || [];
    if (awards.length > 0) {
      const { inserted, errors: upsertErrors } = await upsertAwards(awards, 'local_allegheny');
      totalAwards += inserted;
      allErrors.push(...alleghenyResult.errors, ...upsertErrors);
      console.log(`[ingestion] Allegheny County: ${inserted} awards saved`);
    } else {
      allErrors.push(...alleghenyResult.errors);
    }
  } catch (err) {
    const msg = `Allegheny County failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[ingestion] ${msg}`);
    allErrors.push(msg);
  }

  const durationMs = Date.now() - start;
  console.log(`[ingestion] Run complete: ${totalOpportunities} opps, ${totalAwards} awards, ${allErrors.length} errors, ${durationMs}ms`);

  return {
    timestamp: new Date().toISOString(),
    results,
    totalOpportunities,
    totalAwards,
    errors: allErrors,
    durationMs,
  };
}

/**
 * Runs only federal sources (SAM.gov). Called by cron every 6h.
 */
export async function runFederalIngestion(): Promise<ScraperResult> {
  return await scrapeSAMGov();
}

/**
 * Runs only local sources (Allegheny County awards).
 */
export async function runLocalIngestion(): Promise<IngestionRunResult> {
  const start = Date.now();
  const results: ScraperResult[] = [];
  const allErrors: string[] = [];
  let totalOpportunities = 0;
  let totalAwards = 0;

  try {
    const alleghenyResult = await scrapeAlleghenyCounty();
    results.push(alleghenyResult);
    totalAwards += (alleghenyResult as any).awards?.length ?? 0;
    allErrors.push(...alleghenyResult.errors);
  } catch (err) {
    allErrors.push(`Allegheny County: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    timestamp: new Date().toISOString(),
    results,
    totalOpportunities,
    totalAwards,
    errors: allErrors,
    durationMs: Date.now() - start,
  };
}
