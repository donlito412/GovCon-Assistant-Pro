// ============================================================
// Housing Authority of the City of Pittsburgh (HACP)
// Source: https://hacp.org/business-with-us/contracting-procurement/
//         https://www.hacp.org (alternate)
// ============================================================

import * as cheerio from 'cheerio';
import { computeDedupHash, parseToIso, mapContractType } from './shared/normalize_shared';
import type { ScraperResult, ScrapedOpportunity } from './shared/normalize_shared';

const SOURCE = 'local_housing_authority' as const;
const URLS = [
  'https://hacp.org/doing-business/procurement-search/?procurement-end-date=&procurement-open%5B%5D=all&procurement-start-date=&procurement_search=true',
  'https://hacp.org/doing-business/',
  'https://hacp.org/business-with-us/contracting-procurement/',
];
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html',
};
const TIMEOUT_MS = 25_000;

export async function scrapeHousingAuthority(): Promise<ScraperResult> {
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

      $('a[href*="/procurements/"], a[href*=".pdf"], a[href*="solicitation"], a[href*="rfp"], a[href*="ifb"]').each((_i, el) => {
        const $a = $(el);
        const href = $a.attr('href');
        if (!href) return;
        const title = $a.text().replace(/\s+/g, ' ').trim();
        if (!title || title.length < 6) return;
        if (!/RFP|RFQ|IFB|SOQ|RFI|Bid|Solicitation|Proposal|Quote/i.test(title)) return;

        const detailUrl = new URL(href, url).toString();
        if (seen.has(detailUrl)) return;
        seen.add(detailUrl);

        const context = $a.closest('article, li, tr, div, section').text().replace(/\s+/g, ' ').trim();
        const deadlineIso = parseToIso(context) ?? undefined;
        const dedup = computeDedupHash(title, 'HACP', deadlineIso ?? null);
        opportunities.push({
          source: SOURCE,
          title: title.slice(0, 200),
          agency_name: 'Housing Authority of the City of Pittsburgh',
          solicitation_number: undefined,
          dedup_hash: dedup,
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
