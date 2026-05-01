export const dynamic = 'force-dynamic';

// ============================================================
// GET  /api/pipeline/[id]/notes — get notes array for a pipeline item
// POST /api/pipeline/[id]/notes — append a new note
// Notes stored as JSONB array: [{ text, created_at }]
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface PipelineNote {
  text: string;
  created_at: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('pipeline_items')
      .select('notes_json')
      .eq('id', id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json((data.notes_json as PipelineNote[]) ?? [], { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const body = await req.json() as { text: string };
    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'Note text is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Fetch existing notes
    const { data: existing, error: fetchError } = await supabase
      .from('pipeline_items')
      .select('notes_json')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Pipeline item not found' }, { status: 404 });
    }

    const currentNotes: PipelineNote[] = (existing.notes_json as PipelineNote[]) ?? [];
    const newNote: PipelineNote = {
      text: body.text.trim(),
      created_at: new Date().toISOString(),
    };
    const updatedNotes = [...currentNotes, newNote];

    const { data, error } = await supabase
      .from('pipeline_items')
      .update({ notes_json: updatedNotes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('notes_json')
      .single();

    if (error) {
      console.error('[api/pipeline/notes POST]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data?.notes_json as PipelineNote[]) ?? [], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
