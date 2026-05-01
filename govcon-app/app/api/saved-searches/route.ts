export const dynamic = 'force-dynamic';

// ============================================================
// GET  /api/saved-searches — list all saved searches
// POST /api/saved-searches — create a new saved search
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api/saved-searches GET]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as {
      name?: string;
      filters_json?: Record<string, string>;
      alert_enabled?: boolean;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!body.filters_json || typeof body.filters_json !== 'object') {
      return NextResponse.json({ error: 'filters_json is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        name: body.name.trim(),
        filters_json: body.filters_json,
        alert_enabled: body.alert_enabled ?? true,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[api/saved-searches POST]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[saved-searches] Created: "${body.name}"`);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
