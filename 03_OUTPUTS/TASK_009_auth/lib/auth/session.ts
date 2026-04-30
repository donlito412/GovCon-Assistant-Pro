// ============================================================
// SESSION HELPERS
// Server-side utilities for getting the current user session.
// Use in Server Components, API routes, and server actions.
// ============================================================

import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Get the current session from the server component context.
 * Returns null if not authenticated.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) console.error('[session] getSession error:', error.message);
  return session;
}

/**
 * Get the current user. Returns null if not authenticated.
 */
export async function getUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Require authentication — redirects to /login if no session.
 * Use at the top of protected Server Components or page.tsx files.
 */
export async function requireAuth(): Promise<User> {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Sign out the current user (server action helper).
 */
export async function signOut(): Promise<void> {
  const supabase = createServerComponentClient({ cookies });
  await supabase.auth.signOut();
  redirect('/login');
}
