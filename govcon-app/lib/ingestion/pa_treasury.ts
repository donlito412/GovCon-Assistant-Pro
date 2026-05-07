// ============================================================
// PA Treasury Contracts e-Library
// Source: https://contracts.patreasury.gov/Search.aspx
// ============================================================

import * as cheerio from 'cheerio';
import { computeDedupHash, parseToIso, mapContractType } from './shared/normalize_shared';
import type { ScraperResult, ScrapedOpportunity } from './shared/normalize_shared';

const SOURCE = 'state_pa_treasury' as const;
const URL_BASE = 'https://contracts.patreasury.gov';
const SEARCH_URL = `${URL_BASE}/Search.aspx`;
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html',
};
const TIMEOUT_MS = 25_000;

export async function scrapePaTreasury(): Promise<ScraperResult> {
  const start = Date.now();
  const opportunities: ScrapedOpportunity[] = [];
  const errors: string[] = [];

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(SEARCH_URL, { headers: HEADERS, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) {
      errors.push(`HTTP ${res.status}`);
      return { source: SOURCE, opportunities, errors, durationMs: Date.now() - start };
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    $('table tr').each((_i, el) => {
      const tds = $(el).find('td');
      if (tds.length < 3) return;
      const titleCell = $(tds[0]);
      const title = titleCell.text().trim();
      const agency = $(tds[1]).text().trim() || 'PA Treasury';
      const dateText = $(tds[tds.length - 1]).text().trim();
      const link = titleCell.find('a').attr('href');
      if (!title || /^contract|title$/i.test(title)) return;
      const url = link ? new URL(link, URL_BASE).toString() : SEARCH_URL;
      const deadlineIso = parseToIso(dateText) ?? undefined;
      opportunities.push({
        source: SOURCE,
        title,
        agency_name: agency,
        solicitation_number: undefined,
        dedup_hash: computeDedupHash(title, agency, deadlineIso),
        canonical_sources: [SOURCE],
        contract_type: mapContractType('Other'),
        threshold_category: 'unknown',
        deadline: deadlineIso,
        posted_date: undefined,
        place_of_performance_city: '',
        place_of_performance_state: 'PA',
        place_of_performance_zip: '',
        description: '',
        url,
        status: 'active',
      });
    });
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  return { source: SOURCE, opportunities, errors, durationMs: Date.now() - start };
}
