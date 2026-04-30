// ============================================================
// GET /api/agencies/[id]
// Agency detail + pre-computed stats:
//   - Agency base record
//   - Active opportunity count + total value
//   - Top NAICS codes (by opportunity count)
//   - Key contacts (contracting officers from SAM.gov data)
//   - Recent 5 active opportunities
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const supabase = createServerSupabaseClient();

    // Fetch agency base record
    const { data: agency, error: agencyErr } = await supabase
      .from('agencies')
      .select('*')
      .eq('id', id)
      .single();

    if (agencyErr || !agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    // All opportunities for this agency (active + historical for stats)
    const { data: allOpps } = await supabase
      .from('opportunities')
      .select('id, title, source, contract_type, threshold_category, naics_code, naics_sector, value_max, value_min, deadline, posted_date, status, url, solicitation_number')
      .eq('agency_name', agency.name)
      .order('deadline', { ascending: true, nullsFirst: false });

    const opps = allOpps ?? [];
    const activeOpps = opps.filter((o) => o.status === 'active');

    // Active stats
    const activeCount = activeOpps.length;
    const activeValueCents = activeOpps.reduce((sum, o) => sum + (o.value_max ?? o.value_min ?? 0), 0);
    const avgValueCents = activeCount > 0 ? Math.round(activeValueCents / activeCount) : 0;

    // Top NAICS codes
    const naicsCount: Record<string, { code: number; sector: string; count: number; totalCents: number }> = {};
    for (const o of opps) {
      if (!o.naics_code) continue;
      const key = String(o.naics_code);
      if (!naicsCount[key]) {
        naicsCount[key] = { code: o.naics_code, sector: o.naics_sector ?? 'Unknown', count: 0, totalCents: 0 };
      }
      naicsCount[key].count++;
      naicsCount[key].totalCents += o.value_max ?? o.value_min ?? 0;
    }
    const topNaics = Object.values(naicsCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Contract type breakdown
    const typeCount: Record<string, number> = {};
    for (const o of opps) {
      if (!o.contract_type) continue;
      typeCount[o.contract_type] = (typeCount[o.contract_type] ?? 0) + 1;
    }

    // Source breakdown
    const sourceCount: Record<string, number> = {};
    for (const o of opps) {
      sourceCount[o.source] = (sourceCount[o.source] ?? 0) + 1;
    }

    // Recent 5 active opportunities
    const recentActive = activeOpps.slice(0, 5);

    return NextResponse.json({
      agency,
      stats: {
        active_count: activeCount,
        active_value_cents: activeValueCents,
        avg_value_cents: avgValueCents,
        total_opportunities: opps.length,
        type_breakdown: typeCount,
        source_breakdown: sourceCount,
      },
      top_naics: topNaics,
      recent_active: recentActive,
    }, {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=120' },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
