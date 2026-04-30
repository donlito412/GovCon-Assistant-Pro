import React from 'react';
import Link from 'next/link';
import {
  FileSearch, KanbanSquare, Bell, TrendingUp,
  ArrowRight, Clock, DollarSign, AlertTriangle,
} from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase';

// ============================================================
// HOME / DASHBOARD OVERVIEW PAGE
// Server component — queries Supabase directly for real stats.
// Shows: key metrics, recent opportunities, quick links.
// ============================================================

async function getDashboardStats() {
  try {
    const supabase = createServerSupabaseClient();
    const now = new Date().toISOString();
    const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [totalRes, urgentRes, newTodayRes, pipelineRes] = await Promise.all([
      supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('opportunities').select('id', { count: 'exact', head: true })
        .eq('status', 'active').gte('deadline', now).lte('deadline', sevenDaysOut),
      supabase.from('opportunities').select('id', { count: 'exact', head: true })
        .eq('status', 'active').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('pipeline_items').select('id', { count: 'exact', head: true }),
    ]);

    return {
      totalActive: totalRes.count ?? 0,
      urgentDeadlines: urgentRes.count ?? 0,
      newToday: newTodayRes.count ?? 0,
      pipelineCount: pipelineRes.count ?? 0,
    };
  } catch {
    return { totalActive: 0, urgentDeadlines: 0, newToday: 0, pipelineCount: 0 };
  }
}

async function getRecentOpportunities() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from('opportunities')
      .select('id, title, agency_name, source, deadline, threshold_category, contract_type')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
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
      .select('id, title, agency_name, source, deadline, threshold_category')
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

function StatCard({
  label, value, icon: Icon, color, href,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  href?: string;
}) {
  const content = (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition group`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      {href && <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 ml-auto transition" />}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function SourceDot({ source }: { source: string }) {
  let color = 'bg-gray-400';
  if (source.startsWith('federal_')) color = 'bg-blue-500';
  else if (source.startsWith('state_')) color = 'bg-purple-500';
  else if (source.startsWith('local_')) color = 'bg-green-500';
  else if (source.startsWith('education_')) color = 'bg-orange-500';
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${color}`} />;
}

export default async function DashboardPage() {
  const [stats, recent, urgent] = await Promise.all([
    getDashboardStats(),
    getRecentOpportunities(),
    getUrgentOpportunities(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pittsburgh-area government contracts, grants, and opportunities — all in one place.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Opportunities"
          value={stats.totalActive}
          icon={FileSearch}
          color="bg-blue-100 text-blue-600"
          href="/contracts"
        />
        <StatCard
          label="Due Within 7 Days"
          value={stats.urgentDeadlines}
          icon={AlertTriangle}
          color="bg-red-100 text-red-600"
          href="/contracts?deadline_before=&sort=deadline:asc"
        />
        <StatCard
          label="Added Today"
          value={stats.newToday}
          icon={TrendingUp}
          color="bg-green-100 text-green-600"
          href="/contracts?sort=posted_date:desc"
        />
        <StatCard
          label="In Your Pipeline"
          value={stats.pipelineCount}
          icon={KanbanSquare}
          color="bg-purple-100 text-purple-600"
          href="/pipeline"
        />
      </div>

      {/* Two-column: recent + urgent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent opportunities */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Recently Added
            </h2>
            <Link href="/contracts?sort=posted_date:desc" className="text-xs text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {recent.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-gray-400">
                No opportunities yet. Run the ingestion pipeline to populate data.
              </li>
            ) : (
              recent.map((opp) => (
                <li key={opp.id} className="px-5 py-3 hover:bg-gray-50 transition">
                  <Link href={`/contracts/${opp.id}`} className="flex items-start gap-2 group">
                    <SourceDot source={opp.source} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 line-clamp-1 transition">
                        {opp.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{opp.agency_name}</p>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Urgent deadlines */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Deadlines This Week
            </h2>
            <Link href="/contracts?sort=deadline:asc" className="text-xs text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {urgent.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-gray-400">
                No urgent deadlines this week.
              </li>
            ) : (
              urgent.map((opp) => (
                <li key={opp.id} className="px-5 py-3 hover:bg-gray-50 transition">
                  <Link href={`/contracts/${opp.id}`} className="flex items-start gap-2 group">
                    <SourceDot source={opp.source} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-red-600 line-clamp-1 transition">
                        {opp.title}
                      </p>
                      {opp.deadline && (
                        <p className="text-xs text-red-500 font-medium mt-0.5">
                          Due {new Date(opp.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {/* Quick actions */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-bold text-lg">Find Your Next Win</h2>
          <p className="text-blue-200 text-sm mt-1">
            Search and filter all Pittsburgh-area opportunities from federal, state, and local sources.
          </p>
        </div>
        <Link
          href="/contracts"
          className="flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-3 rounded-lg hover:bg-blue-50 transition flex-shrink-0"
        >
          <FileSearch className="w-4 h-4" />
          Browse Contracts
        </Link>
      </section>
    </div>
  );
}
