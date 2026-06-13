import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the SECRET key. This bypasses RLS, so it
 * must never be imported into client components. The browser never receives a
 * Supabase credential; all reads/writes flow through Server Components and
 * Server Actions.
 */
export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Set them in .env.local (local) and in the Vercel project settings (production).",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** True when Supabase env vars are configured (used for friendly setup screens). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}
