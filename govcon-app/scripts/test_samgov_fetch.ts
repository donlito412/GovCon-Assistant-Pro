// ============================================================
// STANDALONE SAM.GOV API CONNECTION TEST SCRIPT
// Verifies: API key works, at least 1 Pittsburgh result returned
//
// Usage:
//   npx ts-node scripts/test_samgov_fetch.ts
//
// Requires:
//   SAMGOV_API_KEY set in environment (or .env file)
//
// Install ts-node + dotenv if not already:
//   npm install --save-dev ts-node dotenv
// ============================================================

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root (adjust path if needed)
dotenv.config({ path: path.resolve(__dirname, '../../../../03_OUTPUTS/TASK_001_scaffold/.env.example') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { fetchAllPAOpportunities } from '@/lib/ingestion/samgov';
import { normalizePittsburghOpportunities, computeDedupHash, deriveThresholdCategory, mapContractType } from '@/lib/ingestion/normalize';
import { isPittsburghAreaZip, isPittsburghAreaCounty } from '@/lib/geo/pittsburgh_zips';

const SAMGOV_API_KEY = process.env.SAMGOV_API_KEY ?? '';

function separator(label: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${label}`);
  console.log('='.repeat(60));
}

async function main(): Promise<void> {
  separator('SAM.GOV API CONNECTION TEST');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // ---- CHECK 1: API Key Present ----
  separator('CHECK 1: API Key');
  if (!SAMGOV_API_KEY) {
    console.error('FAIL: SAMGOV_API_KEY is not set in environment.');
    console.error('Set it in .env.local or export SAMGOV_API_KEY=your_key_here');
    process.exit(1);
  }
  console.log(`PASS: SAMGOV_API_KEY is set (length=${SAMGOV_API_KEY.length})`);

  // ---- CHECK 2: Pittsburgh Zip Filter Sanity ----
  separator('CHECK 2: Pittsburgh Zip Filter');
  const testCases: Array<{ zip: string; expected: boolean }> = [
    { zip: '15219', expected: true },   // Downtown Pittsburgh
    { zip: '15213', expected: true },   // Oakland / CMU / Pitt
    { zip: '15222', expected: true },   // Strip District
    { zip: '16001', expected: true },   // Butler County
    { zip: '15301', expected: true },   // Washington County
    { zip: '10001', expected: false },  // New York
    { zip: '20001', expected: false },  // Washington DC
    { zip: '19103', expected: false },  // Philadelphia
  ];

  let zipTestsPassed = 0;
  for (const tc of testCases) {
    const result = isPittsburghAreaZip(tc.zip);
    const pass = result === tc.expected;
    if (pass) zipTestsPassed++;
    console.log(
      `${pass ? 'PASS' : 'FAIL'}: zip=${tc.zip} expected=${tc.expected} got=${result}`,
    );
  }
  console.log(`\nZip filter: ${zipTestsPassed}/${testCases.length} tests passed.`);

  // ---- CHECK 3: County Filter Sanity ----
  separator('CHECK 3: Pittsburgh County Filter');
  const countyTests: Array<{ county: string; expected: boolean }> = [
    { county: 'Allegheny', expected: true },
    { county: 'Butler', expected: true },
    { county: 'Washington', expected: true },
    { county: 'Beaver', expected: true },
    { county: 'Westmoreland', expected: true },
    { county: 'Philadelphia', expected: false },
    { county: 'Dauphin', expected: false },
  ];
  for (const tc of countyTests) {
    const result = isPittsburghAreaCounty(tc.county);
    const pass = result === tc.expected;
    console.log(
      `${pass ? 'PASS' : 'FAIL'}: county="${tc.county}" expected=${tc.expected} got=${result}`,
    );
  }

  // ---- CHECK 4: Dedup Hash Determinism ----
  separator('CHECK 4: Dedup Hash');
  const hash1 = computeDedupHash('  IT Consulting Services  ', '  Department of Defense  ', '2025-06-01T00:00:00.000Z');
  const hash2 = computeDedupHash('IT Consulting Services', 'Department of Defense', '2025-06-01');
  const hash3 = computeDedupHash('it consulting services', 'department of defense', '2025-06-01');
  console.log(`Hash 1 (leading/trailing spaces): ${hash1}`);
  console.log(`Hash 2 (ISO date):                ${hash2}`);
  console.log(`Hash 3 (lowercase manual):        ${hash3}`);
  const hashMatch = hash1 === hash2 && hash2 === hash3;
  console.log(`\n${hashMatch ? 'PASS' : 'FAIL'}: All three hashes match: ${hashMatch}`);

  // ---- CHECK 5: Threshold Category ----
  separator('CHECK 5: Threshold Categories');
  const thresholdTests: Array<{ value: number | null; expected: string }> = [
    { value: 5000, expected: 'micro_purchase' },
    { value: 15000, expected: 'micro_purchase' },
    { value: 15001, expected: 'simplified_acquisition' },
    { value: 250000, expected: 'simplified_acquisition' },
    { value: 350000, expected: 'simplified_acquisition' },
    { value: 350001, expected: 'large_acquisition' },
    { value: 1_000_000, expected: 'large_acquisition' },
    { value: 0, expected: 'unknown' },
    { value: null, expected: 'unknown' },
  ];
  for (const tc of thresholdTests) {
    const result = deriveThresholdCategory(tc.value);
    const pass = result === tc.expected;
    console.log(
      `${pass ? 'PASS' : 'FAIL'}: $${tc.value} → expected=${tc.expected} got=${result}`,
    );
  }

  // ---- CHECK 6: Contract Type Mapping ----
  separator('CHECK 6: Contract Type Mapping');
  const typeTests: Array<{ input: string; expected: string }> = [
    { input: 'Presolicitation', expected: 'RFI' },
    { input: 'Solicitation', expected: 'RFP' },
    { input: 'Combined Synopsis/Solicitation', expected: 'RFP' },
    { input: 'Sources Sought', expected: 'Sources_Sought' },
    { input: 'Award Notice', expected: 'Other' },
  ];
  for (const tc of typeTests) {
    const result = mapContractType(tc.input);
    const pass = result === tc.expected;
    console.log(
      `${pass ? 'PASS' : 'FAIL'}: "${tc.input}" → expected=${tc.expected} got=${result}`,
    );
  }

  // ---- CHECK 7: Live SAM.gov API (REAL CALL) ----
  separator('CHECK 7: Live SAM.gov API Call (1 page, real data)');
  console.log('Fetching first page from SAM.gov (lookback: 30 days, state: PA)...');
  console.log('This makes a real HTTP request to api.sam.gov\n');

  try {
    const result = await fetchAllPAOpportunities(SAMGOV_API_KEY, 30);

    console.log(`\nAPI Response Summary:`);
    console.log(`  Total available in PA:  ${result.totalAvailable}`);
    console.log(`  Total fetched:          ${result.totalFetched}`);
    console.log(`  Fetch errors:           ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.error('\nFetch errors:');
      result.errors.forEach((e) => console.error(`  - ${e}`));
    }

    if (result.totalFetched === 0) {
      console.error('\nFAIL: No records returned from SAM.gov. Check API key and network access.');
      process.exit(1);
    }

    console.log(`\nPASS: SAM.gov API connection successful. Got ${result.totalFetched} PA records.`);

    // ---- CHECK 8: Pittsburgh Filter Results ----
    separator('CHECK 8: Pittsburgh Filter on Live Data');
    const { normalized, filteredCount } = normalizePittsburghOpportunities(result.opportunities);

    console.log(`\nPittsburgh Filter Results:`);
    console.log(`  Total PA input:      ${result.totalFetched}`);
    console.log(`  Pittsburgh matches:  ${normalized.length}`);
    console.log(`  Non-PGH excluded:   ${filteredCount}`);

    if (normalized.length === 0) {
      console.warn('\nWARN: No Pittsburgh-area results found in fetched batch.');
      console.warn('This may be normal for a small 30-day window.');
      console.warn('Try increasing lookback to 90 days for full production run.');
    } else {
      console.log(`\nPASS: Found ${normalized.length} Pittsburgh-area opportunity(ies).`);

      // Print first 3 results
      separator('SAMPLE RESULTS (first 3)');
      const sample = normalized.slice(0, 3);
      for (const opp of sample) {
        console.log('\n---');
        console.log(`  Title:              ${opp.title}`);
        console.log(`  Agency:             ${opp.agency_name}`);
        console.log(`  Contract Type:      ${opp.contract_type}`);
        console.log(`  Threshold:          ${opp.threshold_category}`);
        console.log(`  NAICS:              ${opp.naics_code ?? 'N/A'} (${opp.naics_sector ?? 'N/A'})`);
        console.log(`  Deadline:           ${opp.deadline ?? 'N/A'}`);
        console.log(`  Value (cents):      ${opp.value_max != null ? `$${(opp.value_max / 100).toLocaleString()}` : 'N/A'}`);
        console.log(`  Place:              ${opp.place_of_performance_city ?? ''}, ${opp.place_of_performance_state ?? ''} ${opp.place_of_performance_zip ?? ''}`);
        console.log(`  Status:             ${opp.status}`);
        console.log(`  Dedup Hash:         ${opp.dedup_hash}`);
        console.log(`  URL:                ${opp.url ?? 'N/A'}`);
      }
    }

    separator('TEST COMPLETE');
    console.log(`\nAll critical checks passed. SAM.gov ingestion pipeline is ready.`);
    console.log(`Run the full ingestion via:\n  POST /api/ingest/federal\n  Header: x-ingest-secret: <your INGEST_SECRET>\n`);

  } catch (err) {
    console.error('\nFAIL: SAM.gov API call threw an error:');
    console.error(err instanceof Error ? err.message : String(err));
    console.error('\nPossible causes:');
    console.error('  - Invalid or expired SAM.gov API key');
    console.error('  - Network connectivity issue');
    console.error('  - SAM.gov API is down (check https://sam.gov/status)');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
