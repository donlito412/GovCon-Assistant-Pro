export const dynamic = 'force-dynamic';

// ============================================================
// PATCH /api/pipeline/[id]  — update stage (and optionally other fields)
// DELETE /api/pipeline/[id] — remove item from pipeline
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

const VALID_STAGES = [
  'Identified', 'Qualifying', 'Pursuing',
  'Proposal_In_Progress', 'Submitted', 'Won', 'Lost', 'No_Bid',
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const body = await req.json() as { stage?: string };

    if (body.stage && !VALID_STAGES.includes(body.stage)) {
      return NextResponse.json({ error: `Invalid stage: ${body.stage}` }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.stage) updates.stage = body.stage;

    const { data, error } = await supabase
      .from('pipeline_items')
      .update(updates)
      .eq('id', id)
      .select('id, opportunity_id, stage, notes_json, updated_at')
      .single();

    if (error) {
      console.error('[api/pipeline/[id] PATCH]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    console.log(`[api/pipeline] Item ${id} moved to stage: ${body.stage}`);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('pipeline_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[api/pipeline/[id] DELETE]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[api/pipeline] Removed pipeline item ${id}.`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
