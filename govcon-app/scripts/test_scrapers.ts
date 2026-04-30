// ============================================================
// STANDALONE SCRAPER TEST SCRIPT — TASK_003
// Tests each state/local scraper independently.
// Verifies: scraper runs, returns >= 1 result, fields populated.
//
// Usage:
//   npx ts-node scripts/test_scrapers.ts
//
// Requires: ts-node, dotenv
//   npm install --save-dev ts-node dotenv
// ============================================================

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { scrapeEMarketplace } from '@/lib/ingestion/pa_emarketplace';
import { scrapePaTreasury } from '@/lib/ingestion/pa_treasury';
import { scrapeAlleghenyCounty } from '@/lib/ingestion/allegheny_county';
import { scrapePittsburghCity } from '@/lib/ingestion/pittsburgh_city';
import type { ScraperResult, ScrapedOpportunity } from '@/lib/ingestion/shared/normalize_shared';
import { computeDedupHash, deriveThresholdCategory, mapContractType, parseToIso } from '@/lib/ingestion/shared/normalize_shared';

function sep(label: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${label}`);
  console.log('='.repeat(60));
}

function printSample(opps: ScrapedOpportunity[], max = 2): void {
  const sample = opps.slice(0, max);
  for (const opp of sample) {
    console.log('\n  ---');
    console.log(`  Title:          ${opp.title}`);
    console.log(`  Agency:         ${opp.agency_name}`);
    console.log(`  Source:         ${opp.source}`);
    console.log(`  Contract Type:  ${opp.contract_type}`);
    console.log(`  Threshold:      ${opp.threshold_category}`);
    console.log(`  Deadline:       ${opp.deadline ?? 'N/A'}`);
    console.log(`  Sol #:          ${opp.solicitation_number ?? 'N/A'}`);
    console.log(`  URL:            ${opp.url ?? 'N/A'}`);
    console.log(`  Dedup Hash:     ${opp.dedup_hash}`);
  }
}

function validateRecord(opp: ScrapedOpportunity): string[] {
  const issues: string[] = [];
  if (!opp.title || opp.title.length < 3) issues.push('title missing or too short');
  if (!opp.agency_name) issues.push('agency_name missing');
  if (!opp.dedup_hash || opp.dedup_hash.length !== 64) issues.push('invalid dedup_hash (expected 64 hex chars)');
  if (!opp.source) issues.push('source missing');
  if (!opp.canonical_sources?.length) issues.push('canonical_sources empty');
  if (!opp.contract_type) issues.push('contract_type missing');
  if (!opp.threshold_category) issues.push('threshold_category missing');
  if (!opp.status) issues.push('status missing');
  return issues;
}

async function runScraperTest(
  label: string,
  fn: () => Promise<ScraperResult>,
): Promise<boolean> {
  sep(`SCRAPER: ${label}`);

  let result: ScraperResult;
  try {
    result = await fn();
  } catch (err) {
    console.error(`FAIL: Scraper threw uncaught error:`);
    console.error(err instanceof Error ? err.message : String(err));
    return false;
  }

  console.log(`\nResults:`);
  console.log(`  Records returned:  ${result.opportunities.length}`);
  console.log(`  Scrape errors:     ${result.errors.length}`);
  console.log(`  Duration:          ${result.durationMs}ms`);

  if (result.errors.length > 0) {
    console.warn(`\n  Scrape errors:`);
    result.errors.slice(0, 5).forEach((e) => console.warn(`    - ${e}`));
  }

  if (result.opportunities.length === 0) {
    console.warn(`\nWARN: No results returned from ${label}.`);
    console.warn('This may indicate the site structure changed or is temporarily down.');
    console.warn('Check the site manually and update the scraper if needed.');
    return false;
  }

  // Validate all records
  let validCount = 0;
  const allIssues: string[] = [];
  for (const opp of result.opportunities) {
    const issues = validateRecord(opp);
    if (issues.length === 0) {
      validCount++;
    } else {
      allIssues.push(`"${opp.title}": ${issues.join(', ')}`);
    }
  }

  console.log(`\n  Validation: ${validCount}/${result.opportunities.length} records fully valid`);
  if (allIssues.length > 0) {
    console.warn(`  Validation issues (first 3):`);
    allIssues.slice(0, 3).forEach((i) => console.warn(`    - ${i}`));
  }

  console.log('\n  Sample records:');
  printSample(result.opportunities);

  const passed = result.opportunities.length >= 1;
  console.log(`\n${passed ? 'PASS' : 'FAIL'}: ${label} returned ${result.opportunities.length} record(s).`);
  return passed;
}

// ============================================================
// UNIT TESTS FOR SHARED UTILITIES
// ============================================================

