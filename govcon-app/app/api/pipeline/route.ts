// ============================================================
// GET  /api/pipeline  — fetch all pipeline items (with joined opportunity)
// POST /api/pipeline  — add an opportunity to the pipeline
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('pipeline_items')
      .select(`
        id, opportunity_id, stage, notes_json, created_at, updated_at,
        opportunity:opportunities (
          id, source, title, agency_name, solicitation_number,
          contract_type, threshold_category, set_aside_type,
          value_min, value_max, deadline, posted_date,
          place_of_performance_city, place_of_performance_state,
          url, status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api/pipeline GET]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as { opportunity_id: number; stage?: string };

    if (!body.opportunity_id) {
      return NextResponse.json({ error: 'opportunity_id is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Guard: don't add duplicates
    const { data: existing } = await supabase
      .from('pipeline_items')
      .select('id')
      .eq('opportunity_id', body.opportunity_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Already in pipeline', id: existing.id }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('pipeline_items')
      .insert({
        opportunity_id: body.opportunity_id,
        stage: body.stage ?? 'Identified',
        notes_json: [],
        updated_at: new Date().toISOString(),
      })
      .select(`
        id, opportunity_id, stage, notes_json, created_at, updated_at,
        opportunity:opportunities (
          id, source, title, agency_name, solicitation_number,
          contract_type, threshold_category, value_min, value_max,
          deadline, url, status
        )
      `)
      .single();

    if (error) {
      console.error('[api/pipeline POST]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[api/pipeline] Added opportunity ${body.opportunity_id} to pipeline.`);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
