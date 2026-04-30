// ============================================================
// DUQUESNE UNIVERSITY — Procurement Scraper
// Source URL: https://www.duq.edu/about/administration/finance/procurement
// source = "education_duquesne"
// ============================================================

import * as cheerio from 'cheerio';
import {
  computeDedupHash, mapContractType, parseToIso, inferNaicsSectorFromKeywords,
  type ScrapedOpportunity, type ScraperResult,
} from '../shared/normalize_education';

const SOURCE = 'education_duquesne' as const;
const BASE_URL = 'https://www.duq.edu';
const SCRAPE_URL = `${BASE_URL}/about/administration/finance/procurement`;
const INSTITUTION = 'Duquesne University';

export async function scrapeDuquesne(): Promise<ScraperResult> {
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

    // Duquesne typically lists RFPs in a content area with links
    // Try table first
    $('table tr').each((_, row) => {
      const $row = $(row);
      if ($row.find('th').length > 0) return;

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
      const dept = cells.find((c) => c !== title && c !== dateCandidate && !/rfp|rfq|bid/i.test(c) && c.length > 2 && c.length < 80);
      const url = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : SCRAPE_URL;

      opportunities.push({
        source: SOURCE,
        title,
        agency_name: dept ? `Duquesne University — ${dept}` : INSTITUTION,
        dedup_hash: computeDedupHash(title, INSTITUTION, deadline ?? null),
        canonical_sources: [SOURCE],
        naics_sector: inferNaicsSectorFromKeywords(title),
        contract_type: mapContractType(cells.find((c) => /rfp|rfq|rfi|bid/i.test(c)) ?? title),
        threshold_category: 'unknown',
        deadline,
        place_of_performance_city: 'Pittsburgh',
        place_of_performance_state: 'PA',
        place_of_performance_zip: '15282',
        url,
        status: 'active',
        category: 'education',
      });
    });

    // Fallback: content sections and links
    if (opportunities.length === 0) {
      // Look for content blocks that describe solicitations
      const sections = $('p, li, .accordion-body, .field-item').toArray();
      for (const el of sections) {
        const $el = $(el);
        const linkEl = $el.find('a').first();
        const href = linkEl.attr('href') ?? '';
        const text = linkEl.text().trim() || $el.text().trim().slice(0, 140);
        if (!text || text.length < 8) continue;
        if (!/rfp|rfq|bid|solicitation|proposal|procurement/i.test(text + href)) continue;

        const key = text.toLowerCase().trim();
        if (seen.has(key)) continue;
        seen.add(key);

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
          place_of_performance_zip: '15282',
          url,
          status: 'active',
          category: 'education',
        });
      }
    }

    // Last resort: direct link scan
    if (opportunities.length === 0) {
      $('a[href]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') ?? '';
        const text = $a.text().trim();
        if (!text || text.length < 8) return;
        if (!/rfp|rfq|bid|solicitation|proposal/i.test(text + href)) return;
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
          place_of_performance_zip: '15282',
          url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
          status: 'active',
          category: 'education',
        });
      });
    }
  } catch (err) {
    errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`[duquesne] ${opportunities.length} scraped, ${errors.length} errors (${Date.now() - start}ms)`);
  return { source: SOURCE, opportunities, errors, durationMs: Date.now() - start };
}
