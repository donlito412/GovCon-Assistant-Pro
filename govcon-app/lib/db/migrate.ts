// ============================================================
// DATABASE MIGRATION UTILITY
// Runs on startup to ensure schema is correct
// Creates awards table if it doesn't exist
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Checks if the awards table exists
 */
async function awardsTableExists(): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('contract_awards')
      .select('id')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
}

/**
 * Creates the awards table and migrates data
 * This runs automatically on first deploy
 */
export async function runStartupMigration(): Promise<{
  success: boolean;
  message: string;
  awardsTableCreated?: boolean;
  alleghenyDataMigrated?: boolean;
}> {
  console.log('[migrate] Checking database schema...');
  
  const supabase = createServerSupabaseClient();
  
  try {
    // Check if awards table exists
    const tableExists = await awardsTableExists();
    
    if (tableExists) {
      console.log('[migrate] Awards table already exists, skipping migration.');
      return {
        success: true,
        message: 'Awards table already exists',
        awardsTableCreated: false,
        alleghenyDataMigrated: false,
      };
    }
    
    console.log('[migrate] Awards table missing. Running migration...');
    
    // Create awards table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS contract_awards (
        id BIGSERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        title TEXT NOT NULL,
        agency_id BIGINT REFERENCES agencies(id),
        agency_name TEXT,
        solicitation_number TEXT,
        award_date TIMESTAMPTZ,
        award_amount BIGINT,
        awardee_name TEXT,
        awardee_uei TEXT,
        contract_start_date TIMESTAMPTZ,
        contract_end_date TIMESTAMPTZ,
        naics_code INTEGER,
        naics_sector TEXT,
        contract_type TEXT,
        set_aside_type TEXT,
        place_of_performance_city TEXT,
        place_of_performance_state TEXT,
        place_of_performance_zip TEXT,
        place_of_performance_county TEXT,
        description TEXT,
        url TEXT,
        usaspending_award_id TEXT UNIQUE,
        status TEXT DEFAULT 'awarded',
        external_id TEXT UNIQUE,
        dedup_hash TEXT UNIQUE,
        canonical_sources JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_awards_source ON contract_awards(source);
      CREATE INDEX IF NOT EXISTS idx_awards_agency ON contract_awards(agency_id);
      CREATE INDEX IF NOT EXISTS idx_awards_award_date ON contract_awards(award_date);
      CREATE INDEX IF NOT EXISTS idx_awards_awardee ON contract_awards(awardee_name);
      CREATE INDEX IF NOT EXISTS idx_awards_naics ON contract_awards(naics_code);
      CREATE INDEX IF NOT EXISTS idx_awards_end_date ON contract_awards(contract_end_date);
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (createError) {
      // Try direct SQL if RPC not available
      console.log('[migrate] RPC failed, trying direct query...');
      // We'll need to run this manually in Supabase dashboard
      return {
        success: false,
        message: `Failed to create awards table: ${createError.message}. Please run supabase_awards_schema.sql manually.`,
        awardsTableCreated: false,
        alleghenyDataMigrated: false,
      };
    }
    
    console.log('[migrate] Awards table created successfully.');
    
    // Migrate Allegheny County data from opportunities
    console.log('[migrate] Migrating Allegheny County data...');
    
    const { data: alleghenyData, error: fetchError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('source', 'local_allegheny');
    
    if (fetchError) {
      console.error('[migrate] Failed to fetch Allegheny data:', fetchError);
      return {
        success: true,
        message: 'Awards table created but data migration failed. Run manually.',
        awardsTableCreated: true,
        alleghenyDataMigrated: false,
      };
    }
    
    if (alleghenyData && alleghenyData.length > 0) {
      // Transform and insert into awards
      const awards = alleghenyData.map((opp: any) => ({
        source: opp.source,
        title: opp.title,
        agency_name: opp.agency_name,
        solicitation_number: opp.solicitation_number,
        award_date: opp.posted_date,
        contract_start_date: opp.posted_date,
        contract_end_date: opp.deadline,
        awardee_name: opp.description?.match(/Vendor:\s*([^\.]+)/)?.[1]?.trim() || null,
        place_of_performance_city: opp.place_of_performance_city,
        place_of_performance_state: opp.place_of_performance_state,
        description: opp.description,
        url: opp.url,
        status: 'awarded',
        dedup_hash: opp.dedup_hash,
        canonical_sources: opp.canonical_sources,
      }));
      
      const { error: insertError } = await supabase
        .from('contract_awards')
        .upsert(awards, { onConflict: 'dedup_hash' });
      
      if (insertError) {
        console.error('[migrate] Failed to insert awards:', insertError);
        return {
          success: true,
          message: 'Awards table created but data insert failed.',
          awardsTableCreated: true,
          alleghenyDataMigrated: false,
        };
      }
      
      // Delete migrated records from opportunities
      const { error: deleteError } = await supabase
        .from('opportunities')
        .delete()
        .eq('source', 'local_allegheny');
      
      if (deleteError) {
        console.warn('[migrate] Failed to delete old Allegheny data:', deleteError);
      }
      
      console.log(`[migrate] Migrated ${awards.length} Allegheny County records to awards.`);
      
      return {
        success: true,
        message: `Migration complete. Created awards table and migrated ${awards.length} records.`,
        awardsTableCreated: true,
        alleghenyDataMigrated: true,
      };
    } else {
      console.log('[migrate] No Allegheny data to migrate.');
      return {
        success: true,
        message: 'Awards table created. No Allegheny data to migrate.',
        awardsTableCreated: true,
        alleghenyDataMigrated: false,
      };
    }
    
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[migrate] Unexpected error:', msg);
    return {
      success: false,
      message: `Migration failed: ${msg}`,
      awardsTableCreated: false,
      alleghenyDataMigrated: false,
    };
  }
}
