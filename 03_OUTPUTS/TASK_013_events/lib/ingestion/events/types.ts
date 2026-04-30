// ============================================================
// SHARED TYPES — EVENTS INGESTION (TASK_013)
// ============================================================

export type EventSource =
  | 'city_council_pgh'
  | 'city_planning_pgh'
  | 'ura_pgh'
  | 'county_council_allegheny'
  | 'eventbrite'
  | 'pgh_business_collective'
  | 'other';

export type EventType =
  | 'city_council'
  | 'planning'
  | 'ura'
  | 'county_council'
  | 'networking'
  | 'conference'
  | 'chamber'
  | 'workshop'
  | 'other';

export type WhyRelevant =
  | 'contracts_announced'
  | 'grants_discussed'
  | 'networking'
  | 'development_plans'
  | 'budget_decisions'
  | 'general';

export interface EventRecord {
  source: EventSource;
  title: string;
  organizer: string;
  event_type: EventType;
  why_relevant: WhyRelevant;
  event_date: string;      // YYYY-MM-DD
  end_date?: string;       // YYYY-MM-DD
  time_start?: string;     // HH:MM
  time_end?: string;       // HH:MM
  location?: string;
  meeting_link?: string;
  is_virtual: boolean;
  is_free: boolean;
  description?: string;
  agenda_url?: string;
  url?: string;
  dedup_hash: string;
  external_id?: string;
}

export interface EventIngestionResult {
  source: EventSource;
  events: EventRecord[];
  errors: string[];
  durationMs: number;
}
