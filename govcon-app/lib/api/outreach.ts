'use client';

import useSWR from 'swr';

// ---- Types ----

export type OutreachStatus =
  | 'not_contacted' | 'sent' | 'replied'
  | 'meeting_set' | 'teaming_agreed' | 'declined' | 'not_a_fit';

export interface OutreachContact {
  id: number;
  user_id: string;
  contact_id: number | null;
  contact_name: string | null;
  company_name: string;
  email: string | null;
  phone: string | null;
  status: OutreachStatus;
  first_contacted_at: string | null;
  last_activity_at: string | null;
  linked_bid_ids: number[];
  notes: string | null;
  created_at: string;
}

export interface OutreachEmail {
  id: number;
  contact_id: number;
  user_id: string;
  direction: 'outbound' | 'inbound';
  subject: string | null;
  body: string;
  sent_at: string;
  from_email: string | null;
  to_email: string | null;
  resend_message_id: string | null;
}

// ---- Fetcher ----

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

// ---- Hooks ----

export interface OutreachFilters {
  q?: string; status?: string; bid_id?: number; page?: number;
}

export function useOutreachContacts(filters: OutreachFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q)      params.set('q', filters.q);
  if (filters.status) params.set('status', filters.status);
  if (filters.bid_id) params.set('bid_id', String(filters.bid_id));
  if (filters.page)   params.set('page', String(filters.page));

  const { data, error, isLoading, mutate } = useSWR(
    `/api/outreach?${params.toString()}`, fetcher, { revalidateOnFocus: false }
  );
  return { data, error, isLoading, mutate };
}

export function useEmailThread(contactId: number | null) {
  const { data, error, isLoading, mutate } = useSWR(
    contactId ? `/api/outreach/${contactId}/emails` : null,
    fetcher, { revalidateOnFocus: false }
  );
  return { emails: (data?.emails ?? []) as OutreachEmail[], error, isLoading, mutate };
}

// ---- Mutations ----

export async function createOutreachContact(body: Partial<OutreachContact>): Promise<OutreachContact> {
  const res = await fetch('/api/outreach', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateOutreachStatus(id: number, status: OutreachStatus, notes?: string) {
  const res = await fetch(`/api/outreach/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...(notes !== undefined ? { notes } : {}) }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function sendOutreachEmail(contactId: number, payload: {
  direction: 'outbound' | 'inbound';
  subject?: string; bodyText: string; fromEmail?: string; toEmail?: string;
  senderName?: string; senderCompany?: string; recipientName?: string; recipientCompany?: string;
}) {
  const res = await fetch(`/api/outreach/${contactId}/emails`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ---- Display helpers ----

export const STATUS_LABELS: Record<OutreachStatus, string> = {
  not_contacted:  'Not Contacted',
  sent:           'Sent',
  replied:        'Replied',
  meeting_set:    'Meeting Set',
  teaming_agreed: 'Teaming Agreed',
  declined:       'Declined',
  not_a_fit:      'Not a Fit',
};

export const STATUS_COLORS: Record<OutreachStatus, string> = {
  not_contacted:  'bg-gray-100 text-gray-500',
  sent:           'bg-blue-100 text-blue-700',
  replied:        'bg-indigo-100 text-indigo-700',
  meeting_set:    'bg-purple-100 text-purple-700',
  teaming_agreed: 'bg-green-100 text-green-700',
  declined:       'bg-red-100 text-red-600',
  not_a_fit:      'bg-amber-100 text-amber-600',
};

export function needsFollowUp(contact: OutreachContact, days = 5): boolean {
  if (!['sent'].includes(contact.status)) return false;
  if (!contact.last_activity_at) return false;
  const elapsed = (Date.now() - new Date(contact.last_activity_at).getTime()) / 86400000;
  return elapsed >= days;
}
