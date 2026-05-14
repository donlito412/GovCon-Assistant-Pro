import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/supabase-js';

export async function getRouteUser(): Promise<User | null> {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('[auth/route] getUser error:', error.message);
    return null;
  }

  return user ?? null;
}
