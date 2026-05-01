export const dynamic = 'force-dynamic';

// ============================================================
// POST /api/ingest/events
// Runs all 6 event sources in parallel, upserts to Supabase events table.
// Secured by x-ingest-secret. Netlify cron: 13:00 UTC (08:00 ET).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { scrapeCityCouncil }          from '@/lib/ingestion/events/city_council';
import { scrapeCityPlanning }         from '@/lib/ingestion/events/city_planning';
import { scrapeUraMeetings }          from '@/lib/ingestion/events/ura_meetings';
import { scrapeAlleghenyCouncil }     from '@/lib/ingestion/events/allegheny_council';
import { scrapeEventbrite }           from '@/lib/ingestion/events/eventbrite';
import { scrapePghBusinessCollective } from '@/lib/ingestion/events/pgh_business_collective';
import type { EventRecord } from '@/lib/ingestion/events/types';

const INGEST_SECRET = process.env.INGEST_SECRET ?? '';
const BATCH_SIZE    = 50;

async function upsertEvents(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  events: EventRecord[],
): Promise<{ inserted: number; errors: string[] }> {
  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('events')
      .upsert(
        batch.map((ev) => ({
          source:       ev.source,
          title:        ev.title,
          organizer:    ev.organizer,
          event_type:   ev.event_type,
          why_relevant: ev.why_relevant,
          event_date:   ev.event_date,
          end_date:     ev.end_date ?? null,
          time_start:   ev.time_start ?? null,
          time_end:     ev.time_end ?? null,
          location:     ev.location ?? null,
          meeting_link: ev.meeting_link ?? null,
          is_virtual:   ev.is_virtual,
          is_free:      ev.is_free,
          description:  ev.description ?? null,
          agenda_url:   ev.agenda_url ?? null,
          url:          ev.url ?? null,
          dedup_hash:   ev.dedup_hash,
          external_id:  ev.external_id ?? null,
        })),
        { onConflict: 'dedup_hash', ignoreDuplicates: true },
      )
      .select('id');

    if (error) {
      errors.push(`Batch ${i / BATCH_SIZE + 1}: ${error.message}`);
    } else {
      inserted += data?.length ?? 0;
    }
  }

  return { inserted, errors };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-ingest-secret') ?? '';
  if (INGEST_SECRET && secret !== INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const runStart = Date.now();

  console.log('[ingest/events] Starting all scrapers…');

  const [city, planning, ura, allegheny, eventbrite, pbcol] = await Promise.allSettled([
    scrapeCityCouncil(),
    scrapeCityPlanning(),
    scrapeUraMeetings(),
    scrapeAlleghenyCouncil(),
    scrapeEventbrite(),
    scrapePghBusinessCollective(),
  ]);

  const results = [city, planning, ura, allegheny, eventbrite, pbcol].map((r) =>
    r.status === 'fulfilled' ? r.value : {
      source: 'other' as const,
      events: [],
      errors: [r.reason instanceof Error ? r.reason.message : String(r.reason)],
      durationMs: 0,
    }
  );

  const allEvents: EventRecord[] = results.flatMap((r) => r.events);
  console.log(`[ingest/events] Total: ${allEvents.length} events`);

  const { inserted, errors: upsertErrors } = await upsertEvents(supabase, allEvents);

  const sources = results.map((r) => ({
    source: r.source,
    scraped: r.events.length,
    errors: r.errors,
  }));

  return NextResponse.json({
    records_upserted: inserted,
    total_scraped:    allEvents.length,
    sources,
    errors:           upsertErrors.slice(0, 10),
    duration_ms:      Date.now() - runStart,
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = req.headers.get('x-netlify-scheduled-function-secret') ?? '';
  const envSecret  = process.env.CRON_SECRET ?? '';
  if (envSecret && cronSecret !== envSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return POST(req);
}
