import "server-only"
import { getSupabaseServer } from "@/lib/supabase/server"
import type { Assistant } from "@/lib/types"

/**
 * Fetches all active assistants from Supabase.
 * Returns an empty array when the database isn't configured yet.
 */
export async function getActiveAssistants(): Promise<Assistant[]> {
  const supabase = getSupabaseServer()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("assistants")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  if (error) {
    console.log("[v0] Failed to load assistants:", error.message)
    return []
  }

  return (data ?? []) as Assistant[]
}
