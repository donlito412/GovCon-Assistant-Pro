// ============================================================
// CONSOLIDATED INGESTION RUNNER
// Runs all scrapers and upserts to appropriate tables
// Similar to GovTribe's automated data pipeline
// ============================================================

import { scrapeSAMGov } from './samgov';
import { scrapeAlleghenyCounty } from './allegheny_county';
import { scrapePittsburghCity } from './pittsburgh_city';
import { scrapeHousingAuthority } from './housing_authority';
import { scrapeURA } from './ura';
import { upsertOpportunities, upsertAwards } from '@/lib/db/upsert';
import type { ScraperResult, ScrapedOpportunity } from './shared/normalize_shared';

export interface IngestionRunResult {
  timestamp: string;
  results: ScraperResult[];
  totalOpportunities: number;
  totalAwards: number;
  errors: string[];
  durationMs: number;
}

/**
 * Runs all configured scrapers
 * - Opportunities go to 'opportunities' table (active solicitations)
 * - Awards go to 'contract_awards' table (historical contracts)
 */
export async function runFullIngestion(): Promise<IngestionRunResult> {
  const start = Date.now();
  const results: ScraperResult[] = [];
  const allErrors: string[] = [];
  let totalOpportunities = 0;
  let totalAwards = 0;
  
  console.log('[ingestion] Starting full ingestion run...');
  
  // 1. SAM.gov (Federal opportunities - Pittsburgh MSA)
  console.log('[ingestion] Running SAM.gov scraper...');
  try {
    const samResult = await scrapeSAMGov();
    results.push(samResult);
    
    // Save to database
    const { inserted, errors: upsertErrors } = await upsertOpportunities(
      samResult.opportunities,
      'federal_samgov'
    );
    totalOpportunities += inserted;
    allErrors.push(...samResult.errors, ...upsertErrors);
    console.log(`[ingestion] SAM.gov: ${inserted} opportunities saved`);
  } catch (err) {
    const msg = `SAM.gov failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[ingestion] ${msg}`);
    allErrors.push(msg);
  }
  
  // 2. Allegheny County (Historical awards - goes to awards table)
  console.log('[ingestion] Running Allegheny County scraper...');
  try {
    const alleghenyResult = await scrapeAlleghenyCounty();
    results.push(alleghenyResult);
    
    // Save awards to database
    const awards = (alleghenyResult as any).awards || [];
    if (awards.length > 0) {
      const { inserted, errors: upsertErrors } = await upsertAwards(awards, 'local_allegheny');
      totalAwards += inserted;
      allErrors.push(...alleghenyResult.errors, ...upsertErrors);
      console.log(`[ingestion] Allegheny County: ${inserted} awards saved`);
    } else {
      allErrors.push(...alleghenyResult.errors);
      console.log(`[ingestion] Allegheny County: 0 awards to save`);
    }
  } catch (err) {
    const msg = `Allegheny County failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[ingestion] ${msg}`);
    allErrors.push(msg);
  }
  
  // 3. City of Pittsburgh (Active solicitations)
  console.log('[ingestion] Running Pittsburgh City scraper...');
  try {
    const pghResult = await scrapePittsburghCity();
    results.push(pghResult);
    
    // Save to database
    const { inserted, errors: upsertErrors } = await upsertOpportunities(
      pghResult.opportunities,
      'local_pittsburgh'
    );
    totalOpportunities += inserted;
    allErrors.push(...pghResult.errors, ...upsertErrors);
    console.log(`[ingestion] Pittsburgh City: ${inserted} opportunities saved`);
  } catch (err) {
    const msg = `Pittsburgh City failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[ingestion] ${msg}`);
    allErrors.push(msg);
  }
  
  // 4. Housing Authority of Pittsburgh
  console.log('[ingestion] Running Housing Authority scraper...');
  try {
    const hacpResult = await scrapeHousingAuthority();
    results.push(hacpResult);
    
    // Save to database
    const { inserted, errors: upsertErrors } = await upsertOpportunities(
      hacpResult.opportunities,
      'local_housing_authority'
    );
    totalOpportunities += inserted;
    allErrors.push(...hacpResult.errors, ...upsertErrors);
    console.log(`[ingestion] Housing Authority: ${inserted} opportunities saved`);
  } catch (err) {
    const msg = `Housing Authority failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[ingestion] ${msg}`);
    allErrors.push(msg);
  }
  
  // 5. URA (Urban Redevelopment Authority)
  console.log('[ingestion] Running URA scraper...');
  try {
    const uraResult = await scrapeURA();
    results.push(uraResult);
    
    // Save to database
    const { inserted, errors: upsertErrors } = await upsertOpportunities(
      uraResult.opportunities,
      'local_ura'
    );
    totalOpportunities += inserted;
    allErrors.push(...uraResult.errors, ...upsertErrors);
    console.log(`[ingestion] URA: ${inserted} opportunities saved`);
  } catch (err) {
    const msg = `URA failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[ingestion] ${msg}`);
    allErrors.push(msg);
  }
  
  const durationMs = Date.now() - start;
  
  console.log('[ingestion] Run complete:');
  console.log(`  - Opportunities: ${totalOpportunities}`);
  console.log(`  - Awards: ${totalAwards}`);
  console.log(`  - Errors: ${allErrors.length}`);
  console.log(`  - Duration: ${durationMs}ms`);
  
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
 * Runs only federal sources (SAM.gov)
 * Called by cron job every 6 hours
 */
export async function runFederalIngestion(): Promise<ScraperResult> {
  console.log('[ingestion] Running federal ingestion (SAM.gov only)...');
  return await scrapeSAMGov();
}

/**
 * Runs only local sources
 * Called by cron job daily
 */
export async function runLocalIngestion(): Promise<IngestionRunResult> {
  const start = Date.now();
  const results: ScraperResult[] = [];
  const allErrors: string[] = [];
  let totalOpportunities = 0;
  let totalAwards = 0;
  
  console.log('[ingestion] Starting local ingestion...');
  
  // Allegheny County (awards)
  try {
    const alleghenyResult = await scrapeAlleghenyCounty();
    results.push(alleghenyResult);
    totalAwards += (alleghenyResult as any).awards?.length ?? 0;
    allErrors.push(...alleghenyResult.errors);
  } catch (err) {
    allErrors.push(`Allegheny County: ${err instanceof Error ? err.message : String(err)}`);
  }
  
  // Pittsburgh City
  try {
    const pghResult = await scrapePittsburghCity();
    results.push(pghResult);
    totalOpportunities += pghResult.opportunities.length;
    allErrors.push(...pghResult.errors);
  } catch (err) {
    allErrors.push(`Pittsburgh City: ${err instanceof Error ? err.message : String(err)}`);
  }
  
  // Housing Authority
  try {
    const hacpResult = await scrapeHousingAuthority();
    results.push(hacpResult);
    totalOpportunities += hacpResult.opportunities.length;
    allErrors.push(...hacpResult.errors);
  } catch (err) {
    allErrors.push(`Housing Authority: ${err instanceof Error ? err.message : String(err)}`);
  }
  
  // URA
  try {
    const uraResult = await scrapeURA();
    results.push(uraResult);
    totalOpportunities += uraResult.opportunities.length;
    allErrors.push(...uraResult.errors);
  } catch (err) {
    allErrors.push(`URA: ${err instanceof Error ? err.message : String(err)}`);
  }
  
  const durationMs = Date.now() - start;
  
  return {
    timestamp: new Date().toISOString(),
    results,
    totalOpportunities,
    totalAwards,
    errors: allErrors,
    durationMs,
  };
}
