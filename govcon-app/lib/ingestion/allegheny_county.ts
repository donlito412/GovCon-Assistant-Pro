// ============================================================
// ALLEGHENY COUNTY PURCHASING SCRAPER
// Sources:
//   Purchasing:   https://www.alleghenycounty.us/Projects-and-Initiatives/Doing-Business-with-Allegheny-County-Bids-and-Solicitations/Purchasing-Bids-and-Proposals
//   Public Works: https://www.alleghenycounty.us/Projects-and-Initiatives/Doing-Business-with-Allegheny-County-Bids-and-Solicitations/Public-Works-Bids-and-Proposals
// Type: HTML scraper (fetch + cheerio)
// Auth: None
// ============================================================

import * as cheerio from 'cheerio';
import type { ScraperResult, ScrapedOpportunity } from './shared/normalize_shared';
import {
  computeDedupHash,
  deriveThresholdCategory,
  mapContractType,
  parseDollarString,
  dollarsToCents,
  parseToIso,
  getNaicsSector,
} from './shared/normalize_shared';

const SOURCE = 'local_allegheny' as const;
const FETCH_TIMEOUT_MS = 30_000;

const PURCHASING_URL =
  'https://www.alleghenycounty.us/Projects-and-Initiatives/Doing-Business-with-Allegheny-County-Bids-and-Solicitations/Purchasing-Bids-and-Proposals';
const PUBLIC_WORKS_URL =
  'https://www.alleghenycounty.us/Projects-and-Initiatives/Doing-Business-with-Allegheny-County-Bids-and-Solicitations/Public-Works-Bids-and-Proposals';

const HEADERS = {
  'User-Agent':
    'GovConAssistantBot/1.0 (+https://github.com/donlito412/GovCon-Assistant-Pro; research/data-aggregation)',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

interface RawBid {
  bidNumber: string;
  title: string;
  department: string;
  dueDate: string;
  openDate: string;
  contact: string;
  detailUrl: string;
  isPublicWorks: boolean;
}

/**
 * Parses an Allegheny County bids/proposals page.
 * Both purchasing and public works use a similar table layout.
 */
function parseBidsPage(html: string, sourceUrl: string, isPublicWorks: boolean): RawBid[] {
  const $ = cheerio.load(html);
  const bids: RawBid[] = [];

  // Allegheny County uses a <table> or <div>-based layout for their bid listings
  // Try table rows first
  let found = false;

  $('table tr, .bid-row, .solicitation-row').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;

    // Skip header rows
    const firstCellText = $(cells[0]).text().trim();
    if (
      firstCellText.toLowerCase().includes('bid number') ||
      firstCellText.toLowerCase().includes('solicitation') ||
      !firstCellText
    ) return;

    const bidNumber = $(cells[0]).text().trim();
    const title = $(cells[1]).text().trim();
    if (!title) return;

    found = true;
    const department = cells.length > 2 ? $(cells[2]).text().trim() : 'Allegheny County';
    const openDate = cells.length > 3 ? $(cells[3]).text().trim() : '';
    const dueDate = cells.length > 4 ? $(cells[4]).text().trim() : $(cells[cells.length - 1]).text().trim();
    const contact = cells.length > 5 ? $(cells[5]).text().trim() : '';

    const link =
      $(cells[0]).find('a').attr('href') ||
      $(cells[1]).find('a').attr('href') ||
      '';
    const detailUrl = link.startsWith('http')
      ? link
      : link
      ? `https://www.alleghenycounty.us${link.startsWith('/') ? '' : '/'}${link}`
      : sourceUrl;

    bids.push({ bidNumber, title, department, dueDate, openDate, contact, detailUrl, isPublicWorks });
  });

  // Fallback: parse any <li> or <p> elements that look like solicitation entries
  if (!found) {
    $('ul li, .field-item p').each((_, el) => {
      const text = $(el).text().trim();
      if (!text || text.length < 10) return;

      const link = $(el).find('a').attr('href') || '';
      const linkText = $(el).find('a').text().trim();
      const detailUrl = link.startsWith('http')
        ? link
        : link
        ? `https://www.alleghenycounty.us${link}`
        : sourceUrl;

      if (linkText) {
        bids.push({
          bidNumber: '',
          title: linkText,
          department: 'Allegheny County',
          dueDate: '',
          openDate: '',
          contact: '',
          detailUrl,
          isPublicWorks,
        });
      }
    });
  }

  return bids;
}

/**
 * Main Allegheny County scraper.
 * Scrapes both Purchasing and Public Works bid pages.
 */
export async function scrapeAlleghenyCounty(): Promise<ScraperResult> {
  const start = Date.now();
  const opportunities: ScrapedOpportunity[] = [];
  const errors: string[] = [];

  console.log('[allegheny_county] Starting scrape (purchasing + public works)...');

  const pages: Array<{ url: string; isPublicWorks: boolean; label: string }> = [
    { url: PURCHASING_URL, isPublicWorks: false, label: 'Purchasing' },
    { url: PUBLIC_WORKS_URL, isPublicWorks: true, label: 'Public Works' },
  ];

  for (const page of pages) {
    let html: string;
    try {
      html = await fetchHtml(page.url);
    } catch (err) {
      const msg = `Failed to fetch ${page.label} page: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[allegheny_county] ${msg}`);
      errors.push(msg);
      continue;
    }

    const bids = parseBidsPage(html, page.url, page.isPublicWorks);
    console.log(`[allegheny_county] ${page.label}: Found ${bids.length} bid(s).`);

    for (const bid of bids) {
      try {
        const title = bid.title || `Bid ${bid.bidNumber}`;
        const agency = bid.department || 'Allegheny County';
        const deadline = parseToIso(bid.dueDate);
        const postedDate = parseToIso(bid.openDate);

        // Public Works bids are typically IFB/construction
        const contractType = bid.isPublicWorks
          ? mapContractType('IFB')
          : mapContractType(title);

        const dedupHash = computeDedupHash(title, agency, deadline ?? null);

        const opp: ScrapedOpportunity = {
          source: SOURCE,
          title,
          agency_name: agency,
          solicitation_number: bid.bidNumber || undefined,
          dedup_hash: dedupHash,
          canonical_sources: [SOURCE],
          naics_code: bid.isPublicWorks ? 237 : undefined, // 237 = Heavy & Civil Engineering Construction
          naics_sector: bid.isPublicWorks ? 'Construction' : undefined,
          contract_type: contractType,
          threshold_category: 'unknown',
          set_aside_type: undefined,
          value_min: undefined,
          value_max: undefined,
          deadline,
          posted_date: postedDate,
          place_of_performance_city: 'Pittsburgh',
          place_of_performance_state: 'PA',
          place_of_performance_zip: undefined,
          description: bid.contact ? `Contact: ${bid.contact}` : undefined,
          url: bid.detailUrl,
          status: 'active',
        };

        opportunities.push(opp);
      } catch (err) {
        const msg = `Error processing bid "${bid.bidNumber}": ${err instanceof Error ? err.message : String(err)}`;
        console.error(`[allegheny_county] ${msg}`);
        errors.push(msg);
      }
    }
  }

  const durationMs = Date.now() - start;
  console.log(
    `[allegheny_county] Done. ${opportunities.length} records | ${errors.length} errors | ${durationMs}ms`,
  );

  return { source: SOURCE, opportunities, errors, durationMs };
}
