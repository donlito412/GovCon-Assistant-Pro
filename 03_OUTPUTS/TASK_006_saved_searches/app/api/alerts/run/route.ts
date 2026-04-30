// ============================================================
// GET /api/alerts/run
// Idempotent alert checker — called by Netlify cron at 08:00 ET.
// For each saved_search with alert_enabled=true:
//   1. Re-run the stored filters against opportunities
//      WHERE created_at > last_checked_at
//   2. If new matches: send email via Resend, insert alerts rows
//   3. Update last_checked_at to now
// Idempotency: alerts table acts as dedup — skips already-sent
// opportunity_id+saved_search_id combos.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { createServerSupabaseClient } from '../../../../../../03_OUTPUTS/TASK_001_scaffold/lib/supabase';
import { AlertEmail } from '../../../../lib/email/alert-email';

// ---- Env ----
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const ALERT_FROM = process.env.ALERT_FROM_EMAIL ?? 'alerts@govconassistant.pro';
const ALERT_TO = process.env.ALERT_TO_EMAIL ?? 'jon@murphreeenterprises.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://govconassistant.pro';

// Guard: only allow cron or manual trigger with secret
const CRON_SECRET = process.env.CRON_SECRET ?? '';

function parseComma(val: unknown): string[] {
  if (!val || typeof val !== 'string') return [];
  return val.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Auth: require x-cron-secret header for manual triggers
  const authHeader = req.headers.get('x-cron-secret');
  if (CRON_SECRET && authHeader !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!RESEND_API_KEY) {
    console.error('[alerts/run] RESEND_API_KEY not set');
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const resend = new Resend(RESEND_API_KEY);
  const supabase = createServerSupabaseClient();
  const runStart = new Date().toISOString();

  const summary: {
    searchId: number;
    searchName: string;
    newMatches: number;
    emailSent: boolean;
    error?: string;
  }[] = [];

  // 1. Fetch all alert-enabled saved searches
  const { data: searches, error: searchErr } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('alert_enabled', true);

  if (searchErr) {
    console.error('[alerts/run] Failed to fetch saved_searches:', searchErr.message);
    return NextResponse.json({ error: searchErr.message }, { status: 500 });
  }

  if (!searches || searches.length === 0) {
    return NextResponse.json({ message: 'No alert-enabled searches', processed: 0 }, { status: 200 });
  }

  for (const search of searches) {
    const filters = (search.filters_json ?? {}) as Record<string, string>;
    const sinceTime = search.last_checked_at ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
      // 2. Build the same query as /api/contracts but filtered to new since last_checked_at
      let query = supabase
        .from('opportunities')
        .select('id, source, title, agency_name, contract_type, threshold_category, value_min, value_max, deadline, status')
        .eq('status', 'active')
        .gt('created_at', sinceTime);

      if (filters.q?.trim()) {
        query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%,agency_name.ilike.%${filters.q}%`);
      }
      const sources = parseComma(filters.source);
      if (sources.length > 0) query = query.in('source', sources);

      const naicsCodes = parseComma(filters.naics).map(Number).filter((n) => !isNaN(n));
      if (naicsCodes.length > 0) query = query.in('naics_code', naicsCodes);

      const sectors = parseComma(filters.naics_sector);
      if (sectors.length > 0) query = query.in('naics_sector', sectors);

      if (filters.agency?.trim()) query = query.ilike('agency_name', `%${filters.agency.trim()}%`);

      const thresholds = parseComma(filters.threshold);
      if (thresholds.length > 0) query = query.in('threshold_category', thresholds);

      const types = parseComma(filters.contract_type);
      if (types.length > 0) query = query.in('contract_type', types);

      const setAsides = parseComma(filters.set_aside);
      if (setAsides.length > 0) query = query.in('set_aside_type', setAsides);

      if (filters.min_value) query = query.gte('value_max', Math.round(+filters.min_value * 100));
      if (filters.max_value) query = query.lte('value_max', Math.round(+filters.max_value * 100));
      if (filters.deadline_after) query = query.gte('deadline', new Date(filters.deadline_after).toISOString());
      if (filters.deadline_before) query = query.lte('deadline', new Date(filters.deadline_before).toISOString());

      query = query.order('deadline', { ascending: true, nullsFirst: false }).limit(50);

      const { data: newOpps, error: oppErr } = await query;

      if (oppErr) throw new Error(oppErr.message);

      if (!newOpps || newOpps.length === 0) {
        // Still update last_checked_at even with no matches
        await supabase
          .from('saved_searches')
          .update({ last_checked_at: runStart })
          .eq('id', search.id);

        summary.push({ searchId: search.id, searchName: search.name, newMatches: 0, emailSent: false });
        continue;
      }

      // 3. Dedup: exclude opportunity IDs already sent for this search
      const { data: alreadySent } = await supabase
        .from('alerts')
        .select('opportunity_id')
        .eq('saved_search_id', search.id)
        .in('opportunity_id', newOpps.map((o) => o.id));

      const alreadySentIds = new Set((alreadySent ?? []).map((a) => a.opportunity_id));
      const unsent = newOpps.filter((o) => !alreadySentIds.has(o.id));

      if (unsent.length === 0) {
        await supabase.from('saved_searches').update({ last_checked_at: runStart }).eq('id', search.id);
        summary.push({ searchId: search.id, searchName: search.name, newMatches: 0, emailSent: false });
        continue;
      }

      // 4. Build filtersQueryString for "Browse All" CTA
      const filtersQs = new URLSearchParams(Object.entries(filters)).toString();

      // 5. Render email
      const html = render(
        AlertEmail({
          searchName: search.name,
          newMatchCount: unsent.length,
          contracts: unsent as any,
          appUrl: APP_URL,
          searchId: search.id,
          filtersQueryString: filtersQs,
        }),
      );

      // 6. Send via Resend
      const { error: sendError } = await resend.emails.send({
        from: ALERT_FROM,
        to: ALERT_TO,
        subject: `[PGH Contracts] ${unsent.length} new match${unsent.length !== 1 ? 'es' : ''} for "${search.name}"`,
        html,
      });

      if (sendError) throw new Error(`Resend error: ${sendError.message}`);

      // 7. Insert alerts rows (idempotency guard for future runs)
      const alertRows = unsent.map((o) => ({
        saved_search_id: search.id,
        opportunity_id: o.id,
        sent_at: runStart,
      }));
      await supabase.from('alerts').insert(alertRows);

      // 8. Update last_checked_at
      await supabase
        .from('saved_searches')
        .update({ last_checked_at: runStart })
        .eq('id', search.id);

      console.log(`[alerts/run] "${search.name}": sent ${unsent.length} matches to ${ALERT_TO}`);
      summary.push({ searchId: search.id, searchName: search.name, newMatches: unsent.length, emailSent: true });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[alerts/run] Error processing search ${search.id} "${search.name}":`, msg);
      summary.push({ searchId: search.id, searchName: search.name, newMatches: 0, emailSent: false, error: msg });
    }
  }

  const totalSent = summary.filter((s) => s.emailSent).length;
  const totalMatches = summary.reduce((sum, s) => sum + s.newMatches, 0);

  return NextResponse.json({
    runAt: runStart,
    searchesProcessed: searches.length,
    emailsSent: totalSent,
    totalNewMatches: totalMatches,
    summary,
  }, { status: 200 });
}
