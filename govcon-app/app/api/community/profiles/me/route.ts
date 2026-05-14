export const dynamic = 'force-dynamic';

// ============================================================
// GET /api/community/profiles/me — current user's own profile
// (Returns 404 if not yet created)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getRouteUser } from '@/lib/auth/route';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const user = await getRouteUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('community_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'No profile found' }, { status: 404 });
  return NextResponse.json(data);
}
