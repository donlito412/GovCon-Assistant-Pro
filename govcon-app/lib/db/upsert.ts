// ============================================================
// DATABASE UPSERT OPERATIONS
// Saves scraped data to Supabase tables
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase';
import type { ScrapedOpportunity } from '@/lib/ingestion/shared/normalize_shared';

/**
 * Upserts opportunities to the database
 * Uses dedup_hash to prevent duplicates
 */
export async function upsertOpportunities(
  opportunities: ScrapedOpportunity[],
  source: string
): Promise<{ inserted: number; errors: string[] }> {
  const supabase = createServerSupabaseClient();
  const errors: string[] = [];
  let inserted = 0;
  
  if (opportunities.length === 0) {
    return { inserted: 0, errors };
  }
  
  console.log(`[upsert] Upserting ${opportunities.length} opportunities from ${source}...`);
  
  // Prepare data for upsert
  const records = opportunities.map(opp => ({
    source: opp.source,
    title: opp.title,
    agency_name: opp.agency_name,
    solicitation_number: opp.solicitation_number,
    dedup_hash: opp.dedup_hash,
    canonical_sources: opp.canonical_sources,
    naics_code: opp.naics_code,
    naics_sector: opp.naics_sector,
    contract_type: opp.contract_type,
    threshold_category: opp.threshold_category,
    set_aside_type: opp.set_aside_type,
    value_min: opp.value_min,
    value_max: opp.value_max,
    deadline: opp.deadline,
    posted_date: opp.posted_date,
    place_of_performance_city: opp.place_of_performance_city,
    place_of_performance_state: opp.place_of_performance_state,
    place_of_performance_zip: opp.place_of_performance_zip,
    description: opp.description,
    url: opp.url,
    status: opp.status,
  }));
  
  // Upsert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('opportunities')
      .upsert(batch, {
        onConflict: 'dedup_hash',
        ignoreDuplicates: false,
      });
    
    if (error) {
      console.error(`[upsert] Batch ${i}-${i + batch.length} failed:`, error);
      errors.push(`Batch ${i}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }
  
  console.log(`[upsert] Inserted/updated ${inserted} opportunities from ${source}`);
  return { inserted, errors };
}

/**
 * Interface for scraped awards (from Allegheny County, etc.)
 */
interface ScrapedAward {
  source: string;
  title: string;
  agency_name: string;
  solicitation_number?: string;
  dedup_hash: string;
  canonical_sources: string[];
  naics_code?: number;
  naics_sector?: string;
  contract_type: string;
  award_date?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  vendor_name?: string;
  vendor_uei?: string;
  total_value?: number;
  place_of_performance_city: string;
  place_of_performance_state: string;
  description: string;
  url: string;
  status: 'awarded';
}

/**
 * Upserts awards to the contract_awards table
 */
export async function upsertAwards(
  awards: ScrapedAward[],
  source: string
): Promise<{ inserted: number; errors: string[] }> {
  const supabase = createServerSupabaseClient();
  const errors: string[] = [];
  let inserted = 0;
  
  if (awards.length === 0) {
    return { inserted: 0, errors };
  }
  
  console.log(`[upsert] Upserting ${awards.length} awards from ${source}...`);
  
  // Prepare data for upsert
  const records = awards.map(award => ({
    source: award.source,
    title: award.title,
    agency_name: award.agency_name,
    solicitation_number: award.solicitation_number,
    dedup_hash: award.dedup_hash,
    canonical_sources: award.canonical_sources,
    naics_code: award.naics_code,
    naics_sector: award.naics_sector,
    contract_type: award.contract_type,
    award_date: award.award_date,
    contract_start_date: award.contract_start_date,
    contract_end_date: award.contract_end_date,
    vendor_name: award.vendor_name,
    vendor_uei: award.vendor_uei,
    total_value: award.total_value,
    place_of_performance_city: award.place_of_performance_city,
    place_of_performance_state: award.place_of_performance_state,
    description: award.description,
    url: award.url,
    status: award.status,
  }));
  
  // Upsert in batches
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('contract_awards')
      .upsert(batch, {
        onConflict: 'dedup_hash',
        ignoreDuplicates: false,
      });
    
    if (error) {
      console.error(`[upsert] Awards batch ${i}-${i + batch.length} failed:`, error);
      errors.push(`Batch ${i}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }
  
  console.log(`[upsert] Inserted/updated ${inserted} awards from ${source}`);
  return { inserted, errors };
}

/**
 * Deletes old records from a source before inserting new ones
 * Useful for sources that don't have stable dedup hashes
 */
export async function clearSourceData(source: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  
  console.log(`[upsert] Clearing old data for source: ${source}`);
  
  // Delete from opportunities
  await supabase
    .from('opportunities')
    .delete()
    .eq('source', source);
  
  // Delete from awards
  await supabase
    .from('contract_awards')
    .delete()
    .eq('source', source);
}
