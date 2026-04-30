// ============================================================
// PITTSBURGH BUSINESS COLLECTIVE — Events Scraper
// Source: https://pghbusinesscollective.com/events
// source = "pgh_business_collective"
// Relevance: networking opportunities for contractors/consultants
// ============================================================

import { createHash } from 'crypto';
import * as cheerio from 'cheerio';
import type { EventRecord, EventIngestionResult } from './types';

const SOURCE = 'pgh_business_collective' as const;
const BASE_URL   = 'https://pghbusinesscollective.com';
const SCRAPE_URL = `${BASE_URL}/events`;

function dedupHash(title: string, date: string): string {
  return createHash('sha256').update(`${title.toLowerCase().trim()}|${date}`, 'utf8').digest('hex');
}

function parseDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw.trim());
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  // Try "Month Day, Year" pattern
  const m = raw.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m) {
    const d2 = new Date(`${m[1]} ${m[2]}, ${m[3]}`);
    return isNaN(d2.getTime()) ? undefined : d2.toISOString().slice(0, 10);
  }
  return undefined;
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

function detectWhyRelevant(text: string): 'networking' | 'contracts_announced' | 'grants_discussed' {
  if (/contract|procurement|bid|rfp/i.test(text)) return 'contracts_announced';
  if (/grant|fund|sba|loan/i.test(text)) return 'grants_discussed';
  return 'networking';
}

export async function scrapePghBusinessCollective(): Promise<EventIngestionResult> {
  const start = Date.now();
  const events: EventRecord[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  const today = new Date();

  try {
    const res = await fetch(SCRAPE_URL, {
      headers: { 'User-Agent': 'GovConBot/1.0 (+https://govconassistant.pro)' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const $ = cheerio.load(await res.text());

    // Common event listing selectors
    const selectors = [
      'article',
      '.event-item',
      '.events-list li',
      '.tribe-event',
      '.eventlist-event',
      '.wp-block-group',
    ];

    for (const sel of selectors) {
      $(sel).each((_, el) => {
        const $el = $(el);
        const linkEl = $el.find('a').first();
        const href = linkEl.attr('href') ?? '';
        const title = ($el.find('h2, h3, h4, .event-title, .tribe-event-title').first().text()
          || linkEl.text()).trim();

        if (!title || title.length < 8) return;

        // Extract date from data attributes or text
        const dateAttr = $el.find('[datetime], [data-date]').first().attr('datetime')
          || $el.find('[datetime], [data-date]').first().attr('data-date');
        const dateText = $el.find('.event-date, .tribe-events-start-date, time, .date').first().text().trim();
        const date = parseDate(dateAttr ?? dateText);

        if (!date || new Date(date) < today) return;

        const hash = dedupHash(title, date);
        if (seen.has(hash)) return;
        seen.add(hash);

        const timeText = $el.find('.event-time, .tribe-events-start-time, .time').first().text().trim();
        const desc = $el.find('p').first().text().trim().slice(0, 500);
        const location = $el.find('.event-location, .tribe-venue, address').first().text().trim();
        const isVirtual = /virtual|online|zoom|teams|remote/i.test(location + title + desc);
        const isFree = /free|no cost|no charge/i.test(title + desc);

        const url = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : SCRAPE_URL;

        events.push({
          source: SOURCE,
          title,
          organizer: 'Pittsburgh Business Collective',
          event_type: 'networking',
          why_relevant: detectWhyRelevant(title + desc),
          event_date: date,
          time_start: parseTime(timeText),
          location: isVirtual ? 'Virtual' : (location || 'Pittsburgh, PA'),
          is_virtual: isVirtual,
          is_free: isFree,
          description: desc || undefined,
          url,
          dedup_hash: hash,
        });
      });
      if (events.length > 0) break;
    }

    // Fallback: link scan
    if (events.length === 0) {
      $('a[href]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href') ?? '';
        const text = $a.text().trim();
        if (!text || text.length < 10) return;
        if (!/event|networking|meetup|workshop|summit/i.test(text + href)) return;

        // Try to find a date in parent context
        const parentText = $a.closest('li, div, article').text();
        const dateMatch = parentText.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i);
        const date = dateMatch ? parseDate(dateMatch[0]) : undefined;
        if (!date || new Date(date) < today) return;

        const hash = dedupHash(text, date);
        if (seen.has(hash)) return;
        seen.add(hash);

        const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        events.push({
          source: SOURCE,
          title: text,
          organizer: 'Pittsburgh Business Collective',
          event_type: 'networking',
          why_relevant: 'networking',
          event_date: date,
          is_virtual: /virtual|online/i.test(text),
          is_free: /free/i.test(text),
          url,
          dedup_hash: hash,
          location: 'Pittsburgh, PA',
        });
      });
    }
  } catch (err) {
    errors.push(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`[pgh_business_collective] ${events.length} events, ${errors.length} errors (${Date.now() - start}ms)`);
  return { source: SOURCE, events, errors, durationMs: Date.now() - start };
}
