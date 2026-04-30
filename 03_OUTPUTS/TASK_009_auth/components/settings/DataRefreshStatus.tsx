'use client';

import React from 'react';
import useSWR from 'swr';
import { RefreshCw, CheckCircle2, XCircle, Clock, Loader2, Database } from 'lucide-react';

// ============================================================
// DATA REFRESH STATUS
// Shows last_run_at and records_upserted for each ingestion source.
// Reads from ingestion_log table via a lightweight API endpoint.
// ============================================================

interface IngestionLogEntry {
  source: string;
  last_run_at: string | null;
  records_upserted: number | null;
  status: 'success' | 'error' | 'running' | null;
  error_message: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  'federal_sam':          'SAM.gov (Federal)',
  'state_pa_emarketplace':'PA eMarketplace',
  'state_pa_treasury':    'PA Treasury',
  'local_allegheny':      'Allegheny County',
  'local_pittsburgh':     'City of Pittsburgh',
  'education_pitt':       'University of Pittsburgh',
  'education_cmu':        'Carnegie Mellon University',
  'education_ccac':       'CCAC',
};

function timeSince(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ${m}m ago`;
  return `${m}m ago`;
}

function formatRunAt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function DataRefreshStatus() {
  const { data, isLoading, error, mutate } = useSWR<IngestionLogEntry[]>(
    '/api/ingestion-status',
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60_000 },
  );

  const entries = data ?? [];

  // Fallback: if ingestion_log table doesn't exist yet, show static placeholder
  const showPlaceholder = error || entries.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Updates every minute · ingestion runs daily</p>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading ingestion status…</span>
        </div>
      )}

      {!isLoading && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200 text-left">
                <th className="px-4 py-2.5 font-semibold">Source</th>
                <th className="px-4 py-2.5 font-semibold">Last Run</th>
                <th className="px-4 py-2.5 font-semibold text-right">Records</th>
                <th className="px-4 py-2.5 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {showPlaceholder
                ? Object.entries(SOURCE_LABELS).map(([key, label]) => (
                    <tr key={key} className="text-gray-400">
                      <td className="px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        {label}
                      </td>
                      <td className="px-4 py-3 text-xs">—</td>
                      <td className="px-4 py-3 text-right text-xs">—</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-300">Not run</span>
                      </td>
                    </tr>
                  ))
                : entries.map((entry) => (
                    <tr key={entry.source} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Database className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-800">
                            {SOURCE_LABELS[entry.source] ?? entry.source}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-700">{formatRunAt(entry.last_run_at)}</div>
                        <div className="text-xs text-gray-400">{timeSince(entry.last_run_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-blue-700">
                          {entry.records_upserted?.toLocaleString() ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.status === 'success' && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" title="Success" />
                        )}
                        {entry.status === 'error' && (
                          <span title={entry.error_message ?? 'Error'}>
                            <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                          </span>
                        )}
                        {entry.status === 'running' && (
                          <Loader2 className="w-4 h-4 text-blue-500 mx-auto animate-spin" />
                        )}
                        {!entry.status && (
                          <Clock className="w-4 h-4 text-gray-300 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
