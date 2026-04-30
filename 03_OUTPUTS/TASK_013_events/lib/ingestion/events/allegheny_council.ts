// ============================================================
// ALLEGHENY COUNTY COUNCIL — Meeting Scraper
// Source: https://www.alleghenycounty.us/government/council/county-council-meeting-schedule
// source = "county_council_allegheny"
// Relevance: county contracts, budget decisions
// ============================================================

import { createHash } from 'crypto';
import * as cheerio from 'cheerio';
import type { EventRecord, EventIngestionResult } from './types';

const SOURCE = 'county_council_allegheny' as const;
const BASE_URL   = 'https://www.alleghenycounty.us';
const SCRAPE_URLS = [
  `${BASE_URL}/government/council/county-council-meeting-schedule`,
  `${BASE_URL}/government/council`,
];

function dedupHash(title: string, date: string): string {
  return createHash('sha256').update(`${title.toLowerCase().trim()}|${date}`, 'utf8').digest('hex');
}

function parseDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/gi, '').trim();
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function parseTime(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!m) return undefined;
  let h = parseInt(m[1]);
  if (m[3].toLowerCase() === 'pm' && h !== 12) h += 12;
  if (m[3].toLowerCase() === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

const MONTH_NAMES_RE = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi;

export async function scrapeAlleghenyCouncil(): Promise<EventIngestionResult> {
  const start = Date.now();
  const events: EventRecord[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  const today = new Date();

  for (const url of SCRAPE_URLS) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'GovConBot/1.0 (+https://govconassistant.pro)' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) continue;

      const $ = cheerio.load(await res.text());

      // Table rows
      $('table tr').each((_, row) => {
        const $row = $(row);
        if ($row.find('th').length > 0) return;
        const cells = $row.find('td').toArray().map((c) => $(c).text().trim());
        if (cells.length < 2) return;

        const dateCandidate = cells.find((c) => MONTH_NAMES_RE.test(c) || /\d{1,2}\/\d{1,2}\/\d{4}/.test(c));
        MONTH_NAMES_RE.lastIndex = 0;
        const date = parseDate(dateCandidate);
        if (!date || new Date(date) < today) return;

        const bodyCell = cells.find((c) => c !== dateCandidate && /council|committee|meeting/i.test(c));
        const title = bodyCell ? `Allegheny County ${bodyCell}` : 'Allegheny County Council Meeting';
        const timeRaw = cells.find((c) => /\d{1,2}:\d{2}\s*(am|pm)/i.test(c));

        const hash = dedupHash(title, date);
        if (seen.has(hash)) return;
        seen.add(hash);

        const linkEl = $row.find('a').first();
        const href = linkEl.attr('href') ?? '';
        const agendaUrl = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : undefined;

        events.push({
          source: SOURCE,
          title,
          organizer: 'Allegheny County Council',
          event_type: 'county_council',
          why_relevant: 'budget_decisions',
          event_date: date,
          time_start: timeRaw ? parseTime(timeRaw) : '10:00',
          location: 'Allegheny County Courthouse, 436 Grant St, Pittsburgh, PA 15219',
          is_virtual: false,
          is_free: true,
          agenda_url: agendaUrl,
          url,
          dedup_hash: hash,
          description: 'Allegheny County Council public meeting. Reviews county contracts, budget appropriations, and development decisions.',
        });
      });

      // Text scan fallback
      if (events.length === 0) {
        const textContent = $.root().text();
        const matches = [...textContent.matchAll(MONTH_NAMES_RE)];
        MONTH_NAMES_RE.lastIndex = 0;

        for (const match of matches) {
          const date = parseDate(match[0]);
          if (!date || new Date(date) < today) continue;
          const title = 'Allegheny County Council Meeting';
          const hash = dedupHash(title, date);
          if (seen.has(hash)) continue;
          seen.add(hash);

          events.push({
            source: SOURCE,
            title,
            organizer: 'Allegheny County Council',
            event_type: 'county_council',
            why_relevant: 'budget_decisions',
            event_date: date,
            time_start: '10:00',
            location: 'Allegheny County Courthouse, 436 Grant St, Pittsburgh, PA 15219',
            is_virtual: false,
            is_free: true,
            url,
            dedup_hash: hash,
            description: 'Allegheny County Council public meeting. Reviews county contracts, budget appropriations, and development decisions.',
          });
        }
      }

      if (events.length > 0) break;
    } catch (err) {
      errors.push(`Allegheny ${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[allegheny_council] ${events.length} events, ${errors.length} errors (${Date.now() - start}ms)`);
  return { source: SOURCE, events, errors, durationMs: Date.now() - start };
}
