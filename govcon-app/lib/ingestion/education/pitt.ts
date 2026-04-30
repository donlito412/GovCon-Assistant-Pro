// ============================================================
// UNIVERSITY OF PITTSBURGH — RFP Scraper
// Source URL: https://www.ppt.pitt.edu/suppliers/info-suppliers/rfps
// source = "education_pitt"
// ============================================================

import * as cheerio from 'cheerio';
import {
  computeDedupHash, deriveThresholdCategory, mapContractType,
  parseToIso, parseDollarString, dollarsToCents, inferNaicsSectorFromKeywords,
  type ScrapedOpportunity, type ScraperResult,
} from '../shared/normalize_education';

const SOURCE = 'education_pitt' as const;
const BASE_URL = 'https://www.ppt.pitt.edu';
const SCRAPE_URL = `${BASE_URL}/suppliers/info-suppliers/rfps`;
const INSTITUTION = 'University of Pittsburgh';

export async function scrapePitt(): Promise<ScraperResult> {
  const start = Date.now();
  const opportunities: ScrapedOpportunity[] = [];
  const errors: string[] = [];

  try {
    const res = await fetch(SCRAPE_URL, {
      headers: { 'User-Agent': 'GovConBot/1.0 (+https://govconassistant.pro)' },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      errors.push(`HTTP ${res.status} fetching ${SCRAPE_URL}`);
      return { source: SOURCE, opportunities, errors, durationMs: Date.now() - start };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Pitt RFP page has a table or list of solicitations
    // Try table rows first, then list items
    const rows = $('table tr').toArray();
    const listItems = rows.length <= 1 ? $('ul li, ol li, .views-row, .rfp-item, article').toArray() : [];
    const elements = rows.length > 1 ? rows : listItems;

    for (const el of elements) {
      try {
        const $el = $(el);
        const text = $el.text().trim();
        if (!text || text.length < 10) continue;

        // Extract from table cells
        const cells = $el.find('td').toArray().map((c) => $(c).text().trim());
        const linkEl = $el.find('a').first();
        const link = linkEl.attr('href') ?? '';
        const linkText = linkEl.text().trim();

        // Detect header rows
        const isHeader = $el.is('th') || $el.find('th').length > 0 ||
          /solicitation|title|deadline|due date/i.test(cells[0] ?? '');
        if (isHeader) continue;

        const title = cells[0] || linkText || text.slice(0, 120);
        if (!title || title.length < 5) continue;

        // Solicitation number: usually in col 0 or col 1 if col 0 is a number
        let solNum: string | undefined;
        let titleFinal = title;
        const numMatch = title.match(/^([A-Z0-9-]+)\s+(.+)$/);
        if (numMatch) { solNum = numMatch[1]; titleFinal = numMatch[2]; }
        if (!solNum && cells[1]) { solNum = undefined; titleFinal = cells[0] || title; }

        // Deadline in various cols
        const deadlineRaw = cells.find((c) => /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(c));
        const deadline = parseToIso(deadlineRaw);

        // Department
        const department = cells[1] && !/\d{1,2}\//.test(cells[1]) ? cells[1] : undefined;

        const typeRaw = cells.find((c) => /rfp|rfq|rfi|bid|solicitation/i.test(c));
        const contractType = mapContractType(typeRaw);
        const dedupHash = computeDedupHash(titleFinal, INSTITUTION, deadline ?? null);
        const url = link ? (link.startsWith('http') ? link : `${BASE_URL}${link}`) : SCRAPE_URL;

        opportunities.push({
          source: SOURCE,
          title: titleFinal,
          agency_name: department ? `University of Pittsburgh — ${department}` : INSTITUTION,
          solicitation_number: solNum,
          dedup_hash: dedupHash,
          canonical_sources: [SOURCE],
          naics_sector: inferNaicsSectorFromKeywords(titleFinal),
          contract_type: contractType,
          threshold_category: 'unknown',
          deadline,
          place_of_performance_city: 'Pittsburgh',
          place_of_performance_state: 'PA',
          place_of_performance_zip: '15213',
          description: cells.slice(2).join(' | ').slice(0, 2000) || undefined,
          url,
          status: 'active',
          category: 'education',
        });
      } catch (rowErr) {
        errors.push(`Row parse error: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
      }
    }

    // Fallback: if no table rows found, try link-based extraction
    if (opportunities.length === 0) {
      $('a').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') ?? '';
        const linkTitle = $a.text().trim();
        if (!linkTitle || linkTitle.length < 10) return;
        if (!/rfp|rfq|solicitation|proposal|bid/i.test(linkTitle + href)) return;

        const dedupHash = computeDedupHash(linkTitle, INSTITUTION, null);
        const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        opportunities.push({
          source: SOURCE,
          title: linkTitle,
          agency_name: INSTITUTION,
          dedup_hash: dedupHash,
          canonical_sources: [SOURCE],
          naics_sector: inferNaicsSectorFromKeywords(linkTitle),
          contract_type: mapContractType(linkTitle),
          threshold_category: 'unknown',
          place_of_performance_city: 'Pittsburgh',
          place_of_performance_state: 'PA',
          place_of_performance_zip: '15213',
          url,
          status: 'active',
          category: 'education',
        });
      });
    }
  } catch (err) {
    errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`[pitt] ${opportunities.length} scraped, ${errors.length} errors (${Date.now() - start}ms)`);
  return { source: SOURCE, opportunities, errors, durationMs: Date.now() - start };
}
