import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Returns true when the Supabase environment variables are configured.
 * The service role key is server-only and must never be exposed to the client.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

let cached: SupabaseClient | null = null

/**
 * Creates a server-only Supabase client using the service role key.
 * NEVER import this into a client component.
 *
 * Returns `null` when the required env vars are missing so callers can
 * degrade gracefully instead of crashing.
 */
export function getSupabaseServer(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (cached) return cached

  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
  return cached
}
