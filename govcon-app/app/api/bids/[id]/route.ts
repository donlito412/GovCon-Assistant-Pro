export const dynamic = 'force-dynamic';

// ============================================================
// GET   /api/bids/[id] — bid detail
// PATCH /api/bids/[id] — update bid (outcome, team, narrative, etc.)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('bid_records')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const allowed = [
    'contract_title','agency','solicitation_number','source',
    'bid_submitted_date','bid_amount','bid_narrative',
    'team_composition','documents_submitted','status',
    'award_date','award_amount',
    'if_lost_winner_name','if_lost_winner_amount','if_lost_reason',
  ];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No patchable fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('bid_records')
    .update(patch)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
