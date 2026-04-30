'use client';

import React, { useState } from 'react';
import {
  CheckCircle, XCircle, Loader2, Save, PlusCircle, Mail, Users,
} from 'lucide-react';

// ============================================================
// APPROVAL CARD — AI suggests an action, Jon approves or dismisses
// Types: save_contact | add_to_pipeline | draft_email | add_to_bid_team
// ============================================================

export interface ApprovalData {
  type: 'save_contact' | 'add_to_pipeline' | 'draft_email' | 'add_to_bid_team';
  label: string;
  data: Record<string, any>;
}

interface Props {
  approval: ApprovalData;
  onApprove?: (type: string, data: any) => void;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  save_contact:     { icon: Save,        color: 'text-blue-600',   bgColor: 'bg-blue-50 border-blue-200' },
  add_to_pipeline:  { icon: PlusCircle,  color: 'text-green-600',  bgColor: 'bg-green-50 border-green-200' },
  draft_email:      { icon: Mail,        color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
  add_to_bid_team:  { icon: Users,       color: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-200' },
};

export function ApprovalCard({ approval, onApprove }: Props) {
  const [status,  setStatus]  = useState<'pending' | 'approved' | 'dismissed' | 'loading'>('pending');
  const [error,   setError]   = useState<string | null>(null);

  const config = TYPE_CONFIG[approval.type] ?? TYPE_CONFIG.save_contact;
  const Icon = config.icon;

  const handleApprove = async () => {
    setStatus('loading');
    setError(null);
    try {
      await executeApproval(approval.type, approval.data);
      setStatus('approved');
      onApprove?.(approval.type, approval.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      setStatus('pending');
    }
  };

  if (status === 'approved') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
        <CheckCircle className="w-4 h-4" />
        <span className="font-medium">Done — {approval.label}</span>
      </div>
    );
  }

  if (status === 'dismissed') {
    return (
      <div className="text-xs text-gray-400 px-1">Action dismissed.</div>
    );
  }

  return (
    <div className={`border rounded-xl px-4 py-3 ${config.bgColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-sm font-bold ${config.color}`}>{approval.label}</span>
      </div>

      <ApprovalDetails type={approval.type} data={approval.data} />

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleApprove}
          disabled={status === 'loading'}
          className={`flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
            approval.type === 'draft_email' ? 'bg-purple-600 hover:bg-purple-700' :
            approval.type === 'add_to_pipeline' ? 'bg-green-600 hover:bg-green-700' :
            approval.type === 'add_to_bid_team' ? 'bg-indigo-600 hover:bg-indigo-700' :
            'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {status === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          {status === 'loading' ? 'Executing…' : 'Approve'}
        </button>
        <button
          onClick={() => setStatus('dismissed')}
          disabled={status === 'loading'}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-300 px-3 py-1.5 rounded-lg transition"
        >
          <XCircle className="w-3 h-3" />Dismiss
        </button>
      </div>
    </div>
  );
}

function ApprovalDetails({ type, data }: { type: string; data: Record<string, any> }) {
  switch (type) {
    case 'save_contact':
      return (
        <div className="text-xs text-gray-700 space-y-0.5">
          <p><strong>{data.company_name ?? data.name}</strong></p>
          {data.contact_name && <p>{data.contact_name}</p>}
          {data.email && <p className="text-gray-500">{data.email}</p>}
          {data.certifications?.length > 0 && (
            <p className="text-indigo-600">{data.certifications.join(', ')}</p>
          )}
        </div>
      );

    case 'add_to_pipeline':
      return (
        <div className="text-xs text-gray-700 space-y-0.5">
          <p><strong>{data.title}</strong></p>
          {data.agency && <p className="text-gray-500">{data.agency}</p>}
          {data.stage && <p>Stage: <span className="font-medium">{data.stage}</span></p>}
          {data.due_date && <p>Due: {data.due_date}</p>}
        </div>
      );

    case 'draft_email':
      return (
        <div className="text-xs text-gray-700 space-y-1">
          <p><strong>To:</strong> {data.to_email ?? data.to_name}</p>
          <p><strong>Subject:</strong> {data.subject}</p>
          <p className="text-gray-500 line-clamp-3 border-t border-gray-200 pt-1 mt-1 whitespace-pre-wrap">{data.body}</p>
        </div>
      );

    case 'add_to_bid_team':
      return (
        <div className="text-xs text-gray-700 space-y-0.5">
          <p><strong>{data.company_name}</strong></p>
          {data.role && <p>Role: {data.role}</p>}
          {data.bid_id && <p>Bid ID: {data.bid_id}</p>}
        </div>
      );

    default:
      return <pre className="text-xs text-gray-500 overflow-auto max-h-24">{JSON.stringify(data, null, 2)}</pre>;
  }
}

// ── Action executor ────────────────────────────────────────

async function executeApproval(type: string, data: Record<string, any>) {
  switch (type) {
    case 'save_contact': {
      const res = await fetch('/api/contacts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`); }
      break;
    }
    case 'add_to_pipeline': {
      const res = await fetch('/api/pipeline', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`); }
      break;
    }
    case 'draft_email': {
      const { contactId, ...emailData } = data;
      const res = await fetch(`/api/outreach/${contactId}/emails`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'outbound', ...emailData }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`); }
      break;
    }
    case 'add_to_bid_team': {
      const res = await fetch(`/api/bids/${data.bid_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_member: data }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`); }
      break;
    }
    default:
      throw new Error(`Unknown approval type: ${type}`);
  }
}
