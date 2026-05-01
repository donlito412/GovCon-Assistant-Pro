export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import React from 'react';
import Link from 'next/link';
import {
  FileSearch, KanbanSquare, TrendingUp, ArrowRight,
  Clock, DollarSign, AlertTriangle, Award, Gift,
  Bot, Building2, ChevronRight,
} from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase';

// ============================================================
// DASHBOARD — GovTribe-style overview
// Shows category counts + recent activity
// ============================================================

async function getDashboardStats() {
  try {
    const supabase = createServerSupabaseClient();
    const now = new Date().toISOString();
    const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      activeSamgov,
      awardedUsaspending,
      grantsTotal,
      urgentRes,
      pipelineRes,
      grantsCountRes,
    ] = await Promise.all([
      supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('source', 'federal_samgov'),
      supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'awarded').eq('source', 'federal_usaspending'),
      supabase.from('grants').select('id', { count: 'exact', head: true }),
      supabase.from('opportunities').select('id', { count: 'exact', head: true })
        .eq('status', 'active').gte('deadline', now).lte('deadline', sevenDaysOut),
      supabase.from('pipeline_items').select('id', { count: 'exact', head: true }),
      supabase.from('grants').select('id', { count: 'exact', head: true }),
    ]);

    return {
      federalContractOpps: activeSamgov.count ?? 0,
      federalAwards: awardedUsaspending.count ?? 0,
      federalGrants: grantsCountRes.count ?? 0,
      urgentDeadlines: urgentRes.count ?? 0,
      pipelineCount: pipelineRes.count ?? 0,
    };
  } catch {
    return { federalContractOpps: 0, federalAwards: 0, federalGrants: 0, urgentDeadlines: 0, pipelineCount: 0 };
  }
}

async function getRecentOpportunities() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from('opportunities')
      .select('id, title, agency_name, source, deadline, threshold_category, contract_type, status')
      .eq('source', 'federal_samgov')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(6);
    return data ?? [];
  } catch {
    return [];
  }
}

async function getTopAwards() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from('opportunities')
      .select('id, title, agency_name, value_max, description, posted_date')
      .eq('source', 'federal_usaspending')
      .eq('status', 'awarded')
      .order('value_max', { ascending: false })
      .limit(5);
    return data ?? [];
  } catch {
    return [];
  }
}

async function getUrgentOpportunities() {
  try {
    const supabase = createServerSupabaseClient();
    const now = new Date().toISOString();
    const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('opportunities')
      .select('id, title, agency_name, deadline, threshold_category')
      .eq('status', 'active')
      .gte('deadline', now)
      .lte('deadline', sevenDaysOut)
      .order('deadline', { ascending: true })
      .limit(5);
    return data ?? [];
  } catch {
    return [];
  }
}

