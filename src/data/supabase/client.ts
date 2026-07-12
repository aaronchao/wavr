import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Lazily-initialized Supabase client. Returns null when env vars are not
 * configured so the app can still browse/search signed-out (or in a fresh
 * clone without secrets) instead of crashing.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  client ??= createClient(url, anonKey);
  return client;
}
