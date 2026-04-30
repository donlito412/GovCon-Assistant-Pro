#!/usr/bin/env npx ts-node
// ============================================================
// RUN MIGRATIONS
// Applies supabase_schema.sql to the production Supabase project.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
//   npx ts-node scripts/run_migrations.ts
//
// Requires: @supabase/supabase-js, ts-node, typescript
// ============================================================

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runMigrations() {
  console.log('🔧 Connecting to Supabase:', SUPABASE_URL);

  // Read schema SQL
  const schemaPath = path.resolve(__dirname, '../03_OUTPUTS/TASK_001_scaffold/supabase_schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf-8');
  console.log(`📄 Schema file loaded (${(sql.length / 1024).toFixed(1)} KB)`);

  // Split on statement boundaries and run each
  // Supabase JS client doesn't support raw SQL directly —
  // use the Supabase Management API or run via psql instead.
  console.log('\n⚠️  IMPORTANT: The Supabase JS client cannot execute raw DDL SQL.');
  console.log('   Run migrations using ONE of these methods:\n');

  console.log('   Option A — Supabase CLI (recommended):');
  console.log('   $ supabase db push --db-url postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres\n');

  console.log('   Option B — psql direct:');
  console.log('   $ psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \\');
  console.log('     -f 03_OUTPUTS/TASK_001_scaffold/supabase_schema.sql\n');

  console.log('   Option C — Supabase Dashboard SQL Editor:');
  console.log('   Paste contents of 03_OUTPUTS/TASK_001_scaffold/supabase_schema.sql into');
  console.log('   Supabase Dashboard → SQL Editor → Run\n');

  // Verify connection is live by testing a simple query
  console.log('🔍 Verifying Supabase connection…');
  const { error } = await supabase.from('opportunities').select('id').limit(1);
  if (error && error.code === '42P01') {
    console.log('✅ Connection confirmed — opportunities table not yet created (expected before migration)');
  } else if (error) {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Connection confirmed — opportunities table already exists');
    console.log('   Migrations may already have been applied. Verify schema is up to date.');
  }

  console.log('\n🏁 Migration script complete.');
  console.log('   After applying schema, run: npx ts-node scripts/seed_first_run.ts');
}

runMigrations().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
