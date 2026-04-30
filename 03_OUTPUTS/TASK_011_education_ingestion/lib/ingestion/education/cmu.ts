// ============================================================
// CARNEGIE MELLON UNIVERSITY — Procurement Scraper
// Source URL: https://www.cmu.edu/finance/procurementservices/doing-business/index.html
// source = "education_cmu"
// ============================================================

import * as cheerio from 'cheerio';
import {
  computeDedupHash, mapContractType, parseToIso, inferNaicsSectorFromKeywords,
  type ScrapedOpportunity, type ScraperResult,
} from '../shared/normalize_education';

const SOURCE = 'education_cmu' as const;
const BASE_URL = 'https://www.cmu.edu';
const SCRAPE_URL = `${BASE_URL}/finance/procurementservices/doing-business/index.html`;
const INSTITUTION = 'Carnegie Mellon University';

export async function scrapeCmu(): Promise<ScraperResult> {
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

    // CMU uses a content area with solicitation details
    // Strategy: find all links and content blocks that reference solicitations/RFPs
    const seen = new Set<string>();

    // Try table rows
    $('table tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td').toArray().map((c) => $(c).text().trim());
      if (cells.length < 2) return;

      const title = cells[0];
      if (!title || title.length < 5) return;
      if (/solicitation|opportunity|title|rfp|due date/i.test(title) && cells.length >= 2) {
        // likely header
        if (cells.every((c) => /solicitation|title|date|type|department/i.test(c))) return;
      }

      const linkEl = $row.find('a').first();
      const href = linkEl.attr('href') ?? '';
      const deadline = parseToIso(cells.find((c) => /\d{1,2}\/\d{1,2}\/\d{4}/.test(c)));
      const typeRaw = cells.find((c) => /rfp|rfq|rfi|bid|proposal|solicitation/i.test(c));
      const key = title.toLowerCase().trim();
      if (seen.has(key)) return;
      seen.add(key);

      const dedupHash = computeDedupHash(title, INSTITUTION, deadline ?? null);
      const url = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : SCRAPE_URL;

      opportunities.push({
        source: SOURCE,
        title,
        agency_name: cells[1] && !/\d/.test(cells[1]) ? `Carnegie Mellon — ${cells[1]}` : INSTITUTION,
        dedup_hash: dedupHash,
        canonical_sources: [SOURCE],
        naics_sector: inferNaicsSectorFromKeywords(title),
        contract_type: mapContractType(typeRaw),
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

    // Fallback: link scan for solicitation-related links
    if (opportunities.length === 0) {
      $('a[href]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') ?? '';
        const text = $a.text().trim();
        if (!text || text.length < 8) return;
        if (!/rfp|rfq|solicitation|bid|proposal|procurement/i.test(text + href)) return;
        const key = text.toLowerCase().trim();
        if (seen.has(key)) return;
        seen.add(key);

        const dedupHash = computeDedupHash(text, INSTITUTION, null);
        const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        opportunities.push({
          source: SOURCE,
          title: text,
          agency_name: INSTITUTION,
          dedup_hash: dedupHash,
          canonical_sources: [SOURCE],
          naics_sector: inferNaicsSectorFromKeywords(text),
          contract_type: mapContractType(text),
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

  console.log(`[cmu] ${opportunities.length} scraped, ${errors.length} errors (${Date.now() - start}ms)`);
  return { source: SOURCE, opportunities, errors, durationMs: Date.now() - start };
}
