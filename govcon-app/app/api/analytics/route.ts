export const dynamic = 'force-dynamic';

// ============================================================
// GET /api/analytics
// Single aggregation call — returns all dashboard data.
// All heavy computation done in Supabase, not in JS.
// Cached 5 minutes server-side.
// ============================================================

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

function startOfWeek(weeksAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() - weeksAgo * 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET(): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const in7  = new Date(now.getTime() + 7  * 86400000).toISOString();
  const in30 = new Date(now.getTime() + 30 * 86400000).toISOString();
  const in60 = new Date(now.getTime() + 60 * 86400000).toISOString();
  const in90 = new Date(now.getTime() + 90 * 86400000).toISOString();
  const weekAgo = new Date(now.getTime() - 7  * 86400000).toISOString();

  try {
    // Run all queries in parallel
    const [
      totalActiveRes,
      newThisWeekRes,
      totalValueRes,
      soonestDeadlineRes,
      sourceBreakdownRes,
      naicsBreakdownRes,
      weeklyVolumeRows,
      deadlineBucketsRes,
      topAgenciesRes,
      pipelineRes,
    ] = await Promise.all([

      // 1. Total active count
      supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),

      // 2. New this week
      supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('created_at', weekAgo),

      // 3. Total active value (sum value_max)
      supabase
        .from('opportunities')
        .select('value_max, value_min')
        .eq('status', 'active'),

      // 4. Soonest upcoming deadline
      supabase
        .from('opportunities')
        .select('deadline, title')
        .eq('status', 'active')
        .gte('deadline', nowIso)
        .order('deadline', { ascending: true })
        .limit(1),

      // 5. Source breakdown (count by source)
      supabase
        .from('opportunities')
        .select('source')
        .eq('status', 'active'),

      // 6. Top 10 NAICS by total value
      supabase
        .from('opportunities')
        .select('naics_code, naics_sector, value_max, value_min')
        .eq('status', 'active')
        .not('naics_code', 'is', null),

      // 7. Weekly volume: last 12 weeks — fetch created_at and aggregate in JS
      supabase
        .from('opportunities')
        .select('created_at')
        .gte('created_at', startOfWeek(12)),

      // 8. Deadline buckets: 0-7, 7-30, 30-60, 60-90 days
      supabase
        .from('opportunities')
        .select('deadline, title, id, source, value_max, value_min, agency_name, contract_type')
        .eq('status', 'active')
        .gte('deadline', nowIso)
        .lte('deadline', in90)
        .order('deadline', { ascending: true }),

      // 9. Top 10 agencies by active count
      supabase
        .from('opportunities')
        .select('agency_name, value_max, value_min')
        .eq('status', 'active')
        .not('agency_name', 'is', null),

      // 10. Pipeline: items with stage + opp value
      supabase
        .from('pipeline_items')
        .select(`stage, opportunity:opportunities(value_max, value_min)`),
    ]);

    // ---- Post-process ----

    // Total value in cents
    const totalValueCents = (totalValueRes.data ?? []).reduce(
      (sum, o) => sum + (o.value_max ?? o.value_min ?? 0), 0,
    );

    // Soonest deadline
    const soonestOpp = soonestDeadlineRes.data?.[0] ?? null;
    const soonestDays = soonestOpp?.deadline
      ? Math.ceil((new Date(soonestOpp.deadline).getTime() - now.getTime()) / 86400000)
      : null;

    // Source breakdown — group into Federal / State / Local / Education
    const sourceGroupMap: Record<string, { count: number }> = {};
    for (const opp of sourceBreakdownRes.data ?? []) {
      const src = opp.source as string;
      let group = 'Other';
      if (src.startsWith('federal_')) group = 'Federal';
      else if (src.startsWith('state_')) group = 'State';
      else if (src.startsWith('local_')) group = 'Local';
      else if (src.startsWith('education_')) group = 'Education';
      sourceGroupMap[group] = { count: (sourceGroupMap[group]?.count ?? 0) + 1 };
    }

    // Also by raw source
    const rawSourceMap: Record<string, number> = {};
    for (const opp of sourceBreakdownRes.data ?? []) {
      rawSourceMap[opp.source] = (rawSourceMap[opp.source] ?? 0) + 1;
    }

    // NAICS breakdown
    const naicsMap: Record<number, { code: number; sector: string; totalCents: number; count: number }> = {};
    for (const opp of naicsBreakdownRes.data ?? []) {
      const code = opp.naics_code as number;
      if (!naicsMap[code]) {
        naicsMap[code] = { code, sector: opp.naics_sector ?? 'Unknown', totalCents: 0, count: 0 };
      }
      naicsMap[code].totalCents += opp.value_max ?? opp.value_min ?? 0;
      naicsMap[code].count++;
    }
    const topNaics = Object.values(naicsMap)
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 10);

    // Weekly volume — bucket by ISO week
    const weeklyMap: Record<string, number> = {};
    const weekLabels: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay() - i * 7);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      weekLabels.push(label);
      weeklyMap[label] = 0;
    }
    for (const row of weeklyVolumeRows.data ?? []) {
      const d = new Date(row.created_at);
      // Find which week bucket
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        if (d >= weekStart && d < weekEnd) {
          const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
          weeklyMap[label] = (weeklyMap[label] ?? 0) + 1;
          break;
        }
      }
    }
    const weeklyVolume = weekLabels.map((label) => ({ week: label, count: weeklyMap[label] ?? 0 }));

    // Deadline buckets
    const deadlines = deadlineBucketsRes.data ?? [];
    const buckets = {
      week:   deadlines.filter((o) => o.deadline! <= in7),
      month:  deadlines.filter((o) => o.deadline! > in7  && o.deadline! <= in30),
      sixty:  deadlines.filter((o) => o.deadline! > in30 && o.deadline! <= in60),
      ninety: deadlines.filter((o) => o.deadline! > in60 && o.deadline! <= in90),
    };

    // Top agencies
    const agencyMap: Record<string, { name: string; count: number; totalCents: number }> = {};
    for (const opp of topAgenciesRes.data ?? []) {
      const name = opp.agency_name as string;
      if (!agencyMap[name]) agencyMap[name] = { name, count: 0, totalCents: 0 };
      agencyMap[name].count++;
      agencyMap[name].totalCents += opp.value_max ?? opp.value_min ?? 0;
    }
    const topAgencies = Object.values(agencyMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Pipeline by stage
    const STAGES = ['Identified','Qualifying','Pursuing','Proposal_In_Progress','Submitted','Won','Lost','No_Bid'];
    const pipelineByStage: Record<string, { stage: string; count: number; totalCents: number }> = {};
    for (const stage of STAGES) pipelineByStage[stage] = { stage, count: 0, totalCents: 0 };
    for (const item of pipelineRes.data ?? []) {
      const stage = item.stage as string;
      const opp = item.opportunity as { value_max?: number; value_min?: number } | null;
      if (pipelineByStage[stage]) {
        pipelineByStage[stage].count++;
        pipelineByStage[stage].totalCents += opp?.value_max ?? opp?.value_min ?? 0;
      }
    }
    const pipelineStages = STAGES.map((s) => pipelineByStage[s]);

    // Win rate
    const won  = pipelineByStage['Won']?.count  ?? 0;
    const lost = pipelineByStage['Lost']?.count ?? 0;
    const outcomes = won + lost;
    const winRate = outcomes >= 3 ? Math.round((won / outcomes) * 100) : null;

    const pipelineTotalCents = pipelineStages.reduce((sum, s) => sum + s.totalCents, 0);

    return NextResponse.json({
      kpis: {
        total_active:      totalActiveRes.count ?? 0,
        new_this_week:     newThisWeekRes.count ?? 0,
        total_value_cents: totalValueCents,
        soonest_deadline_days: soonestDays,
        soonest_deadline_title: soonestOpp?.title ?? null,
        pipeline_total_cents: pipelineTotalCents,
        win_rate_pct: winRate,
      },
      source_breakdown:   Object.entries(sourceGroupMap).map(([group, v]) => ({ group, count: v.count })),
      raw_source_breakdown: Object.entries(rawSourceMap).map(([source, count]) => ({ source, count })),
      weekly_volume:      weeklyVolume,
      top_naics:          topNaics,
      deadline_buckets:   {
        week:   buckets.week.length,
        month:  buckets.month.length,
        sixty:  buckets.sixty.length,
        ninety: buckets.ninety.length,
        items:  deadlines.slice(0, 30), // first 30 for timeline display
      },
      top_agencies:       topAgencies,
      pipeline_by_stage:  pipelineStages,
    }, {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=300' }, // 5-minute cache
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/analytics]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