function testSharedUtils(): boolean {
  sep('UNIT TESTS: Shared Normalize Utilities');
  let allPassed = true;

  // computeDedupHash — determinism
  const h1 = computeDedupHash('  IT Services  ', '  City of Pittsburgh  ', '2025-09-01T00:00:00Z');
  const h2 = computeDedupHash('IT Services', 'City of Pittsburgh', '2025-09-01');
  const h3 = computeDedupHash('it services', 'city of pittsburgh', '2025-09-01');
  const hashOk = h1 === h2 && h2 === h3;
  console.log(`${hashOk ? 'PASS' : 'FAIL'}: computeDedupHash is deterministic across casing/spacing`);
  if (!hashOk) allPassed = false;

  // deriveThresholdCategory
  const thresholdTests: Array<[number | null, string]> = [
    [0, 'unknown'],
    [null, 'unknown'],
    [5000, 'micro_purchase'],
    [15000, 'micro_purchase'],
    [15001, 'simplified_acquisition'],
    [350000, 'simplified_acquisition'],
    [350001, 'large_acquisition'],
    [5_000_000, 'large_acquisition'],
  ];
  let threshOk = true;
  for (const [val, expected] of thresholdTests) {
    const got = deriveThresholdCategory(val);
    if (got !== expected) {
      console.warn(`FAIL: deriveThresholdCategory(${val}) → expected=${expected} got=${got}`);
      threshOk = false;
      allPassed = false;
    }
  }
  if (threshOk) console.log('PASS: deriveThresholdCategory — all 8 cases correct');

  // mapContractType
  const typeTests: Array<[string, string]> = [
    ['RFP', 'RFP'],
    ['Request for Proposal', 'RFP'],
    ['RFQ', 'RFQ'],
    ['IFB', 'IFB'],
    ['Invitation for Bid', 'IFB'],
    ['RFI', 'RFI'],
    ['Sources Sought', 'Sources_Sought'],
    ['bid', 'IFB'],
    ['unknown-type', 'Other'],
  ];
  let typeOk = true;
  for (const [input, expected] of typeTests) {
    const got = mapContractType(input);
    if (got !== expected) {
      console.warn(`FAIL: mapContractType("${input}") → expected=${expected} got=${got}`);
      typeOk = false;
      allPassed = false;
    }
  }
  if (typeOk) console.log('PASS: mapContractType — all 9 cases correct');

  // parseToIso
  const dateTests: Array<[string, boolean]> = [
    ['12/31/2025', true],
    ['2025-12-31', true],
    ['December 31, 2025', true],
    ['', false],
    ['not-a-date', false],
  ];
  let dateOk = true;
  for (const [input, shouldParse] of dateTests) {
    const got = parseToIso(input);
    const parsed = got != null;
    if (parsed !== shouldParse) {
      console.warn(`FAIL: parseToIso("${input}") → expected ${shouldParse ? 'ISO string' : 'undefined'}, got=${got}`);
      dateOk = false;
      allPassed = false;
    }
  }
  if (dateOk) console.log('PASS: parseToIso — all 5 cases correct');

  return allPassed;
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  sep('STATE/LOCAL SCRAPER TEST SUITE');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('This makes real HTTP requests to live government websites.');

  const unitsPassed = testSharedUtils();

  const scraperTests: Array<{ label: string; fn: () => Promise<ScraperResult> }> = [
    { label: 'PA eMarketplace', fn: scrapeEMarketplace },
    { label: 'PA Treasury', fn: scrapePaTreasury },
    { label: 'Allegheny County', fn: scrapeAlleghenyCounty },
    { label: 'City of Pittsburgh', fn: scrapePittsburghCity },
  ];

  const scraperResults: Array<{ label: string; passed: boolean }> = [];

  for (const test of scraperTests) {
    const passed = await runScraperTest(test.label, test.fn);
    scraperResults.push({ label: test.label, passed });
  }

  sep('FINAL SUMMARY');
  console.log(`\nUnit Tests:  ${unitsPassed ? 'PASS' : 'FAIL'}`);
  console.log('\nScraper Results:');
  for (const r of scraperResults) {
    console.log(`  ${r.passed ? 'PASS' : 'WARN'}: ${r.label}`);
  }

  const anyScraperFailed = scraperResults.some((r) => !r.passed);
  if (anyScraperFailed) {
    console.log('\nWARN: One or more scrapers returned 0 results.');
    console.log('This may be normal if a government site is temporarily down.');
    console.log('Re-run the test later or verify the site URLs manually.');
  } else {
    console.log('\nAll scrapers returned data. State/local ingestion pipeline is ready.');
  }

  console.log('\nTo trigger full ingestion:');
  console.log('  POST /api/ingest/state-local');
  console.log('  Header: x-ingest-secret: <your INGEST_SECRET>\n');
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
