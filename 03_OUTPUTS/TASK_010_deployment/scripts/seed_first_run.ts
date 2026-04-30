#!/usr/bin/env npx ts-node
// ============================================================
// SEED FIRST RUN
// Triggers first ingestion of all data sources in sequence.
// Calls the live API endpoints on the deployed Netlify site
// (or localhost:3000 for local testing).
//
// Usage:
//   SITE_URL=https://govconassistant.pro INGEST_SECRET=... \
//   npx ts-node scripts/seed_first_run.ts
//
// For local:
//   SITE_URL=http://localhost:3000 INGEST_SECRET=... \
//   npx ts-node scripts/seed_first_run.ts
// ============================================================

const SITE_URL     = process.env.SITE_URL ?? 'http://localhost:3000';
const INGEST_SECRET = process.env.INGEST_SECRET ?? '';

if (!INGEST_SECRET) {
  console.error('❌ INGEST_SECRET env var is required');
  process.exit(1);
}

interface IngestResult {
  source: string;
  endpoint: string;
  status: 'success' | 'error' | 'skipped';
  recordsUpserted?: number;
  error?: string;
  durationMs: number;
}

const INGESTION_SOURCES = [
  { name: 'Federal (SAM.gov)',      endpoint: '/api/ingest/federal' },
  { name: 'State/Local Contracts',  endpoint: '/api/ingest/state-local' },
];

async function triggerIngestion(name: string, endpoint: string): Promise<IngestResult> {
  const url = `${SITE_URL}${endpoint}`;
  console.log(`\n📡 Triggering: ${name}`);
  console.log(`   → ${url}`);

  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ingest-secret': INGEST_SECRET,
      },
      signal: AbortSignal.timeout(120_000), // 2 min timeout per source
    });

    const durationMs = Date.now() - start;
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`   ❌ HTTP ${res.status}: ${body.error ?? JSON.stringify(body)}`);
      return { source: name, endpoint, status: 'error', error: `HTTP ${res.status}`, durationMs };
    }

    const records = body.records_upserted ?? body.upserted ?? body.count ?? '?';
    console.log(`   ✅ ${records} records upserted (${(durationMs / 1000).toFixed(1)}s)`);
    return { source: name, endpoint, status: 'success', recordsUpserted: Number(records), durationMs };

  } catch (err) {
    const durationMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ Error: ${msg}`);
    return { source: name, endpoint, status: 'error', error: msg, durationMs };
  }
}

async function seedFirstRun() {
  console.log('='.repeat(60));
  console.log('🚀 PGH GOV CONTRACTS — FIRST INGESTION RUN');
  console.log('='.repeat(60));
  console.log(`Site: ${SITE_URL}`);
  console.log(`Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);

  const results: IngestResult[] = [];

  for (const source of INGESTION_SOURCES) {
    const result = await triggerIngestion(source.name, source.endpoint);
    results.push(result);

    // Short pause between sources to avoid overwhelming DB
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 INGESTION SUMMARY');
  console.log('='.repeat(60));

  let totalRecords = 0;
  let errors = 0;

  for (const r of results) {
    const icon = r.status === 'success' ? '✅' : r.status === 'skipped' ? '⏭️' : '❌';
    const records = r.recordsUpserted != null ? `${r.recordsUpserted} records` : r.error ?? '';
    console.log(`${icon} ${r.source.padEnd(30)} ${records.padEnd(20)} (${(r.durationMs / 1000).toFixed(1)}s)`);
    totalRecords += r.recordsUpserted ?? 0;
    if (r.status === 'error') errors++;
  }

  console.log('-'.repeat(60));
  console.log(`Total records upserted: ${totalRecords}`);
  console.log(`Errors: ${errors}`);

  if (totalRecords === 0) {
    console.log('\n⚠️  WARNING: No records were upserted. Check:');
    console.log('   1. SAMGOV_API_KEY is set in Netlify env vars');
    console.log('   2. The site is fully deployed and accessible');
    console.log('   3. Supabase migrations have been applied');
    console.log('   4. INGEST_SECRET matches what is set in Netlify env vars');
  } else if (totalRecords < 50) {
    console.log('\n⚠️  WARNING: Fewer than 50 records. SAM.gov may have returned limited results.');
    console.log('   This is okay — run again tomorrow when the cron fires.');
  } else {
    console.log('\n🎉 First run complete! Data is live.');
    console.log('   Visit your site and confirm contracts appear in the list.');
  }

  if (errors > 0) process.exit(1);
}

seedFirstRun().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
