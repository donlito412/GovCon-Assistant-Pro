'use client';

import React from 'react';
import useSWR from 'swr';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, ExternalLink, Calendar, DollarSign,
  Building2, Users, FileText, CheckCircle2, Landmark,
  Loader2, AlertCircle,
} from 'lucide-react';
import {
  fmtAmountRange, CATEGORY_LABELS, CATEGORY_COLORS,
  GRANT_TYPE_LABELS, GRANT_TYPE_COLORS, type Grant,
} from '@/lib/api/grants';

// ============================================================
// GRANT DETAIL PAGE — /grants/[id]
// ============================================================

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
        <Icon className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 py-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: React.ElementType }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-sm font-bold text-gray-900">{value}</div>
    </div>
  );
}

function DeadlineValue({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-gray-400">No deadline listed</span>;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  const fmt = new Date(deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const color = days < 0 ? 'text-gray-400' : days <= 7 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-gray-900';
  return (
    <span className={color}>
      {fmt}
      {days >= 0 && <span className="text-xs font-normal ml-1">({days}d remaining)</span>}
      {days < 0  && <span className="text-xs font-normal ml-1">(closed)</span>}
    </span>
  );
}

export default function GrantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: grant, error, isLoading } = useSWR<Grant>(
    id ? `/api/grants/${id}` : null,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading grant…</span>
      </div>
    );
  }

  if (error || !grant) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 max-w-lg">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">Grant not found or failed to load.</span>
      </div>
    );
  }

  const catColor  = CATEGORY_COLORS[grant.category]  ?? 'bg-gray-100 text-gray-600';
  const typeColor = GRANT_TYPE_COLORS[grant.grant_type] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Grants
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${catColor}`}>
            {CATEGORY_LABELS[grant.category] ?? grant.category}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeColor}`}>
            {GRANT_TYPE_LABELS[grant.grant_type] ?? grant.grant_type}
          </span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 leading-snug mb-2">{grant.title}</h1>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Building2 className="w-4 h-4 text-gray-400" />
          {grant.agency}
        </div>

        {grant.url && (
          <div className="mt-4">
            <a
              href={grant.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
            >
              <ExternalLink className="w-4 h-4" />
              Apply / Learn More
            </a>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat
          label="Award Amount"
          icon={DollarSign}
          value={fmtAmountRange(grant.min_amount, grant.max_amount)}
        />
        <Stat
          label="Application Deadline"
          icon={Calendar}
          value={<DeadlineValue deadline={grant.application_deadline} />}
        />
        <Stat
          label="Eligible Applicants"
          icon={Users}
          value={
            grant.eligible_entities?.includes('any')
              ? 'All applicants'
              : (grant.eligible_entities ?? []).map((e) => e.replace(/_/g, ' ')).join(', ') || '—'
          }
        />
      </div>

      {/* Description */}
      {grant.description && (
        <Section title="Description" icon={Landmark}>
          {grant.description}
        </Section>
      )}

      {/* Requirements */}
      {grant.requirements && (
        <Section title="Eligibility Requirements" icon={CheckCircle2}>
          {grant.requirements}
        </Section>
      )}

      {/* How to Apply */}
      {grant.how_to_apply && (
        <Section title="How to Apply" icon={FileText}>
          {grant.how_to_apply}
          {grant.url && (
            <div className="mt-3">
              <a
                href={grant.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-600 hover:underline text-sm font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open official program page
              </a>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
