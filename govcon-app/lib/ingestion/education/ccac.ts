// ============================================================
// CCAC — Community College of Allegheny County Scraper
// Source URL: https://www.ccac.edu/about/procurement.php
// source = "education_ccac"
// ============================================================

import * as cheerio from 'cheerio';
import {
  computeDedupHash, mapContractType, parseToIso, inferNaicsSectorFromKeywords,
  type ScrapedOpportunity, type ScraperResult,
} from '../shared/normalize_education';

const SOURCE = 'education_ccac' as const;
const BASE_URL = 'https://www.ccac.edu';
const SCRAPE_URL = `${BASE_URL}/about/procurement.php`;
const INSTITUTION = 'Community College of Allegheny County';

export async function scrapeCcac(): Promise<ScraperResult> {
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

    // CCAC procurement page typically has a table with bid number, title, due date
    $('table tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td').toArray().map((c) => $(c).text().trim());
      if (cells.length < 2) return;

      // Skip header rows
      if (cells.every((c) => /bid|number|title|due|date|description|contact/i.test(c))) return;

      const linkEl = $row.find('a').first();
      const href = linkEl.attr('href') ?? '';

      // Detect bid number pattern: e.g. "2024-001", "IFB-2024-01"
      const bidNumCandidate = cells[0];
      const isBidNum = /^\d{4}|^[A-Z]+-\d+|^ITB|^IFB|^RFP|^RFQ/i.test(bidNumCandidate ?? '');

      const title = isBidNum ? (cells[1] || linkEl.text().trim()) : (cells[0] || linkEl.text().trim());
      const solNum = isBidNum ? bidNumCandidate : undefined;

      if (!title || title.length < 5) return;
      const key = title.toLowerCase().trim();
      if (seen.has(key)) return;
      seen.add(key);

      const dateCandidate = cells.find((c) => /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/.test(c));
      const deadline = parseToIso(dateCandidate);
      const typeRaw = cells.find((c) => /rfp|rfq|rfi|ifb|itb|bid|solicitation/i.test(c)) ?? title;
      const url = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : SCRAPE_URL;
      const description = cells.filter((c) => c !== title && c !== solNum && c !== dateCandidate).join(' | ').slice(0, 1000) || undefined;

      const dedupHash = computeDedupHash(title, INSTITUTION, deadline ?? null);

      opportunities.push({
        source: SOURCE,
        title,
        agency_name: INSTITUTION,
        solicitation_number: solNum,
        dedup_hash: dedupHash,
        canonical_sources: [SOURCE],
        naics_sector: inferNaicsSectorFromKeywords(title),
        contract_type: mapContractType(typeRaw),
        threshold_category: 'unknown',
        deadline,
        place_of_performance_city: 'Pittsburgh',
        place_of_performance_state: 'PA',
        place_of_performance_zip: '15212',
        description,
        url,
        status: 'active',
        category: 'education',
      });
    });

    // Fallback: scan for bid/RFP links
    if (opportunities.length === 0) {
      $('a[href]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') ?? '';
        const text = $a.text().trim();
        if (!text || text.length < 8) return;
        if (!/rfp|rfq|ifb|itb|bid|solicitation|proposal/i.test(text + href)) return;
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
          place_of_performance_zip: '15212',
          url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
          status: 'active',
          category: 'education',
        });
      });
    }
  } catch (err) {
    errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`[ccac] ${opportunities.length} scraped, ${errors.length} errors (${Date.now() - start}ms)`);
  return { source: SOURCE, opportunities, errors, durationMs: Date.now() - start };
}
