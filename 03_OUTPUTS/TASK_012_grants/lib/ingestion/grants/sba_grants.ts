// ============================================================
// SBA GRANTS + SBIR SCRAPER
// Sources:
//   SBA grants: https://www.sba.gov/funding-programs/grants
//   SBIR/STTR: https://www.sbir.gov/sbirsearch/award/all?agency=&ri=&rp=1&state=PA
// source = "federal_sba"
// ============================================================

import { createHash } from 'crypto';
import * as cheerio from 'cheerio';
import type { GrantRecord, GrantIngestionResult } from './types';

const SOURCE = 'federal_sba' as const;
const BASE_SBA  = 'https://www.sba.gov';
const BASE_SBIR = 'https://www.sbir.gov';

function dedupHash(title: string, agency: string, deadline: string | null): string {
  const t = (title ?? '').toLowerCase().trim();
  const a = (agency ?? '').toLowerCase().trim();
  const d = deadline ? deadline.split('T')[0] : '';
  return createHash('sha256').update(`${t}${a}${d}`, 'utf8').digest('hex');
}

function detectGrantType(text: string): 'grant' | 'loan' | 'other' {
  const t = text.toLowerCase();
  if (t.includes('loan') || t.includes('lending')) return 'loan';
  if (t.includes('grant') || t.includes('sbir') || t.includes('sttr') || t.includes('fund')) return 'grant';
  return 'other';
}

// Known SBA programs — static seed for reliability
const KNOWN_SBA_PROGRAMS: Omit<GrantRecord, 'dedup_hash'>[] = [
  {
    source: SOURCE,
    category: 'federal',
    title: 'SBIR — Small Business Innovation Research Program',
    agency: 'Small Business Administration',
    grant_type: 'grant',
    eligible_entities: ['small_business'],
    min_amount: 15000000,   // $150K Phase I typical
    max_amount: 200000000,  // $2M Phase II typical
    description: 'SBIR awards competitive grants to small businesses engaged in federal R&D with potential for commercialization. Phase I up to $150K–$300K; Phase II up to $1M–$2M depending on agency.',
    requirements: 'Must be a US small business (≤500 employees), majority US-owned. PI must be primarily employed by the firm.',
    how_to_apply: 'Find open solicitations at sbir.gov. Submit through agency-specific portals (SAM.gov, FastLane, Grants.gov).',
    url: 'https://www.sbir.gov',
    status: 'active',
  },
  {
    source: SOURCE,
    category: 'federal',
    title: 'STTR — Small Business Technology Transfer Program',
    agency: 'Small Business Administration',
    grant_type: 'grant',
    eligible_entities: ['small_business'],
    min_amount: 10000000,  // $100K Phase I
    max_amount: 75000000,  // $750K Phase II
    description: 'STTR requires collaboration between small businesses and nonprofit research institutions. Funds R&D with commercialization potential.',
    requirements: 'Small business must partner with a US research institution. Minimum 30% work performed by small business, 30% by research institution.',
    how_to_apply: 'Find open solicitations at sbir.gov. Partnership agreement with research institution required.',
    url: 'https://www.sbir.gov',
    status: 'active',
  },
  {
    source: SOURCE,
    category: 'federal',
    title: 'SBA Community Advantage Loan Program',
    agency: 'Small Business Administration',
    grant_type: 'loan',
    eligible_entities: ['small_business'],
    max_amount: 35000000, // $350K
    description: 'Loans up to $350,000 for small businesses in underserved markets through mission-based lenders. Lower credit score requirements than traditional SBA loans.',
    how_to_apply: 'Apply through an SBA-approved Community Advantage lender in Pittsburgh. Find lenders at sba.gov/lendermatch.',
    url: `${BASE_SBA}/funding-programs/loans/community-advantage-loan-program`,
    status: 'active',
  },
  {
    source: SOURCE,
    category: 'federal',
    title: 'SBA Microloan Program',
    agency: 'Small Business Administration',
    grant_type: 'loan',
    eligible_entities: ['small_business', 'nonprofit'],
    max_amount: 5000000, // $50,000
    description: 'SBA Microloans up to $50,000 for small businesses and certain nonprofits. Average microloan is $13,000. Offered through SBA-designated intermediary lenders.',
    how_to_apply: 'Find SBA microloan intermediaries in Pittsburgh at sba.gov. Application requires business plan.',
    url: `${BASE_SBA}/funding-programs/loans/microloans`,
    status: 'active',
  },
  {
    source: SOURCE,
    category: 'federal',
    title: 'SBA Grants for Exporters',
    agency: 'Small Business Administration',
    grant_type: 'grant',
    eligible_entities: ['small_business'],
    max_amount: 1000000, // $10,000 STEP grants
    description: 'State Trade Expansion Program (STEP) provides grants to small businesses for export development activities: trade missions, translations, website localization, trade show participation.',
    how_to_apply: 'Apply through PA DCED (Pennsylvania\'s STEP administrator). Applications open annually. Visit dced.pa.gov.',
    url: `${BASE_SBA}/funding-programs/grants`,
    status: 'active',
  },
];

async function scrapeSbaGrantsPage(): Promise<GrantRecord[]> {
  const grants: GrantRecord[] = [];
  const seen = new Set<string>();
  const url = `${BASE_SBA}/funding-programs/grants`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GovConBot/1.0 (+https://govconassistant.pro)' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return grants;

    const $ = cheerio.load(await res.text());

    $('h2, h3, .card-title, .program-title').each((_, el) => {
      const $el = $(el);
      const title = $el.text().trim();
      if (!title || title.length < 8) return;
      if (seen.has(title.toLowerCase())) return;
      seen.add(title.toLowerCase());

      const desc = $el.next('p').text().trim().slice(0, 500);
      const linkEl = $el.find('a').first().add($el.next('a').first()).first();
      const href = linkEl.attr('href') ?? '';
      const fullUrl = href ? (href.startsWith('http') ? href : `${BASE_SBA}${href}`) : url;
      const hash = dedupHash(title, 'Small Business Administration', null);

      grants.push({
        source: SOURCE,
        category: 'federal',
        title,
        agency: 'Small Business Administration',
        grant_type: detectGrantType(title + desc),
        eligible_entities: ['small_business'],
        description: desc || undefined,
        how_to_apply: `Visit ${fullUrl}`,
        url: fullUrl,
        dedup_hash: hash,
        status: 'active',
      });
    });
  } catch (err) {
    console.error('[sba_grants] scrape error:', err instanceof Error ? err.message : err);
  }

  return grants;
}

export async function ingestSbaGrants(): Promise<GrantIngestionResult> {
  const start = Date.now();
  const seen = new Set<string>();
  const grants: GrantRecord[] = [];

  // Add known programs
  for (const prog of KNOWN_SBA_PROGRAMS) {
    const hash = dedupHash(prog.title, prog.agency, prog.application_deadline ?? null);
    if (!seen.has(hash)) {
      seen.add(hash);
      grants.push({ ...prog, dedup_hash: hash });
    }
  }

  // Supplement with live scrape
  const scraped = await scrapeSbaGrantsPage();
  for (const g of scraped) {
    if (!seen.has(g.dedup_hash)) {
      seen.add(g.dedup_hash);
      grants.push(g);
    }
  }

  console.log(`[sba_grants] ${grants.length} programs (${Date.now() - start}ms)`);
  return { source: SOURCE, grants, errors: [], durationMs: Date.now() - start };
}
