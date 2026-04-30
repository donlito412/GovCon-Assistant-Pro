'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EVENT_TYPE_COLORS, type CalendarEvent } from '@/lib/api/events';
import { EventCard } from './EventCard';

// ============================================================
// MONTHLY CALENDAR VIEW
// ============================================================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  events: CalendarEvent[];
  savedIds?: Set<number>;
  onSave?: (id: number) => void;
}

export function EventCalendar({ events, savedIds = new Set(), onSave }: Props) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Build event map: "YYYY-MM-DD" → events[]
  const eventMap = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = ev.event_date.slice(0, 10);
    if (!eventMap.has(key)) eventMap.set(key, []);
    eventMap.get(key)!.push(ev);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow    = getFirstDayOfWeek(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const selectedKey = selectedDay
    ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : null;
  const selectedEvents = selectedKey ? (eventMap.get(selectedKey) ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-base font-bold text-gray-900">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 text-center">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="bg-gray-50 min-h-[72px]" />;
          }

          const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = eventMap.get(key) ?? [];
          const isToday   = key === todayStr;
          const isSelected = day === selectedDay;

          return (
            <button
              key={key}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`bg-white min-h-[72px] p-1.5 text-left flex flex-col hover:bg-blue-50 transition ${
                isSelected ? 'ring-2 ring-inset ring-blue-500' : ''
              }`}
            >
              <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
              }`}>
                {day}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => {
                  const color = EVENT_TYPE_COLORS[ev.event_type] ?? 'bg-gray-100 text-gray-600';
                  return (
                    <div
                      key={ev.id}
                      className={`text-[10px] px-1 rounded truncate font-medium leading-4 ${color}`}
                    >
                      {ev.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-gray-400 pl-1">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      {selectedDay && (
        <div className="mt-2 space-y-3">
          <h3 className="text-sm font-bold text-gray-900">
            {MONTH_NAMES[viewMonth]} {selectedDay} — {selectedEvents.length === 0 ? 'No events' : `${selectedEvents.length} event${selectedEvents.length !== 1 ? 's' : ''}`}
          </h3>
          {selectedEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} saved={savedIds.has(ev.id)} onSave={onSave} />
          ))}
        </div>
      )}
    </div>
  );
}
