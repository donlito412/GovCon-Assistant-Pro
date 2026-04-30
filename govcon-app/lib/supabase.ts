import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are present
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. Please configure .env.local');
}

/**
 * Creates a standard Supabase client using the anon key.
 * Used for general client-side operations where RLS applies.
 */
export const createBrowserSupabaseClient = () => {
    return createClient(supabaseUrl, supabaseAnonKey);
};

/**
 * Creates a server-side Supabase client using the service role key.
 * WARNING: Bypasses Row Level Security (RLS). Use ONLY in server environments (API routes, Server Components, Server Actions).
 */
export const createServerSupabaseClient = () => {
    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side client');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
};

// Default export for client-side usage if needed directly
export const supabase = createBrowserSupabaseClient();
