import { createClient } from '@supabase/supabase-js';

/**
 * Creates a standard Supabase client using the anon key.
 * Used for general client-side operations where RLS applies.
 */
export const createBrowserSupabaseClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    return createClient(supabaseUrl, supabaseAnonKey);
};

/**
 * Creates a server-side Supabase client using the service role key.
 * WARNING: Bypasses Row Level Security (RLS). Use ONLY in server environments (API routes, Server Components, Server Actions).
 */
export const createServerSupabaseClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side client');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
};

// Default export for client-side usage if needed directly
export const supabase = typeof window !== 'undefined' ? createBrowserSupabaseClient() : null as any;
