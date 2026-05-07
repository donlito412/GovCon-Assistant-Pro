// ============================================================
// Urban Redevelopment Authority of Pittsburgh (URA)
// Source: https://www.ura.org/pages/business-opportunities
// ============================================================

import * as cheerio from 'cheerio';
import { computeDedupHash, parseToIso, mapContractType } from './shared/normalize_shared';
import type { ScraperResult, ScrapedOpportunity } from './shared/normalize_shared';

const SOURCE = 'local_ura' as const;
const URLS = [
  'https://www.ura.org/pages/business-opportunities',
  'https://www.ura.org/pages/rfp-rfq',
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

      // URA's opportunity blocks: look for headings + adjacent links/description
      $('h2, h3, .opportunity, article').each((_i, el) => {
        const $el = $(el);
        const title = $el.text().trim().slice(0, 200);
        if (!title || title.length < 8) return;

        // Heuristic: it's an opportunity if heading mentions RFP/RFQ/IFB/SOQ etc.
        if (!/RFP|RFQ|IFB|SOQ|RFI|Bid|Solicitation|Proposal/i.test(title)) return;

        const linkEl = $el.find('a').first();
        const link = linkEl.attr('href');
        const detailUrl = link ? new URL(link, url).toString() : url;

        // Look for nearby date text
        let dateText = $el.next().text().trim().slice(0, 100);
        if (!dateText) dateText = $el.parent().text().slice(0, 200);
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
      if (opportunities.length > 0) break;
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { source: SOURCE, opportunities, errors, durationMs: Date.now() - start };
}
