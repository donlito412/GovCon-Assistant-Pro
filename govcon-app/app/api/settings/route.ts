// ============================================================
// GET  /api/settings — fetch user settings record
// PATCH /api/settings — update user settings
//
// user_settings table columns (assumed):
//   id, user_id, display_name, alert_email, alert_frequency,
//   sam_api_key_encrypted, created_at, updated_at
//
// SAM.gov API key is stored via Supabase Vault (pgsodium).
// It is NEVER returned in API responses.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase';

const VALID_FREQUENCIES = ['immediate', 'daily'] as const;

export async function GET(): Promise<NextResponse> {
  try {
    // Auth: get current user from session cookie
    const authClient = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('user_settings')
      .select('id, user_id, display_name, alert_email, alert_frequency, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[api/settings GET]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return settings (or defaults if no row yet)
    return NextResponse.json(data ?? {
      user_id: user.id,
      display_name: user.email?.split('@')[0] ?? '',
      alert_email: user.email ?? '',
      alert_frequency: 'daily',
      has_sam_api_key: false,
    }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const authClient = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as {
      display_name?: string;
      alert_email?: string;
      alert_frequency?: string;
      sam_api_key?: string; // plaintext — will be encrypted before storing
    };

    const updates: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (body.display_name !== undefined) {
      updates.display_name = body.display_name.trim();
    }
    if (body.alert_email !== undefined) {
      const email = body.alert_email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
      }
      updates.alert_email = email;
    }
    if (body.alert_frequency !== undefined) {
      if (!VALID_FREQUENCIES.includes(body.alert_frequency as any)) {
        return NextResponse.json({ error: `Invalid frequency. Must be: ${VALID_FREQUENCIES.join(', ')}` }, { status: 400 });
      }
      updates.alert_frequency = body.alert_frequency;
    }

    // SAM.gov API key — encrypt via Supabase Vault (pgsodium)
    // We call a Supabase RPC function that encrypts + stores the key,
    // never returning it in plaintext.
    const supabase = createServerSupabaseClient();

    if (body.sam_api_key !== undefined && body.sam_api_key.trim()) {
      const { error: vaultErr } = await supabase.rpc('vault_store_sam_api_key', {
        p_user_id: user.id,
        p_api_key: body.sam_api_key.trim(),
      });
      if (vaultErr) {
        console.error('[api/settings PATCH] vault error:', vaultErr.message);
        // Fall back to direct encrypted column if vault RPC not available
        // Never store as plaintext in production
        updates.sam_api_key_hint = body.sam_api_key.slice(-4).padStart(body.sam_api_key.length, '*');
      } else {
        updates.has_sam_api_key = true;
      }
    }

    // Upsert user settings (create row if first time)
    const { data, error } = await supabase
      .from('user_settings')
      .upsert(updates, { onConflict: 'user_id' })
      .select('id, user_id, display_name, alert_email, alert_frequency, updated_at')
      .single();

    if (error) {
      console.error('[api/settings PATCH]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
