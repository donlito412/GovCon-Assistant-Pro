'use client';

import React, { useState, useCallback } from 'react';
import { Search, Loader2, AlertCircle, CalendarDays, List, RefreshCw } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { useEvents, type EventFilters, type CalendarEvent } from '@/lib/api/events';
import { EventCard } from '@/components/events/EventCard';
import { EventCalendar } from '@/components/events/EventCalendar';
import { EventFilterPanel } from '@/components/events/EventFilterPanel';

// ============================================================
// EVENTS PAGE — /events
// Toggle: Calendar view ↔ List view (grouped by week)
// ============================================================

type ViewMode = 'calendar' | 'list';

function groupByWeek(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const d = new Date(ev.event_date + 'T12:00:00');
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay()); // Sunday
    const key = weekStart.toISOString().slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ev);
  }
  return groups;
}

function weekLabel(isoSunday: string): string {
  const sun = new Date(isoSunday + 'T12:00:00');
  const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `Week of ${fmt(sun)} – ${fmt(sat)}`;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button onClick={() => onChange(page - 1)} disabled={page === 0}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
        ← Prev
      </button>
      <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
        Next →
      </button>
    </div>
  );
}

export default function EventsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ] = useDebounce(searchInput, 400);
  const [filters, setFilters] = useState<EventFilters>({ sort: 'date_asc' });
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const activeFilters: EventFilters = { ...filters, q: debouncedQ || undefined };

  // For calendar view, fetch a broader month range without pagination
  const calFilters: EventFilters = viewMode === 'calendar'
    ? { ...activeFilters, per_page: 200, page: 0 }
    : activeFilters;

  const { data, isLoading, error, mutate } = useEvents(calFilters);

  const handleFilterChange = useCallback((f: EventFilters) => setFilters({ ...f, page: 0 }), []);
  const handlePageChange = (p: number) => setFilters((f) => ({ ...f, page: p }));

  const handleSave = (id: number) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const events      = data?.events ?? [];
  const total       = data?.total  ?? 0;
  const page        = data?.page   ?? 0;
  const totalPages  = data?.total_pages ?? 0;
  const weekGroups  = groupByWeek(events);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            Business Meetings & Events
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            City Council, Planning, URA, County Council, networking events
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} transition`}
            >
              <List className="w-4 h-4" />List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} transition`}
            >
              <CalendarDays className="w-4 h-4" />Calendar
            </button>
          </div>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search events by title, organizer, topic…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Layout */}
      <div className="flex gap-5 items-start">
        {/* Sidebar */}
        {viewMode === 'list' && (
          <aside className="w-56 flex-shrink-0 hidden md:block">
            <EventFilterPanel filters={filters} onChange={handleFilterChange} />
          </aside>
        )}

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading events…</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Failed to load events — {error.message}</span>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* Calendar view */}
              {viewMode === 'calendar' && (
                <EventCalendar events={events} savedIds={savedIds} onSave={handleSave} />
              )}

              {/* List view */}
              {viewMode === 'list' && (
                <>
                  {!isLoading && !error && (
                    <p className="text-sm text-gray-500">
                      {total.toLocaleString()} {total === 1 ? 'event' : 'events'} found
                    </p>
                  )}

                  {events.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                      <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No events found</p>
                      <p className="text-xs mt-1">Try adjusting filters or run ingestion to pull fresh data</p>
                    </div>
                  )}

                  {/* Grouped by week */}
                  {[...weekGroups.entries()].map(([weekKey, weekEvents]) => (
                    <div key={weekKey} className="space-y-3">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-2 border-t border-gray-100">
                        {weekLabel(weekKey)}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {weekEvents.map((ev) => (
                          <EventCard key={ev.id} event={ev} saved={savedIds.has(ev.id)} onSave={handleSave} />
                        ))}
                      </div>
                    </div>
                  ))}

                  <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
