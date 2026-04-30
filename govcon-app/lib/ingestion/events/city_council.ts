// ============================================================
// PITTSBURGH CITY COUNCIL — Meeting Scraper
// Source: https://www.pittsburghpa.gov/City-Government/City-Council/Clerks-Office/Council-Meeting-Schedule
// source = "city_council_pgh"
// Relevance: budget votes, contract approvals, development decisions
// ============================================================

import { createHash } from 'crypto';
import * as cheerio from 'cheerio';
import type { EventRecord, EventIngestionResult } from './types';

const SOURCE = 'city_council_pgh' as const;
const BASE_URL  = 'https://www.pittsburghpa.gov';
const SCRAPE_URL = `${BASE_URL}/City-Government/City-Council/Clerks-Office/Council-Meeting-Schedule`;

function dedupHash(title: string, date: string): string {
  return createHash('sha256').update(`${title.toLowerCase().trim()}|${date}`, 'utf8').digest('hex');
}

function parseDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*/gi, '').trim();
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function parseTime(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) return undefined;
  let h = parseInt(match[1]);
  const m = match[2];
  const ampm = match[3].toLowerCase();
  if (ampm === 'pm' && h !== 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
}

function detectAgendaUrl($el: cheerio.Cheerio<cheerio.AnyNode>, baseUrl: string): string | undefined {
  const agendaLink = $el.find('a').filter((_, a) => /agenda|minutes/i.test(cheerio.load(a)('a').text())).first();
  const href = agendaLink.attr('href');
  return href ? (href.startsWith('http') ? href : `${baseUrl}${href}`) : undefined;
}

export async function scrapeCityCouncil(): Promise<EventIngestionResult> {
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

    // Try table rows first
    $('table tr').each((_, row) => {
      const $row = $(row);
      if ($row.find('th').length > 0) return;
      const cells = $row.find('td').toArray().map((c) => $(c).text().trim());
      if (cells.length < 2) return;

      const dateCandidate = cells.find((c) => /\d{1,2}\/\d{1,2}\/\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(c));
      const date = parseDate(dateCandidate);
      if (!date || new Date(date) < new Date()) return; // skip past events

      const title = cells.find((c) => c !== dateCandidate && c.length > 3) ?? 'City Council Meeting';
      const timeRaw = cells.find((c) => /\d{1,2}:\d{2}\s*(am|pm)/i.test(c));

      const linkEl = $row.find('a[href*="agenda"], a[href*="minutes"]').first();
      const agendaHref = linkEl.attr('href');
      const agendaUrl = agendaHref ? (agendaHref.startsWith('http') ? agendaHref : `${BASE_URL}${agendaHref}`) : undefined;

      const hash = dedupHash(title, date);
      if (seen.has(hash)) return;
      seen.add(hash);

      events.push({
        source: SOURCE,
        title: title || 'City Council Meeting',
        organizer: 'Pittsburgh City Council',
        event_type: 'city_council',
        why_relevant: 'contracts_announced',
        event_date: date,
        time_start: timeRaw ? parseTime(timeRaw) : '10:00',
        location: 'City Council Chambers, 510 Grant St, Pittsburgh, PA 15219',
        is_virtual: false,
        is_free: true,
        agenda_url: agendaUrl,
        url: SCRAPE_URL,
        dedup_hash: hash,
        description: 'Pittsburgh City Council public meeting. Agenda includes contract approvals, budget decisions, and development projects.',
      });
    });

    // Fallback: scan for date-like text in list items / paragraphs
    if (events.length === 0) {
      $('li, p, .event-item, .meeting-item').each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        const dateMatch = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i);
        if (!dateMatch) return;

        const date = parseDate(dateMatch[0]);
        if (!date || new Date(date) < new Date()) return;

        const titleEl = $el.find('a, strong, b').first();
        const title = titleEl.text().trim() || 'City Council Meeting';
        const hash = dedupHash(title, date);
        if (seen.has(hash)) return;
        seen.add(hash);

        const href = $el.find('a').first().attr('href') ?? '';
        const url = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : SCRAPE_URL;

        events.push({
          source: SOURCE,
          title,
          organizer: 'Pittsburgh City Council',
          event_type: 'city_council',
          why_relevant: 'contracts_announced',
          event_date: date,
          time_start: '10:00',
          location: 'City Council Chambers, 510 Grant St, Pittsburgh, PA 15219',
          is_virtual: false,
          is_free: true,
          url,
          dedup_hash: hash,
          description: 'Pittsburgh City Council public meeting. Agenda includes contract approvals, budget decisions, and development projects.',
        });
      });
    }
  } catch (err) {
    errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`[city_council] ${events.length} events, ${errors.length} errors (${Date.now() - start}ms)`);
  return { source: SOURCE, events, errors, durationMs: Date.now() - start };
}
