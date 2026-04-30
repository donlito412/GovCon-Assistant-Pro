'use client';

// ============================================================
// EVENTS DATA HOOKS — SWR client hooks + types + utilities
// ============================================================

import useSWR from 'swr';

// ---- Types ----

export interface CalendarEvent {
  id: number;
  source: string;
  title: string;
  organizer: string;
  event_type: string;
  why_relevant: string;
  event_date: string;
  end_date: string | null;
  time_start: string | null;
  time_end: string | null;
  location: string | null;
  meeting_link: string | null;
  is_virtual: boolean;
  is_free: boolean;
  description: string | null;
  agenda_url: string | null;
  url: string | null;
  created_at: string;
}

export interface EventsResponse {
  events: CalendarEvent[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface EventFilters {
  q?: string;
  source?: string;
  event_type?: string;
  why_relevant?: string;
  is_virtual?: boolean;
  is_free?: boolean;
  date_from?: string;
  date_to?: string;
  sort?: 'date_asc' | 'date_desc';
  page?: number;
}

// ---- Fetcher ----

const fetcher = async (url: string): Promise<EventsResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// ---- Hook ----

export function useEvents(filters: EventFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q)           params.set('q', filters.q);
  if (filters.source)      params.set('source', filters.source);
  if (filters.event_type)  params.set('event_type', filters.event_type);
  if (filters.why_relevant) params.set('why_relevant', filters.why_relevant);
  if (filters.is_virtual !== undefined) params.set('is_virtual', String(filters.is_virtual));
  if (filters.is_free !== undefined)    params.set('is_free', String(filters.is_free));
  if (filters.date_from)   params.set('date_from', filters.date_from);
  if (filters.date_to)     params.set('date_to', filters.date_to);
  if (filters.sort)        params.set('sort', filters.sort);
  if (filters.page)        params.set('page', String(filters.page));

  const url = `/api/events?${params.toString()}`;
  const { data, error, isLoading, mutate } = useSWR<EventsResponse>(url, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  return { data, error, isLoading, mutate };
}

// ---- ICS Export ----

export function generateIcs(ev: CalendarEvent): string {
  const toIcsDate = (dateStr: string, timeStr: string | null) => {
    const d = new Date(`${dateStr}T${timeStr ?? '09:00'}:00`);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const start = toIcsDate(ev.event_date, ev.time_start);
  const end   = toIcsDate(ev.end_date ?? ev.event_date, ev.time_end ?? ev.time_start);
  const uid   = `event-${ev.id}-pgh-gov@govconassistant.pro`;
  const loc   = (ev.location ?? 'Pittsburgh, PA').replace(/,/g, '\\,');
  const desc  = (ev.description ?? '').replace(/\n/g, '\\n').slice(0, 500);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PGH Gov Contracts//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${ev.title}`,
    `LOCATION:${loc}`,
    `DESCRIPTION:${desc}`,
    `URL:${ev.url ?? ''}`,
    `ORGANIZER;CN=${ev.organizer}:mailto:noreply@govconassistant.pro`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(ev: CalendarEvent): void {
  const ics = generateIcs(ev);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${ev.title.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Labels / Colors ----

export const EVENT_TYPE_LABELS: Record<string, string> = {
  city_council:   'City Council',
  planning:       'Planning',
  ura:            'URA Board',
  county_council: 'County Council',
  networking:     'Networking',
  conference:     'Conference',
  chamber:        'Chamber',
  workshop:       'Workshop',
  other:          'Event',
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
  city_council:   'bg-blue-100 text-blue-700',
  planning:       'bg-purple-100 text-purple-700',
  ura:            'bg-emerald-100 text-emerald-700',
  county_council: 'bg-indigo-100 text-indigo-700',
  networking:     'bg-amber-100 text-amber-700',
  conference:     'bg-pink-100 text-pink-700',
  chamber:        'bg-orange-100 text-orange-700',
  workshop:       'bg-teal-100 text-teal-700',
  other:          'bg-gray-100 text-gray-600',
};

export const WHY_RELEVANT_LABELS: Record<string, string> = {
  contracts_announced: '📋 Contracts',
  grants_discussed:    '💰 Grants',
  networking:          '🤝 Networking',
  development_plans:   '🏗️ Development',
  budget_decisions:    '💼 Budget',
  general:             '📅 General',
};

export const SOURCE_LABELS: Record<string, string> = {
  city_council_pgh:         'City Council',
  city_planning_pgh:        'City Planning',
  ura_pgh:                  'URA',
  county_council_allegheny: 'County Council',
  eventbrite:               'Eventbrite',
  pgh_business_collective:  'PGH Business Collective',
};

export function fmtEventTime(ev: CalendarEvent): string {
  if (!ev.time_start) return '';
  const toAmPm = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };
  const start = toAmPm(ev.time_start);
  return ev.time_end ? `${start} – ${toAmPm(ev.time_end)}` : start;
}
