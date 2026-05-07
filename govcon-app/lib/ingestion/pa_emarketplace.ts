// ============================================================
// PA eMarketplace — Commonwealth of Pennsylvania solicitations
// Source: https://www.emarketplace.state.pa.us/Search.aspx
// ============================================================

import * as cheerio from 'cheerio';
import { computeDedupHash, parseToIso, mapContractType } from './shared/normalize_shared';
import type { ScraperResult, ScrapedOpportunity } from './shared/normalize_shared';

const SOURCE = 'state_pa_emarketplace' as const;
const URLS = [
  'https://www.emarketplace.state.pa.us/Solicitations.aspx',
  'https://www.emarketplace.state.pa.us/Search.aspx',
];
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};
const TIMEOUT_MS = 25_000;

export async function scrapeEMarketplace(): Promise<ScraperResult> {
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

      // PA eMarketplace lists solicitations in <tr> rows inside a GridView.
      // Each row has cells: Solicitation #, Title, Agency, Issue Date, Close Date.
      $('table tr').each((_i, el) => {
        const tds = $(el).find('td');
        if (tds.length < 4) return;
        const solicitation = $(tds[0]).text().trim();
        const titleCell = $(tds[1]);
        const title = titleCell.text().trim();
        const agency = $(tds[2]).text().trim() || 'Commonwealth of PA';
        const closeText = $(tds[tds.length - 1]).text().trim();
        const link = titleCell.find('a').attr('href');
        if (!title || /^title$/i.test(title)) return; // skip header
        const detailUrl = link
          ? new URL(link, url).toString()
          : url;
        const deadlineIso = parseToIso(closeText) ?? undefined;

        opportunities.push({
          source: SOURCE,
          title,
          agency_name: agency,
          solicitation_number: solicitation || undefined,
          dedup_hash: computeDedupHash(title, agency, deadlineIso),
          canonical_sources: [SOURCE],
          contract_type: mapContractType('RFP'),
          threshold_category: 'unknown',
          deadline: deadlineIso,
          posted_date: undefined,
          place_of_performance_city: '',
          place_of_performance_state: 'PA',
          place_of_performance_zip: '',
          description: '',
          url: detailUrl,
          status: 'active',
        });
      });
      if (opportunities.length > 0) break; // first URL that returned data wins
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { source: SOURCE, opportunities, errors, durationMs: Date.now() - start };
}
