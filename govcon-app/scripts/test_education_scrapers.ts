#!/usr/bin/env npx ts-node
// ============================================================
// TEST EDUCATION SCRAPERS
// Runs each education scraper live and reports results.
// No data is written to Supabase — read-only verification.
//
// Usage:
//   npx ts-node scripts/test_education_scrapers.ts
//   npx ts-node scripts/test_education_scrapers.ts --source pitt
// ============================================================

import { scrapePitt }       from '../lib/ingestion/education/pitt';
import { scrapeCmu }        from '../lib/ingestion/education/cmu';
import { scrapeCcac }       from '../lib/ingestion/education/ccac';
import { scrapePghSchools } from '../lib/ingestion/education/pgh_schools';
import { scrapeDuquesne }   from '../lib/ingestion/education/duquesne';
import { computeDedupHash } from '../lib/ingestion/shared/normalize_education';

const SCRAPERS = [
  { key: 'pitt',        label: 'University of Pittsburgh',        fn: scrapePitt },
  { key: 'cmu',         label: 'Carnegie Mellon University',       fn: scrapeCmu },
  { key: 'ccac',        label: 'CCAC',                            fn: scrapeCcac },
  { key: 'pgh_schools', label: 'Pittsburgh Public Schools',        fn: scrapePghSchools },
  { key: 'duquesne',    label: 'Duquesne University',              fn: scrapeDuquesne },
];

// Parse --source flag
const sourceFilter = process.argv.find((a) => a.startsWith('--source='))?.split('=')[1]
  ?? (process.argv.includes('--source') ? process.argv[process.argv.indexOf('--source') + 1] : null);

async function runTests() {
  const targetScrapers = sourceFilter
    ? SCRAPERS.filter((s) => s.key === sourceFilter)
    : SCRAPERS;

  if (targetScrapers.length === 0) {
    console.error(`Unknown source: ${sourceFilter}. Valid: ${SCRAPERS.map((s) => s.key).join(', ')}`);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('🎓 EDUCATION SCRAPER TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Running ${targetScrapers.length} scraper(s)...\n`);

  const results: Array<{
    key: string;
    label: string;
    count: number;
    errors: string[];
    durationMs: number;
    pass: boolean;
    sample?: object;
  }> = [];

  for (const scraper of targetScrapers) {
    console.log(`\n📡 Testing: ${scraper.label}`);
    try {
      const result = await scraper.fn();
      const pass = result.opportunities.length >= 0 && result.errors.length === 0;
      const sample = result.opportunities[0];

      results.push({
        key: scraper.key,
        label: scraper.label,
        count: result.opportunities.length,
        errors: result.errors,
        durationMs: result.durationMs,
        pass,
        sample,
      });

      if (result.opportunities.length > 0) {
        console.log(`   ✅ ${result.opportunities.length} opportunities found (${(result.durationMs / 1000).toFixed(1)}s)`);
        console.log(`   📋 Sample title: "${sample?.title?.slice(0, 70)}"`);
        console.log(`   🏛️  Agency: ${sample?.agency_name}`);
        console.log(`   📅 Deadline: ${sample?.deadline ?? '—'}`);
        console.log(`   📁 Type: ${sample?.contract_type}`);
        console.log(`   🏷️  NAICS sector: ${sample?.naics_sector ?? '—'}`);
        console.log(`   🔗 URL: ${sample?.url?.slice(0, 80) ?? '—'}`);

        // Verify dedup_hash determinism
        if (sample) {
          const recomputed = computeDedupHash(sample.title, sample.agency_name, sample.deadline ?? null);
          const hashMatch = recomputed === sample.dedup_hash;
          console.log(`   🔐 dedup_hash deterministic: ${hashMatch ? '✅' : '❌ MISMATCH'}`);
        }
      } else if (result.errors.length === 0) {
        console.log(`   ⚠️  0 opportunities found — site may have no active solicitations or HTML structure changed`);
      } else {
        console.log(`   ❌ Errors: ${result.errors.join('; ')}`);
      }

      if (result.errors.length > 0) {
        console.log(`   ⚠️  Errors: ${result.errors.slice(0, 3).join('; ')}`);
      }
    } catch (err) {
      results.push({
        key: scraper.key,
        label: scraper.label,
        count: 0,
        errors: [err instanceof Error ? err.message : String(err)],
        durationMs: 0,
        pass: false,
      });
      console.log(`   ❌ Fatal error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Summary table
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  let totalOpps = 0;
  let failures = 0;

  for (const r of results) {
    const icon = r.errors.length > 0 && r.count === 0 ? '❌' : r.count > 0 ? '✅' : '⚠️';
    console.log(
      `${icon} ${r.label.padEnd(40)} ${String(r.count).padStart(3)} opps  ${(r.durationMs / 1000).toFixed(1)}s`
    );
    totalOpps += r.count;
    if (r.errors.length > 0 && r.count === 0) failures++;
  }

  console.log('-'.repeat(60));
  console.log(`Total opportunities: ${totalOpps}`);
  console.log(`Failures (no data + errors): ${failures}`);

  if (failures === SCRAPERS.length) {
    console.log('\n❌ ALL SCRAPERS FAILED — check network access or site structure changes');
    process.exit(1);
  } else if (failures > 0) {
    console.log(`\n⚠️  ${failures} scraper(s) failed — others are operational`);
  } else {
    console.log('\n🎉 All scrapers passed!');
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
