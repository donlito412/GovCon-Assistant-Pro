// ============================================================
// Shared helper for education scrapers.
// Each university hosts a procurement / bid page. The structure is
// always: a list of links/headings naming RFP/RFQ/IFB documents.
// We grep for that and return them.
// ============================================================

import * as cheerio from 'cheerio';
import {
  computeDedupHash,
  parseToIso,
  mapContractType,
} from '../shared/normalize_shared';
import type { OpportunitySource, ContractType, ThresholdCategory } from '@/lib/types';

export interface EduOpportunity {
  source: OpportunitySource;
  title: string;
  agency_name: string;
  solicitation_number?: string;
  dedup_hash: string;
  canonical_sources: OpportunitySource[];
  contract_type: ContractType;
  threshold_category: ThresholdCategory;
  deadline?: string;
  posted_date?: string;
  place_of_performance_city?: string;
  place_of_performance_state?: string;
  place_of_performance_zip?: string;
  description?: string;
  url?: string;
  status: 'active';
  category: 'education';
}

export interface EduScraperResult {
  source: OpportunitySource;
  opportunities: EduOpportunity[];
  errors: string[];
  durationMs: number;
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'text/html',
};
const TIMEOUT_MS = 25_000;

const KEYWORD_RE = /RFP|RFQ|IFB|SOQ|RFI|Bid|Solicitation|Proposal|Quote/i;

/**
 * Generic procurement-page scraper for university sites.
 * Fetches each url in turn until one returns matching content; extracts
 * any link or heading that mentions an RFP/RFQ/etc.
 */
export async function scrapeEducationSite(opts: {
  source: OpportunitySource;
  agency: string;
  urls: string[];
  city?: string;
  zip?: string;
}): Promise<EduScraperResult> {
  const start = Date.now();
  const opportunities: EduOpportunity[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const url of opts.urls) {
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

      // Grab anchors first — most procurement pages list bids as <a> elements
      $('a').each((_i, el) => {
        const $a = $(el);
        const text = $a.text().replace(/\s+/g, ' ').trim();
        if (!text || text.length < 8 || text.length > 200) return;
        if (!KEYWORD_RE.test(text)) return;
        const href = $a.attr('href');
        if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        const detailUrl = new URL(href, url).toString();
        if (seen.has(detailUrl)) return;
        seen.add(detailUrl);

        const dedup = computeDedupHash(text, opts.agency, null);
        opportunities.push({
          source: opts.source,
          title: text,
          agency_name: opts.agency,
          solicitation_number: undefined,
          dedup_hash: dedup,
          canonical_sources: [opts.source],
          contract_type: mapContractType(text),
          threshold_category: 'unknown',
          deadline: undefined,
          posted_date: undefined,
          place_of_performance_city: opts.city ?? 'Pittsburgh',
          place_of_performance_state: 'PA',
          place_of_performance_zip: opts.zip ?? '15219',
          description: '',
          url: detailUrl,
          status: 'active',
          category: 'education',
        });
      });

      if (opportunities.length > 0) break;

      // Fallback: headings + nearby text
      $('h2, h3, h4, .bid, .rfp, .opportunity').each((_i, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (!text || text.length < 8 || text.length > 200) return;
        if (!KEYWORD_RE.test(text)) return;
        const dedup = computeDedupHash(text, opts.agency, null);
        if (seen.has(dedup)) return;
        seen.add(dedup);
        opportunities.push({
          source: opts.source,
          title: text,
          agency_name: opts.agency,
          dedup_hash: dedup,
          canonical_sources: [opts.source],
          contract_type: mapContractType(text),
          threshold_category: 'unknown',
          place_of_performance_city: opts.city ?? 'Pittsburgh',
          place_of_performance_state: 'PA',
          place_of_performance_zip: opts.zip ?? '15219',
          description: '',
          url,
          status: 'active',
          category: 'education',
        });
      });
      if (opportunities.length > 0) break;
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    source: opts.source,
    opportunities,
    errors,
    durationMs: Date.now() - start,
  };
}
