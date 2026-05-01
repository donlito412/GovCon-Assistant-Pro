// ============================================================
// EVENTBRITE — Pittsburgh Business Events API Client
// API: https://www.eventbriteapi.com/v3/events/search/
// Requires: EVENTBRITE_API_KEY env var (free — register at eventbrite.com/platform)
// source = "eventbrite"
// ============================================================

import { createHash } from 'crypto';
import type { EventRecord, EventIngestionResult, EventType, WhyRelevant } from './types';

const SOURCE = 'eventbrite' as const;
const API_BASE = 'https://www.eventbriteapi.com/v3';
const MAX_PAGES = 5; // up to 125 events

function dedupHash(title: string, date: string): string {
  return createHash('sha256').update(`${title.toLowerCase().trim()}|${date}`, 'utf8').digest('hex');
}

function parseIsoDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function parseIsoTime(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return undefined;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function detectEventType(name: string, cats: string[]): EventType {
  const text = (name + ' ' + cats.join(' ')).toLowerCase();
  if (text.includes('conference') || text.includes('summit')) return 'conference';
  if (text.includes('workshop') || text.includes('seminar') || text.includes('training')) return 'workshop';
  if (text.includes('chamber')) return 'chamber';
  return 'networking';
}

function detectWhyRelevant(name: string, desc: string): WhyRelevant {
  const text = (name + ' ' + desc).toLowerCase();
  if (text.includes('contract') || text.includes('procurement') || text.includes('bid')) return 'contracts_announced';
  if (text.includes('grant') || text.includes('funding') || text.includes('finance')) return 'grants_discussed';
  if (text.includes('zoning') || text.includes('development') || text.includes('real estate')) return 'development_plans';
  if (text.includes('budget') || text.includes('fiscal') || text.includes('government')) return 'budget_decisions';
  return 'networking';
}

export async function scrapeEventbrite(): Promise<EventIngestionResult> {
  const start = Date.now();
  const events: EventRecord[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  const apiKey = process.env.EVENTBRITE_API_KEY ?? '';
  if (!apiKey) {
    errors.push('EVENTBRITE_API_KEY not set — skipping Eventbrite ingestion');
    console.warn('[eventbrite] EVENTBRITE_API_KEY missing — skipping');
    return { source: SOURCE, events, errors, durationMs: Date.now() - start };
  }

  let page = 1;
  while (page <= MAX_PAGES) {
    try {
      const params = new URLSearchParams({
        'q':                        'government OR procurement OR contract',
        'location.address':         'Pittsburgh, PA',
        'location.within':          '25mi',
        'categories':               '101',  // Business & Professional Eventbrite category
        'start_date.range_start':   new Date().toISOString().split('.')[0] + 'Z',
        'expand':                   'venue,organizer,ticket_classes',
        'page':                     String(page),
        'page_size':                '25',
      });

      const res = await fetch(`${API_BASE}/events/search/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        errors.push(`Eventbrite API HTTP ${res.status} on page ${page}`);
        break;
      }

      const json = await res.json();
      const items: any[] = json?.events ?? [];
      if (!items.length) break;

      for (const ev of items) {
        try {
          const title = (ev.name?.text ?? ev.name?.html ?? '').replace(/<[^>]+>/g, '').trim();
          const dateRaw = ev.start?.utc ?? ev.start?.local;
          const date = parseIsoDate(dateRaw);
          if (!title || !date) continue;

          const hash = dedupHash(title, date);
          if (seen.has(hash)) continue;
          seen.add(hash);

          const venue = ev.venue;
          const isVirtual = !venue || ev.online_event === true || (ev.format?.short_name ?? '').toLowerCase().includes('online');
          const location = isVirtual
            ? 'Virtual'
            : [venue?.address?.address_1, venue?.address?.city, venue?.address?.region].filter(Boolean).join(', ');

          const desc = (ev.description?.text ?? ev.description?.plain_text_description ?? '').slice(0, 1000);
          const isFree = ev.is_free === true || (ev.ticket_classes ?? []).some((tc: any) => tc.free === true);
          const eventUrl = ev.url ?? `https://www.eventbrite.com/e/${ev.id}`;
          const cats = (ev.category?.name ?? '').split('&').map((s: string) => s.trim());

          events.push({
            source: SOURCE,
            title,
            organizer: ev.organizer?.name ?? 'Eventbrite Organizer',
            event_type: detectEventType(title, cats),
            why_relevant: detectWhyRelevant(title, desc),
            event_date: date,
            end_date: parseIsoDate(ev.end?.utc),
            time_start: parseIsoTime(dateRaw),
            time_end: parseIsoTime(ev.end?.utc),
            location: location || 'Pittsburgh, PA',
            meeting_link: isVirtual ? (ev.online_event_url ?? eventUrl) : undefined,
            is_virtual: isVirtual,
            is_free: isFree,
            description: desc || undefined,
            url: eventUrl,
            dedup_hash: hash,
            external_id: String(ev.id ?? ''),
          });
        } catch (rowErr) {
          errors.push(`Event parse: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
        }
      }

      if (!json.pagination?.has_more_items) break;
      page++;
    } catch (err) {
      errors.push(`Page ${page} fatal: ${err instanceof Error ? err.message : String(err)}`);
      break;
    }
  }

  console.log(`[eventbrite] ${events.length} events, ${errors.length} errors (${Date.now() - start}ms)`);
  return { source: SOURCE, events, errors, durationMs: Date.now() - start };
}
