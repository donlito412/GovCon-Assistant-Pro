// ============================================================
// City of Pittsburgh procurement
// Sources (in priority order):
//   1. https://www.pittsburghpa.gov/Business-Development/Procurement/Bid-Opportunities
//   2. https://engage.pittsburghpa.gov/pittsburgh-workforce-development-hub/procurement-opportunities
//   3. https://pittsburgh.bonfirehub.com (Bonfire portal — historical)
// ============================================================

import * as cheerio from 'cheerio';
import { computeDedupHash, parseToIso, mapContractType } from './shared/normalize_shared';
import type { ScraperResult, ScrapedOpportunity } from './shared/normalize_shared';

const SOURCE = 'local_pittsburgh' as const;
const PRIMARY_URL = 'https://www.pittsburghpa.gov/Business-Development/Procurement/Bid-Opportunities';
const ENGAGE_URL = 'https://engage.pittsburghpa.gov/pittsburgh-workforce-development-hub/procurement-opportunities';
const PORTAL = 'https://pittsburgh.bonfirehub.com/portal/?tab=openOpportunities';
const API = 'https://pittsburgh.bonfirehub.com/api/portal/get-opportunities';
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json,text/html;q=0.9',
};
const TIMEOUT_MS = 25_000;

// Scrape any HTML page that lists bid opportunities, picking out anchors
// whose text matches RFP/RFQ/IFB/SOQ/Bid keywords.
async function scrapeCityHtml(url: string): Promise<{ opportunities: ScrapedOpportunity[]; errors: string[] }> {
  const opportunities: ScrapedOpportunity[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) {
      errors.push(`${url}: HTTP ${res.status}`);
      return { opportunities, errors };
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    const KW = /RFP|RFQ|IFB|SOQ|RFI|Bid|Solicitation|Proposal|Quote|Procurement/i;

    // Anchor-based extraction (most listings are <a> tags)
    $('a').each((_i, el) => {
      const $a = $(el);
      const text = $a.text().replace(/\s+/g, ' ').trim();
      if (!text || text.length < 8 || text.length > 220) return;
      if (!KW.test(text)) return;
      const href = $a.attr('href');
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
      const detailUrl = new URL(href, url).toString();
      if (seen.has(detailUrl)) return;
      seen.add(detailUrl);

      // Try to find a date near the anchor (parent or sibling)
      const ctx = $a.parent().text() || '';
      const deadlineIso = parseToIso(ctx) ?? undefined;

      opportunities.push({
        source: SOURCE,
        title: text.slice(0, 200),
        agency_name: 'City of Pittsburgh',
        solicitation_number: undefined,
        dedup_hash: computeDedupHash(text, 'City of Pittsburgh', deadlineIso),
        canonical_sources: [SOURCE],
        contract_type: mapContractType(text),
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
  return { opportunities, errors };
}

export async function scrapePittsburghCity(): Promise<ScraperResult> {
  const start = Date.now();
  const opportunities: ScrapedOpportunity[] = [];
  const errors: string[] = [];

  // PRIMARY: pittsburghpa.gov Bid Opportunities page
  const primary = await scrapeCityHtml(PRIMARY_URL);
  opportunities.push(...primary.opportunities);
  errors.push(...primary.errors);

  // SECONDARY: engage.pittsburghpa.gov procurement opportunities
  const engage = await scrapeCityHtml(ENGAGE_URL);
  // Dedup by url against primary
  const seenUrls = new Set(opportunities.map((o) => o.url));
  for (const o of engage.opportunities) {
    if (!seenUrls.has(o.url)) {
      opportunities.push(o);
      seenUrls.add(o.url);
    }
  }
  errors.push(...engage.errors);

  // Try Bonfire's API endpoint as a fallback for any extras
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(API, { headers: HEADERS, signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data?.opportunities) ? data.opportunities :
                   Array.isArray(data?.data) ? data.data :
                   Array.isArray(data) ? data : [];
      for (const o of list) {
        const title = (o.title || o.name || o.projectName || '').toString().trim();
        if (!title) continue;
        const url = o.url || `${PORTAL}#${o.id ?? ''}`;
        const deadline = parseToIso(o.closeDate || o.dueDate || o.endDate) ?? undefined;
        const posted = parseToIso(o.openDate || o.startDate || o.publishDate) ?? undefined;
        opportunities.push({
          source: SOURCE,
          title,
          agency_name: o.agency || o.department || 'City of Pittsburgh',
          solicitation_number: (o.referenceNumber || o.solicitationNumber || '').toString() || undefined,
          dedup_hash: computeDedupHash(title, 'City of Pittsburgh', deadline),
          canonical_sources: [SOURCE],
          contract_type: mapContractType(o.type || 'RFP'),
          threshold_category: 'unknown',
          deadline,
          posted_date: posted,
          place_of_performance_city: 'Pittsburgh',
          place_of_performance_state: 'PA',
          place_of_performance_zip: '15219',
          description: (o.description || '').toString(),
          url,
          status: 'active',
        });
      }
    } else {
      errors.push(`Bonfire API HTTP ${res.status}`);
    }
  } catch (err) {
    errors.push(`Bonfire API: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Fallback: scrape the portal HTML for embedded data
  if (opportunities.length === 0) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const res = await fetch(PORTAL, { headers: HEADERS, signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const html = await res.text();
        const m = html.match(/__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
        if (m) {
          try {
            const state = JSON.parse(m[1]);
            const list: any[] = state?.opportunities?.list || state?.openOpportunities || [];
            for (const o of list) {
              const title = (o.title || o.name || '').toString().trim();
              if (!title) continue;
              const deadline = parseToIso(o.closeDate || o.dueDate) ?? undefined;
              opportunities.push({
                source: SOURCE,
                title,
                agency_name: o.agency || 'City of Pittsburgh',
                solicitation_number: (o.referenceNumber || '').toString() || undefined,
                dedup_hash: computeDedupHash(title, 'City of Pittsburgh', deadline),
                canonical_sources: [SOURCE],
                contract_type: mapContractType(o.type || 'RFP'),
                threshold_category: 'unknown',
                deadline,
                posted_date: parseToIso(o.openDate || o.publishDate) ?? undefined,
                place_of_performance_city: 'Pittsburgh',
                place_of_performance_state: 'PA',
                place_of_performance_zip: '15219',
                description: (o.description || '').toString(),
                url: o.url || PORTAL,
                status: 'active',
              });
            }
          } catch (e) {
            errors.push(`Bonfire JSON parse: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      } else {
        errors.push(`Bonfire portal HTTP ${res.status}`);
      }
    } catch (err) {
      errors.push(`Bonfire portal: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { source: SOURCE, opportunities, errors, durationMs: Date.now() - start };
}
