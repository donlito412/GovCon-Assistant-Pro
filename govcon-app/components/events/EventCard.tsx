'use client';

import React from 'react';
import { Calendar, Clock, MapPin, ExternalLink, Video, Download, Bookmark, CheckCircle } from 'lucide-react';
import {
  EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, WHY_RELEVANT_LABELS,
  fmtEventTime, downloadIcs, type CalendarEvent,
} from '@/lib/api/events';

// ============================================================
// EVENT CARD — listing card for events page
// ============================================================

interface Props {
  event: CalendarEvent;
  saved?: boolean;
  onSave?: (id: number) => void;
}

export function EventCard({ event, saved = false, onSave }: Props) {
  const typeColor = EVENT_TYPE_COLORS[event.event_type] ?? 'bg-gray-100 text-gray-600';
  const typeLabel = EVENT_TYPE_LABELS[event.event_type] ?? event.event_type;
  const whyLabel  = WHY_RELEVANT_LABELS[event.why_relevant] ?? '';
  const timeStr   = fmtEventTime(event);

  const dateDisplay = new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  const daysUntil = Math.ceil((new Date(event.event_date).getTime() - Date.now()) / 86400000);
  const urgency = daysUntil <= 2 ? 'text-red-600 font-semibold' : daysUntil <= 7 ? 'text-amber-600' : 'text-gray-500';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
      {/* Top bar */}
      <div className="h-1 w-full" style={{ background: event.is_virtual ? '#6366f1' : '#3b82f6' }} />

      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColor}`}>
            {typeLabel}
          </span>
          {event.is_free && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Free</span>
          )}
          {event.is_virtual && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 flex items-center gap-1">
              <Video className="w-3 h-3" />Virtual
            </span>
          )}
        </div>
        {onSave && (
          <button
            onClick={() => onSave(event.id)}
            className={`flex-shrink-0 ${saved ? 'text-blue-600' : 'text-gray-300 hover:text-gray-500'} transition`}
            title={saved ? 'Saved' : 'Save event'}
          >
            {saved ? <CheckCircle className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        )}
      </div>

      <div className="px-4 pb-2">
        <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{event.title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{event.organizer}</p>
      </div>

      {/* Meta */}
      <div className="px-4 pb-3 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className={`text-xs ${urgency}`}>
            {dateDisplay}
            {daysUntil === 0 && ' · Today'}
            {daysUntil === 1 && ' · Tomorrow'}
            {daysUntil > 1 && daysUntil <= 7 && ` · ${daysUntil}d`}
          </span>
        </div>

        {timeStr && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-600">{timeStr}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-600 line-clamp-1">{event.location ?? 'Location TBD'}</span>
        </div>
      </div>

      {/* Why relevant */}
      {event.why_relevant !== 'general' && (
        <div className="px-4 pb-3">
          <span className="text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
            {whyLabel}
          </span>
        </div>
      )}

      {/* Description */}
      {event.description && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-500 line-clamp-2">{event.description}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto border-t border-gray-100 px-4 py-2.5 flex items-center justify-between gap-2">
        <button
          onClick={() => downloadIcs(event)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition"
          title="Add to calendar (.ics)"
        >
          <Download className="w-3 h-3" />
          Add to Calendar
        </button>

        <div className="flex items-center gap-2">
          {event.agenda_url && (
            <a href={event.agenda_url} target="_blank" rel="noopener noreferrer"
               className="text-xs text-gray-400 hover:text-gray-700 transition">
              Agenda
            </a>
          )}
          {(event.meeting_link ?? event.url) && (
            <a
              href={event.meeting_link ?? event.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              {event.meeting_link ? 'Join' : 'Details'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
