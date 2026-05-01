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

// Keywords that must appear in a title for it to be considered a procurement opportunity.
// This prevents website navigation links from being mistaken for bids.
const PROCUREMENT_KEYWORDS = [
  'bid', 'rfp', 'rfq', 'rfi', 'proposal', 'solicitation', 'contract',
  'purchase', 'procurement', 'quote', 'invitation', 'ifb', 'award',
  'supply', 'service', 'construction', 'renovation', 'project',
  'maintenance', 'repair', 'install', 'design', 'engineering', 'professional',
];

// Terms that definitively indicate a navigation link, not a procurement item.
const NAV_BLOCKLIST = [
  'court records', 'criminal records', 'civil and family', 'wills and orphans',
  'court of common pleas', 'public defender', 'district attorney',
  'careers portal', 'information for applicants', 'job opportunities',
  'employment related', 'human resources', 'retirement office', 'internships',
  'benefits for allegheny', 'working for allegheny', 'county assistance',
  'children and families', 'health department', 'health services',
  'veterans services', 'veterans benefits', 'senior', 'elder abuse',
  'housing and shelter', 'food assistance', 'legal assistance',
  'permits and licenses', 'marriage license', 'dog license', 'passport',
  'property assessments', 'real estate portal', 'tax abatements',
  'parks and events', 'golf courses', 'swimming', 'skiing', 'playground',
  'boyce park', 'north park', 'south park', 'special events calendar',
  'movies under the stars', 'wine and spirits', 'submit a concern',
  'dhs ', 'disability and autism', 'behavioral health', 'overdose prevention',
  'air quality', 'immunization', 'plumbing permit', 'road and bridge',
  'lgbtq', 'immigrants and internationals', 'opioid settlement',
];

/**
 * Returns true if the title looks like a real procurement opportunity.
 * Rejects navigation links, HR pages, social services, and park info.
 */
function isProcurementTitle(title: string): boolean {
  const lower = title.toLowerCase();

  // Reject if title matches any nav blocklist term
  for (const blocked of NAV_BLOCKLIST) {
    if (lower.includes(blocked)) return false;
  }

  // Reject very long titles — these are concatenated nav menu items
  if (title.length > 200) return false;

  // Accept if title contains a procurement keyword
  for (const kw of PROCUREMENT_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }

  // Accept if title looks like a bid number pattern (e.g. "2024-001-P")
  if (/\b\d{4}-\d{3,}/i.test(title)) return true;

  return false;
}

/**
 * Parses an Allegheny County bids/proposals page.
 * Both purchasing and public works use a similar table layout.
 * NOTE: Only the structured table parser is used — the old fallback that
 * scraped <li> elements was picking up website navigation and has been removed.
 */
function parseBidsPage(html: string, sourceUrl: string, isPublicWorks: boolean): RawBid[] {
  const $ = cheerio.load(html);
  const bids: RawBid[] = [];

  // Allegheny County uses a <table> layout for bid listings
  $('table tr, .bid-row, .solicitation-row').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;

    // Skip header rows
    const firstCellText = $(cells[0]).text().trim().toLowerCase();
    if (
      firstCellText.includes('bid number') ||
      firstCellText.includes('solicitation') ||
      !firstCellText
    ) return;

    const bidNumber = $(cells[0]).text().trim();
    const title = $(cells[1]).text().trim();
    if (!title) return;

    // Hard gate: skip anything that doesn't look like a real procurement item
    if (!isProcurementTitle(title) && !isProcurementTitle(bidNumber)) return;

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

  // Also try links that point to PDF advertisements (common for Allegheny County bids)
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const linkText = $(el).text().trim();
    // Only grab PDF or solicitation links that look like procurement
    if (
      (href.toLowerCase().includes('.pdf') || href.toLowerCase().includes('solicitation')) &&
      linkText.length > 5 &&
      isProcurementTitle(linkText)
    ) {
      const detailUrl = href.startsWith('http')
        ? href
        : `https://www.alleghenycounty.us${href.startsWith('/') ? '' : '/'}${href}`;
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
