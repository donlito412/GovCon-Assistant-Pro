'use client';

import React, { useState } from 'react';
import {
  Building2, MapPin, Phone, Globe, Mail, CheckCircle2, AlertTriangle,
  MoreVertical, Trash2, PenLine,
} from 'lucide-react';
import {
  activeCerts, STATUS_COLORS, SOURCE_LABELS, updateContactStatus,
  type Contact,
} from '@/lib/api/company-search';

// ============================================================
// CONTACT CARD — saved contacts listing
// ============================================================

interface Props {
  contact: Contact;
  onDeleted?: (id: number) => void;
  onUpdated?: (contact: Contact) => void;
}

const STATUS_OPTIONS: Contact['status'][] = ['saved', 'contacted', 'teaming', 'declined'];

export function ContactCard({ contact, onDeleted, onUpdated }: Props) {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const certs = activeCerts(contact.certifications);

  const handleDelete = async () => {
    if (!confirm(`Remove ${contact.company_name} from contacts?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' });
      if (res.ok) onDeleted?.(contact.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (status: Contact['status']) => {
    setStatusBusy(true);
    try {
      const updated = await updateContactStatus(contact.id, status);
      onUpdated?.(updated);
    } finally {
      setStatusBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {contact.sam_registered ? (
              <span className="flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />SAM
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3 text-amber-400" />Not SAM
              </span>
            )}
            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
              {SOURCE_LABELS[contact.source] ?? contact.source}
            </span>
          </div>

          <h3 className="text-sm font-bold text-gray-900 leading-tight">{contact.company_name}</h3>
          {contact.contact_name && (
            <p className="text-xs text-gray-500 mt-0.5">{contact.contact_name}</p>
          )}
        </div>

        {/* Status selector */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={contact.status}
            disabled={statusBusy}
            onChange={(e) => handleStatusChange(e.target.value as Contact['status'])}
            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-1 focus:ring-blue-500 ${STATUS_COLORS[contact.status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((m) => !m)}
              className="text-gray-400 hover:text-gray-700 transition p-1 rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-36 py-1">
                <button
                  onClick={() => { setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <PenLine className="w-3.5 h-3.5" />Edit Notes
                </button>
                <button
                  onClick={() => { setMenuOpen(false); handleDelete(); }}
                  disabled={deleting}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />{deleting ? 'Removing…' : 'Remove'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="px-4 pb-2 space-y-1">
        {(contact.city || contact.address) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            {[contact.address, contact.city, contact.state].filter(Boolean).join(', ')}
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <a href={`tel:${contact.phone}`} className="hover:text-blue-600">{contact.phone}</a>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <a href={`mailto:${contact.email}`} className="hover:text-blue-600">{contact.email}</a>
          </div>
        )}
        {contact.website && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Globe className="w-3.5 h-3.5 text-gray-400" />
            <a href={contact.website} target="_blank" rel="noopener noreferrer"
               className="hover:text-blue-600 truncate max-w-[200px]">
              {contact.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>

      {/* Certs */}
      {certs.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {certs.map((c) => (
            <span key={c} className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">{c}</span>
          ))}
        </div>
      )}

      {/* Notes */}
      {contact.notes && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-500 italic line-clamp-2">"{contact.notes}"</p>
        </div>
      )}

      {/* Linked bids */}
      {contact.linked_bid_ids?.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
          Linked to {contact.linked_bid_ids.length} bid{contact.linked_bid_ids.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
