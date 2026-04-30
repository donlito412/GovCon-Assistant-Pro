// ============================================================
// URA FINANCIAL ASSISTANCE SCRAPER
// Source: https://www.ura.org/pages/financial-assistance-resources
// Includes: Micro-Enterprise Loan Fund, Commercial Façade Grant,
//           Minority Business funds, Innovation Works partnerships
// source = "local_ura"
// ============================================================

import { createHash } from 'crypto';
import * as cheerio from 'cheerio';
import type { GrantRecord, GrantIngestionResult } from './types';

const SOURCE = 'local_ura' as const;
const BASE_URL = 'https://www.ura.org';
const SCRAPE_URLS = [
  `${BASE_URL}/pages/financial-assistance-resources`,
  `${BASE_URL}/pages/business-development`,
  `${BASE_URL}/pages/commercial-facade-improvement-program`,
];

function dedupHash(title: string, agency: string, deadline: string | null): string {
  const t = (title ?? '').toLowerCase().trim();
  const a = (agency ?? '').toLowerCase().trim();
  const d = deadline ? deadline.split('T')[0] : '';
  return createHash('sha256').update(`${t}${a}${d}`, 'utf8').digest('hex');
}

function detectGrantType(text: string): 'grant' | 'loan' | 'tax_credit' | 'rebate' | 'other' {
  const t = text.toLowerCase();
  if (t.includes('loan') || t.includes('lending') || t.includes('micro-enterprise')) return 'loan';
  if (t.includes('façade') || t.includes('facade') || t.includes('improvement grant') || t.includes('grant')) return 'grant';
  if (t.includes('tax')) return 'tax_credit';
  return 'other';
}

function parseAmountFromText(text: string): { min?: number; max?: number } {
  // Matches: "up to $50,000", "$10,000 – $250,000", "maximum of $25,000"
  const upToMatch = text.match(/up to \$?([\d,]+)/i);
  const rangeMatch = text.match(/\$?([\d,]+)\s*(?:–|-|to)\s*\$?([\d,]+)/i);
  const maxMatch = text.match(/maximum\s+(?:of\s+)?\$?([\d,]+)/i);

  function toCents(s: string): number {
    return Math.round(parseFloat(s.replace(/,/g, '')) * 100);
  }

  if (rangeMatch) {
    return { min: toCents(rangeMatch[1]), max: toCents(rangeMatch[2]) };
  }
  if (upToMatch) return { max: toCents(upToMatch[1]) };
  if (maxMatch)  return { max: toCents(maxMatch[1]) };
  return {};
}

// Well-known URA programs — static seed to ensure they always appear
const KNOWN_URA_PROGRAMS: Omit<GrantRecord, 'dedup_hash'>[] = [
  {
    source: SOURCE,
    category: 'local',
    title: 'Micro-Enterprise Loan Fund',
    agency: 'Urban Redevelopment Authority of Pittsburgh',
    grant_type: 'loan',
    eligible_entities: ['small_business'],
    max_amount: 2500000, // $25,000 in cents
    description: 'Low-interest loans up to $25,000 for micro-enterprises (fewer than 5 employees) in Pittsburgh. Supports startups and expanding small businesses.',
    how_to_apply: 'Visit ura.org to download application. Submit with business plan and financial statements.',
    url: `${BASE_URL}/pages/financial-assistance-resources`,
    status: 'active',
  },
  {
    source: SOURCE,
    category: 'local',
    title: 'Commercial Façade Improvement Program',
    agency: 'Urban Redevelopment Authority of Pittsburgh',
    grant_type: 'grant',
    eligible_entities: ['small_business', 'nonprofit'],
    max_amount: 5000000, // $50,000 in cents
    description: 'Matching grants for exterior improvements to commercial buildings in Pittsburgh neighborhoods. Covers painting, signage, window replacement, and ADA improvements.',
    how_to_apply: 'Submit application with contractor quotes and before photos to URA Commercial Lending.',
    url: `${BASE_URL}/pages/commercial-facade-improvement-program`,
    status: 'active',
  },
  {
    source: SOURCE,
    category: 'local',
    title: 'Minority Business Recovery & Growth Initiative',
    agency: 'Urban Redevelopment Authority of Pittsburgh',
    grant_type: 'grant',
    eligible_entities: ['small_business'],
    description: 'Grant and technical assistance program for minority-owned businesses in the Pittsburgh region. Supports business development, capacity building, and expansion.',
    how_to_apply: 'Contact URA Business Development at ura.org for program eligibility and application.',
    url: `${BASE_URL}/pages/financial-assistance-resources`,
    status: 'active',
  },
  {
    source: SOURCE,
    category: 'local',
    title: 'Pittsburgh Storefront Renovation Program',
    agency: 'Urban Redevelopment Authority of Pittsburgh',
    grant_type: 'grant',
    eligible_entities: ['small_business'],
    max_amount: 1500000, // $15,000 in cents
    description: 'Grants for interior and exterior storefront renovations to help Pittsburgh businesses improve their retail spaces and attract customers.',
    how_to_apply: 'Apply through the URA Commercial Lending division. Requires matching funds from applicant.',
    url: `${BASE_URL}/pages/financial-assistance-resources`,
    status: 'active',
  },
];

export async function ingestUraGrants(): Promise<GrantIngestionResult> {
  const start = Date.now();
  const grants: GrantRecord[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  // Add known programs first
  for (const prog of KNOWN_URA_PROGRAMS) {
    const hash = dedupHash(prog.title, prog.agency, prog.application_deadline ?? null);
    if (!seen.has(hash)) {
      seen.add(hash);
      grants.push({ ...prog, dedup_hash: hash });
    }
  }

  // Also scrape live pages to pick up any new programs
  for (const url of SCRAPE_URLS) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'GovConBot/1.0 (+https://govconassistant.pro)' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) continue;

      const $ = cheerio.load(await res.text());

      // Look for program headings/links
      $('h2, h3, h4').each((_, el) => {
        const $el = $(el);
        const title = $el.text().trim();
        if (!title || title.length < 10) return;
        if (!/grant|loan|fund|program|assistance|façade|facade|micro|minority/i.test(title)) return;

        const hash = dedupHash(title, 'Urban Redevelopment Authority of Pittsburgh', null);
        if (seen.has(hash)) return;
        seen.add(hash);

        // Get next sibling paragraph for description
        const desc = $el.next('p').text().trim().slice(0, 1000);
        const href = $el.find('a').attr('href') ?? $el.next('a').attr('href');
        const amounts = parseAmountFromText(title + ' ' + desc);

        grants.push({
          source: SOURCE,
          category: 'local',
          title,
          agency: 'Urban Redevelopment Authority of Pittsburgh',
          grant_type: detectGrantType(title + desc),
          eligible_entities: ['small_business', 'any'],
          ...amounts,
          description: desc || undefined,
          how_to_apply: href ? `Apply at ${href.startsWith('http') ? href : BASE_URL + href}` : `Visit ${url}`,
          url: href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : url,
          dedup_hash: hash,
          status: 'active',
        });
      });
    } catch (err) {
      errors.push(`URA ${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[ura_grants] ${grants.length} programs (${Date.now() - start}ms)`);
  return { source: SOURCE, grants, errors, durationMs: Date.now() - start };
}
