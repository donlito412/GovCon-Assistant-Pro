// ============================================================
// PATCH  /api/saved-searches/[id] — update name or alert_enabled
// DELETE /api/saved-searches/[id] — delete saved search
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const body = await req.json() as {
      name?: string;
      alert_enabled?: boolean;
      filters_json?: Record<string, string>;
    };

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.alert_enabled !== undefined) updates.alert_enabled = body.alert_enabled;
    if (body.filters_json !== undefined) updates.filters_json = body.filters_json;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('saved_searches')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[api/saved-searches/[id] PATCH]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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

    // Also delete associated alerts rows
    await supabase.from('alerts').delete().eq('saved_search_id', id);

    const { error } = await supabase.from('saved_searches').delete().eq('id', id);
    if (error) {
      console.error('[api/saved-searches/[id] DELETE]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[saved-searches] Deleted id=${id}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