function formatDollars(cents: number | null): string {
  if (!cents) return '—';
  const d = cents / 100;
  if (d >= 1_000_000_000) return `$${(d / 1_000_000_000).toFixed(1)}B`;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(1)}M`;
  if (d >= 1_000) return `$${(d / 1_000).toFixed(0)}K`;
  return `$${d.toFixed(0)}`;
}

// GovTribe-style category card
function CategoryCard({
  label, count, sub, icon: Icon, href, color, bgColor,
}: {
  label: string;
  count: number;
  sub?: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bgColor: string;
}) {
  return (
    <Link href={href} className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xl font-bold text-gray-900">{count.toLocaleString()}</p>
        <p className="text-xs font-medium text-gray-700 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition" />
    </Link>
  );
}

export default async function DashboardPage() {
  const [stats, recent, urgent, topAwards] = await Promise.all([
    getDashboardStats(),
    getRecentOpportunities(),
    getUrgentOpportunities(),
    getTopAwards(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pittsburgh GovCon Intelligence</h1>
          <p className="text-gray-500 text-sm mt-1">
            Federal contracts, awards, grants, and opportunities — all in one place.
          </p>
        </div>
        <Link
          href="/assistant"
          className="hidden sm:flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition"
        >
          <Bot className="w-4 h-4" />
          Ask GovCon AI
        </Link>
      </div>

      {/* Category counts — GovTribe search result style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CategoryCard
          label="Federal Contract Opportunities"
          count={stats.federalContractOpps}
          sub="Active solicitations · SAM.gov"
          icon={FileSearch}
          href="/contracts"
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <CategoryCard
          label="Federal Contract Awards"
          count={stats.federalAwards}
          sub="Awarded contracts · USASpending"
          icon={Award}
          href="/awards"
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <CategoryCard
          label="Federal Grant Opportunities"
          count={stats.federalGrants}
          sub="Grants available · Multiple sources"
          icon={Gift}
          href="/grants"
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <CategoryCard
          label="Urgent Deadlines"
          count={stats.urgentDeadlines}
          sub="Due within 7 days"
          icon={AlertTriangle}
          href="/contracts?sort=deadline:asc"
          color="text-red-600"
          bgColor="bg-red-50"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Active Solicitations */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-blue-600" />
              Recent Federal Solicitations
            </h2>
            <Link href="/contracts" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              {stats.federalContractOpps.toLocaleString()} total <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {recent.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-gray-400">
                No active solicitations. Run ingestion to populate.
              </li>
            ) : (
              recent.map((opp) => (
                <li key={opp.id} className="hover:bg-gray-50 transition">
                  <Link href={`/contracts/${opp.id}`} className="flex items-start gap-3 px-5 py-3 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 line-clamp-1 transition">
                        {opp.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{opp.agency_name}</p>
                    </div>
                    {opp.deadline && (
                      <p className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(opp.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </Link>
                </li>
              ))
            )}
          </ul>
          <div className="px-5 py-3 border-t border-gray-50">
            <Link href="/contracts" className="text-xs text-blue-600 hover:underline">
              Browse all {stats.federalContractOpps.toLocaleString()} solicitations →
            </Link>
          </div>
        </section>

        {/* Top Federal Contract Awards */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Top Federal Contract Awards
            </h2>
            <Link href="/awards" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              {stats.federalAwards.toLocaleString()} total <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {topAwards.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-gray-400">
                No awards data yet.
              </li>
            ) : (
              topAwards.map((award) => {
                const recipientMatch = award.description?.match(/Awarded to:\s*([^.]+)/i);
                const recipient = recipientMatch?.[1]?.trim() ?? '—';
                return (
                  <li key={award.id} className="hover:bg-gray-50 transition">
                    <Link href="/awards" className="flex items-start gap-3 px-5 py-3 group">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-green-700 line-clamp-1 transition">
                          {award.title}
                        </p>
                        <p className="text-xs text-blue-600 truncate">{recipient}</p>
                      </div>
                      <p className="text-xs font-bold text-gray-700 flex-shrink-0">
                        {formatDollars(award.value_max)}
                      </p>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
          <div className="px-5 py-3 border-t border-gray-50">
            <Link href="/awards" className="text-xs text-blue-600 hover:underline">
              Browse all {stats.federalAwards.toLocaleString()} awards →
            </Link>
          </div>
        </section>
      </div>

      {/* Urgent deadlines + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent deadlines */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Deadlines This Week
            </h2>
            <Link href="/contracts?sort=deadline:asc" className="text-xs text-blue-600 hover:underline">View all →</Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {urgent.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-gray-400">No urgent deadlines this week.</li>
            ) : (
              urgent.map((opp) => (
                <li key={opp.id} className="hover:bg-gray-50 transition">
                  <Link href={`/contracts/${opp.id}`} className="flex items-center gap-3 px-5 py-3 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-red-600 line-clamp-1 transition">{opp.title}</p>
                      <p className="text-xs text-gray-400">{opp.agency_name}</p>
                    </div>
                    {opp.deadline && (
                      <p className="text-xs font-bold text-red-500 flex-shrink-0">
                        {new Date(opp.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* AI Assistant CTA */}
        <section className="bg-gradient-to-br from-[#0f1e35] to-[#1a3a60] rounded-xl p-6 flex flex-col justify-between min-h-[200px]">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-3">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-white font-bold text-lg">GovCon AI Assistant</h2>
            <p className="text-blue-300 text-sm mt-1.5">
              Ask about Pittsburgh-area contracts, vendors, agencies, bidding strategies, or get a daily briefing on new opportunities.
            </p>
          </div>
          <div className="flex gap-3 mt-4">
            <Link
              href="/assistant"
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-500 transition"
            >
              <Bot className="w-4 h-4" />
              Open AI Assistant
            </Link>
            <Link
              href="/assistant?prompt=Give+me+a+briefing+on+new+Pittsburgh+federal+contracts+today"
              className="flex items-center gap-2 bg-white/10 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-white/20 transition border border-white/20"
            >
              Daily Briefing
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
