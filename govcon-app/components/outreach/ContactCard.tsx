'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Phone, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { OutreachStatusBadge } from './OutreachStatusBadge';
import {
  needsFollowUp, STATUS_LABELS,
  type OutreachContact, type OutreachStatus,
} from '../../lib/api/outreach';

// ============================================================
// OUTREACH CONTACT CARD
// ============================================================

const STATUS_ORDER: OutreachStatus[] = [
  'not_contacted','sent','replied','meeting_set','teaming_agreed','declined','not_a_fit',
];

interface Props {
  contact: OutreachContact;
  onStatusChange?: (id: number, status: OutreachStatus) => void;
}

export function OutreachContactCard({ contact, onStatusChange }: Props) {
  const followUp = needsFollowUp(contact);
  const lastActivity = contact.last_activity_at
    ? new Date(contact.last_activity_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition overflow-hidden ${
      followUp ? 'border-amber-300' : 'border-gray-200'
    }`}>
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <OutreachStatusBadge status={contact.status} />
            {followUp && (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                <AlertTriangle className="w-3 h-3" />Follow up
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-gray-900 leading-tight">{contact.company_name}</h3>
          {contact.contact_name && (
            <p className="text-xs text-gray-500 mt-0.5">{contact.contact_name}</p>
          )}
        </div>
        <Link
          href={`/outreach/${contact.id}`}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline flex-shrink-0 mt-1"
        >
          View <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="px-4 pb-2 space-y-1">
        {contact.email && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <a href={`mailto:${contact.email}`} className="hover:text-blue-600">{contact.email}</a>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <a href={`tel:${contact.phone}`} className="hover:text-blue-600">{contact.phone}</a>
          </div>
        )}
        {lastActivity && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />Last activity {lastActivity}
          </div>
        )}
      </div>

      {contact.notes && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-400 italic line-clamp-1">"{contact.notes}"</p>
        </div>
      )}

      {/* Quick status update */}
      {onStatusChange && (
        <div className="border-t border-gray-100 px-4 py-2 flex gap-1.5 flex-wrap">
          {STATUS_ORDER.filter((s) => s !== contact.status).slice(0, 3).map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(contact.id, s)}
              className="text-[11px] text-gray-500 hover:text-blue-700 border border-gray-200 hover:border-blue-300 px-2 py-1 rounded-full transition"
            >
              → {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
