'use client';
export const dynamic = 'force-dynamic';


import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle, FileSearch, BarChart3, Hash, Trophy } from 'lucide-react';
import { AgencyHeader } from '@/components/agencies/AgencyHeader';
import { SpendingChart } from '@/components/agencies/SpendingChart';
import { TopNaicsList } from '@/components/agencies/TopNaicsList';
import { ActiveContractsList } from '@/components/agencies/ActiveContractsList';
import { AwardHistory } from '@/components/agencies/AwardHistory';
import { useAgencyDetail } from '@/lib/api/agencies';

// ============================================================
// AGENCY DETAIL / PROFILE PAGE — /agencies/[id]
// Client component — all data from SWR hooks.
// Tabbed layout: Overview | NAICS | Award History
// ============================================================

type Tab = 'overview' | 'naics' | 'awards';

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export default function AgencyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { detail, isLoading, error } = useAgencyDetail(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading agency profile…</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 max-w-xl">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">{error ? `Failed to load: ${error.message}` : 'Agency not found'}</span>
      </div>
    );
  }

  const { agency, stats, top_naics, recent_active } = detail;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Profile header */}
      <AgencyHeader agency={agency} stats={stats} />

      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 overflow-x-auto">
        <TabButton
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          icon={FileSearch}
          label="Active Contracts"
        />
        <TabButton
          active={activeTab === 'naics'}
          onClick={() => setActiveTab('naics')}
          icon={Hash}
          label="NAICS Breakdown"
        />
        <TabButton
          active={activeTab === 'awards'}
          onClick={() => setActiveTab('awards')}
          icon={Trophy}
          label="Award History"
        />
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <SectionCard title={`Active Contracts (${stats.active_count})`}>
            <ActiveContractsList
              contracts={recent_active}
              agencyName={agency.name}
              totalActive={stats.active_count}
            />
          </SectionCard>

          {Object.keys(stats.type_breakdown).length > 0 && (
            <SectionCard title="Contract Type Breakdown">
              <SpendingChart stats={stats} />
            </SectionCard>
          )}
        </div>
      )}

      {/* NAICS tab */}
      {activeTab === 'naics' && (
        <SectionCard title="Top NAICS Categories">
          <TopNaicsList naics={top_naics} />
        </SectionCard>
      )}

      {/* Award history tab */}
      {activeTab === 'awards' && (
        <SectionCard title="Past Awards — Pittsburgh Area (USASpending.gov)">
          <AwardHistory agencyId={Number(id)} />
        </SectionCard>
      )}
    </div>
  );
}
