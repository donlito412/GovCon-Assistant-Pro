// ============================================================
// URA BOARD MEETINGS — Scraper
// Source: https://www.ura.org/
// source = "ura_pgh"
// Relevance: grant/loan approvals, development contracts, minority business
// ============================================================

import { createHash } from 'crypto';
import * as cheerio from 'cheerio';
import type { EventRecord, EventIngestionResult } from './types';

const SOURCE = 'ura_pgh' as const;
const BASE_URL   = 'https://www.ura.org';
const SCRAPE_URLS = [
  `${BASE_URL}/pages/board-meetings`,
  `${BASE_URL}/pages/about`,
  `${BASE_URL}`,
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

const MONTH_NAMES = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi;

export async function scrapeUraMeetings(): Promise<EventIngestionResult> {
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

      // Table-based schedule
      $('table tr').each((_, row) => {
        const $row = $(row);
        if ($row.find('th').length > 0) return;
        const cells = $row.find('td').toArray().map((c) => $(c).text().trim());
        if (cells.length < 1) return;

        const dateCandidate = cells.find((c) => MONTH_NAMES.test(c) || /\d{1,2}\/\d{1,2}\/\d{4}/.test(c));
        MONTH_NAMES.lastIndex = 0; // reset regex state
        const date = parseDate(dateCandidate);
        if (!date || new Date(date) < today) return;

        const title = cells.find((c) => c !== dateCandidate && c.length > 3) ?? 'URA Board Meeting';
        const hash = dedupHash(title, date);
        if (seen.has(hash)) return;
        seen.add(hash);

        const linkEl = $row.find('a').first();
        const href = linkEl.attr('href') ?? '';
        const agendaUrl = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : undefined;

        events.push({
          source: SOURCE,
          title,
          organizer: 'Urban Redevelopment Authority of Pittsburgh',
          event_type: 'ura',
          why_relevant: 'grants_discussed',
          event_date: date,
          time_start: '14:00',
          location: '412 Boulevard of the Allies, Pittsburgh, PA 15219',
          is_virtual: false,
          is_free: true,
          agenda_url: agendaUrl,
          url,
          dedup_hash: hash,
          description: 'URA Board of Directors meeting. Reviews grant/loan approvals, development contracts, and minority business program funding.',
        });
      });

      // Text/paragraph scan
      const textContent = $.root().text();
      const matches = [...textContent.matchAll(MONTH_NAMES)];
      MONTH_NAMES.lastIndex = 0;

      for (const match of matches) {
        const date = parseDate(match[0]);
        if (!date || new Date(date) < today) continue;
        const title = 'URA Board Meeting';
        const hash = dedupHash(title, date);
        if (seen.has(hash)) continue;
        seen.add(hash);

        events.push({
          source: SOURCE,
          title,
          organizer: 'Urban Redevelopment Authority of Pittsburgh',
          event_type: 'ura',
          why_relevant: 'grants_discussed',
          event_date: date,
          time_start: '14:00',
          location: '412 Boulevard of the Allies, Pittsburgh, PA 15219',
          is_virtual: false,
          is_free: true,
          url,
          dedup_hash: hash,
          description: 'URA Board of Directors meeting. Reviews grant/loan approvals, development contracts, and minority business program funding.',
        });
      }

      if (events.length > 0) break;
    } catch (err) {
      errors.push(`URA ${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[ura_meetings] ${events.length} events, ${errors.length} errors (${Date.now() - start}ms)`);
  return { source: SOURCE, events, errors, durationMs: Date.now() - start };
}
