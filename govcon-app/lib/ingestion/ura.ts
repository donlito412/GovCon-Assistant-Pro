// ============================================================
// Urban Redevelopment Authority of Pittsburgh (URA)
// Source: https://www.ura.org/pages/business-opportunities
// ============================================================

import * as cheerio from 'cheerio';
import { computeDedupHash, parseToIso, mapContractType } from './shared/normalize_shared';
import type { ScraperResult, ScrapedOpportunity } from './shared/normalize_shared';

const SOURCE = 'local_ura' as const;
const URLS = [
  'https://www.ura.org/proposals',
  'https://www.ura.org/pages/contractor',
  'https://www.ura.org/pages/business-opportunities',
];
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html',
};
const TIMEOUT_MS = 25_000;

export async function scrapeURA(): Promise<ScraperResult> {
  const start = Date.now();
  const opportunities: ScrapedOpportunity[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const url of URLS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) {
        errors.push(`${url}: HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      const $ = cheerio.load(html);

      $('a[href*="/proposals/"], a[href*="ionwave"], a[href*="Login.aspx"]').each((_i, el) => {
        const $a = $(el);
        const title = $a.text().replace(/\s+/g, ' ').trim().slice(0, 200);
        const href = $a.attr('href');
        if (!href || !title || title.length < 6) return;
        if (/register|login|supplier registration|how to register/i.test(title)) return;
        if (!/RFP|RFQ|IFB|SOQ|RFI|Bid|Solicitation|Proposal|Qualifications|Services/i.test(title)) return;

        const detailUrl = new URL(href, url).toString();
        if (seen.has(detailUrl)) return;
        seen.add(detailUrl);

        const dateText = $a.closest('article, li, div, section').text().replace(/\s+/g, ' ').trim().slice(0, 250);
        const deadlineIso = parseToIso(dateText) ?? undefined;

        opportunities.push({
          source: SOURCE,
          title,
          agency_name: 'Urban Redevelopment Authority of Pittsburgh',
          solicitation_number: undefined,
          dedup_hash: computeDedupHash(title, 'URA', deadlineIso),
          canonical_sources: [SOURCE],
          contract_type: mapContractType(title),
          threshold_category: 'unknown',
          deadline: deadlineIso,
          posted_date: undefined,
          place_of_performance_city: 'Pittsburgh',
          place_of_performance_state: 'PA',
          place_of_performance_zip: '15219',
          description: '',
          url: detailUrl,
          status: 'active',
        });
      });
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { source: SOURCE, opportunities, errors, durationMs: Date.now() - start };
}
