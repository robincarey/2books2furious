import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the SECRET key. This bypasses RLS, so it
 * must never be imported into client components. The browser never receives a
 * Supabase credential; all reads/writes flow through Server Components and
 * Server Actions.
 */
/**
 * Resolve config from app-specific names first (B2F_*), falling back to the
 * generic SUPABASE_* names. The B2F_ prefix avoids collisions with any global
 * SUPABASE_URL / SUPABASE_KEY a developer may export in their shell, which Next
 * would otherwise let shadow .env.local during `next dev`.
 */
function resolveConfig() {
  const url = process.env.B2F_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.B2F_SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SECRET_KEY;
  return { url, key };
}

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const { url, key } = resolveConfig();

  if (!url || !key) {
    throw new Error(
      "Missing Supabase config. Set B2F_SUPABASE_URL and B2F_SUPABASE_SECRET_KEY (or SUPABASE_URL / SUPABASE_SECRET_KEY) in .env.local (local) and in the Vercel project settings (production).",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** True when Supabase env vars are configured (used for friendly setup screens). */
export function isSupabaseConfigured(): boolean {
  const { url, key } = resolveConfig();
  return Boolean(url && key);
}
