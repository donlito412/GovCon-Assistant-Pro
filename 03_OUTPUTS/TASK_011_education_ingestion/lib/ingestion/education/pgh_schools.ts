// ============================================================
// PITTSBURGH PUBLIC SCHOOLS — Bids & Proposals Scraper
// Source URL: https://www.pghschools.org/community/business-opportunities/bids-proposals
// source = "education_pgh_schools"
// ============================================================

import * as cheerio from 'cheerio';
import {
  computeDedupHash, mapContractType, parseToIso, inferNaicsSectorFromKeywords,
  type ScrapedOpportunity, type ScraperResult,
} from '../shared/normalize_education';

const SOURCE = 'education_pgh_schools' as const;
const BASE_URL = 'https://www.pghschools.org';
const SCRAPE_URL = `${BASE_URL}/community/business-opportunities/bids-proposals`;
const INSTITUTION = 'Pittsburgh Public Schools';

export async function scrapePghSchools(): Promise<ScraperResult> {
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
    const seen = new Set<string>();

    // PGH Schools may use a cms list, table, or accordion
    // Try table first
    $('table tr').each((_, row) => {
      const $row = $(row);
      if ($row.find('th').length > 0) return; // skip header rows

      const cells = $row.find('td').toArray().map((c) => $(c).text().trim());
      if (cells.length < 2) return;

      const linkEl = $row.find('a').first();
      const href = linkEl.attr('href') ?? '';
      const title = cells[0] || linkEl.text().trim();
      if (!title || title.length < 5) return;

      const key = title.toLowerCase().trim();
      if (seen.has(key)) return;
      seen.add(key);

      const dateCandidate = cells.find((c) => /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/.test(c));
      const deadline = parseToIso(dateCandidate);
      const solNum = cells[1] && /^[\dA-Z-]+$/.test(cells[1]) ? cells[1] : undefined;
      const url = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : SCRAPE_URL;

      opportunities.push({
        source: SOURCE,
        title,
        agency_name: INSTITUTION,
        solicitation_number: solNum,
        dedup_hash: computeDedupHash(title, INSTITUTION, deadline ?? null),
        canonical_sources: [SOURCE],
        naics_sector: inferNaicsSectorFromKeywords(title),
        contract_type: mapContractType(title),
        threshold_category: 'unknown',
        deadline,
        place_of_performance_city: 'Pittsburgh',
        place_of_performance_state: 'PA',
        place_of_performance_zip: '15213',
        url,
        status: 'active',
        category: 'education',
      });
    });

    // Fallback: CMS content blocks — look for list items or article cards
    if (opportunities.length === 0) {
      const selectors = [
        '.views-row', '.field-item', 'article', '.bid-item',
        'li:has(a)', '.accordion-body li', '.content-block li',
      ];
      for (const sel of selectors) {
        $(sel).each((_, el) => {
          const $el = $(el);
          const linkEl = $el.find('a').first();
          const href = linkEl.attr('href') ?? '';
          const text = linkEl.text().trim() || $el.text().trim().slice(0, 140);
          if (!text || text.length < 8) return;
          if (!/bid|rfp|rfq|proposal|solicitation|contract/i.test(text + href)) return;

          const key = text.toLowerCase().trim();
          if (seen.has(key)) return;
          seen.add(key);

          // Try to extract date from surrounding text
          const fullText = $el.text();
          const dateMatch = fullText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
          const deadline = dateMatch ? parseToIso(dateMatch[1]) : undefined;
          const url = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : SCRAPE_URL;

          opportunities.push({
            source: SOURCE,
            title: text,
            agency_name: INSTITUTION,
            dedup_hash: computeDedupHash(text, INSTITUTION, deadline ?? null),
            canonical_sources: [SOURCE],
            naics_sector: inferNaicsSectorFromKeywords(text),
            contract_type: mapContractType(text),
            threshold_category: 'unknown',
            deadline,
            place_of_performance_city: 'Pittsburgh',
            place_of_performance_state: 'PA',
            place_of_performance_zip: '15213',
            url,
            status: 'active',
            category: 'education',
          });
        });
        if (opportunities.length > 0) break;
      }
    }

    // Last resort: any link referencing bids/proposals on the page
    if (opportunities.length === 0) {
      $('a[href]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') ?? '';
        const text = $a.text().trim();
        if (!text || text.length < 8) return;
        if (!/bid|rfp|proposal|solicitation/i.test(text + href)) return;
        const key = text.toLowerCase().trim();
        if (seen.has(key)) return;
        seen.add(key);

        opportunities.push({
          source: SOURCE,
          title: text,
          agency_name: INSTITUTION,
          dedup_hash: computeDedupHash(text, INSTITUTION, null),
          canonical_sources: [SOURCE],
          naics_sector: inferNaicsSectorFromKeywords(text),
          contract_type: mapContractType(text),
          threshold_category: 'unknown',
          place_of_performance_city: 'Pittsburgh',
          place_of_performance_state: 'PA',
          place_of_performance_zip: '15213',
          url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
          status: 'active',
          category: 'education',
        });
      });
    }
  } catch (err) {
    errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`[pgh_schools] ${opportunities.length} scraped, ${errors.length} errors (${Date.now() - start}ms)`);
  return { source: SOURCE, opportunities, errors, durationMs: Date.now() - start };
}
