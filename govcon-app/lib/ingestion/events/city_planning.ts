// ============================================================
// PITTSBURGH CITY PLANNING — Meeting Scraper
// Source: https://www.pittsburghpa.gov/Business-Development/City-Planning/City-Planning-Meetings
// source = "city_planning_pgh"
// Relevance: zoning, development projects — contract opportunities follow
// ============================================================

import { createHash } from 'crypto';
import * as cheerio from 'cheerio';
import type { EventRecord, EventIngestionResult } from './types';

const SOURCE = 'city_planning_pgh' as const;
const BASE_URL   = 'https://www.pittsburghpa.gov';
const SCRAPE_URL = `${BASE_URL}/Business-Development/City-Planning/City-Planning-Meetings`;

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

export async function scrapeCityPlanning(): Promise<EventIngestionResult> {
  const start = Date.now();
  const events: EventRecord[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  try {
    const res = await fetch(SCRAPE_URL, {
      headers: { 'User-Agent': 'GovConBot/1.0 (+https://govconassistant.pro)' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const $ = cheerio.load(await res.text());
    const today = new Date();

    // Table-based meeting schedule
    $('table tr').each((_, row) => {
      const $row = $(row);
      if ($row.find('th').length > 0) return;
      const cells = $row.find('td').toArray().map((c) => $(c).text().trim());
      if (cells.length < 2) return;

      const dateCandidate = cells.find((c) => /\d{1,2}\/\d{1,2}\/\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(c));
      const date = parseDate(dateCandidate);
      if (!date || new Date(date) < today) return;

      const bodyType = cells.find((c) => /board|commission|committee|planning/i.test(c) && c !== dateCandidate);
      const title = bodyType ? `City Planning ${bodyType}` : 'City Planning Meeting';
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
        organizer: 'Pittsburgh City Planning',
        event_type: 'planning',
        why_relevant: 'development_plans',
        event_date: date,
        time_start: timeRaw ? parseTime(timeRaw) : '09:00',
        location: '200 Ross St, Pittsburgh, PA 15219',
        is_virtual: false,
        is_free: true,
        agenda_url: agendaUrl,
        url: SCRAPE_URL,
        dedup_hash: hash,
        description: 'Pittsburgh City Planning Board/Commission meeting. Reviews zoning changes, development plans, and approvals that often precede contract opportunities.',
      });
    });

    // Fallback: paragraph / list item scan for month-name dates
    if (events.length === 0) {
      $('li, p, .event').each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        const dateMatch = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i);
        if (!dateMatch) return;
        const date = parseDate(dateMatch[0]);
        if (!date || new Date(date) < today) return;

        const title = $el.find('strong, b, a').first().text().trim() || 'City Planning Meeting';
        const hash = dedupHash(title, date);
        if (seen.has(hash)) return;
        seen.add(hash);

        events.push({
          source: SOURCE,
          title,
          organizer: 'Pittsburgh City Planning',
          event_type: 'planning',
          why_relevant: 'development_plans',
          event_date: date,
          time_start: '09:00',
          location: '200 Ross St, Pittsburgh, PA 15219',
          is_virtual: false,
          is_free: true,
          url: SCRAPE_URL,
          dedup_hash: hash,
          description: 'Pittsburgh City Planning Board/Commission meeting.',
        });
      });
    }
  } catch (err) {
    errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`[city_planning] ${events.length} events, ${errors.length} errors (${Date.now() - start}ms)`);
  return { source: SOURCE, events, errors, durationMs: Date.now() - start };
}
