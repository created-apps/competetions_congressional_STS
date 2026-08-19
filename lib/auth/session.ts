import "server-only"
import { randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { getSupabaseServer } from "@/lib/supabase/server"

const COOKIE_NAME = "cc_session"
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

export type SessionUser = { id: string; email: string }

/** Creates a session row and returns its opaque token, or null on failure. */
export async function createSession(userId: string): Promise<string | null> {
  const supabase = getSupabaseServer()
  if (!supabase) return null

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000).toISOString()

  const { error } = await supabase.from("sessions").insert({
    token,
    user_id: userId,
    expires_at: expiresAt,
  })
  if (error) return null
  return token
}

/** Writes the session token to a secure, http-only cookie. */
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  })
}

/** Removes the session cookie from the browser. */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/** Reads the raw session token from the request cookies. */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(COOKIE_NAME)?.value ?? null
}

/**
 * Resolves the currently signed-in user from the session cookie, or null.
 * Expired sessions are deleted and treated as signed out.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = getSupabaseServer()
  if (!supabase) return null

  const token = await getSessionToken()
  if (!token) return null

  const { data: session } = await supabase
    .from("sessions")
    .select("user_id, expires_at")
    .eq("token", token)
    .single()

  if (!session) return null

  if (new Date(session.expires_at).getTime() < Date.now()) {
    await supabase.from("sessions").delete().eq("token", token)
    return null
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", session.user_id)
    .single()

  if (!user) return null
  return { id: user.id as string, email: user.email as string }
}

/** Deletes a session row (used on sign-out). */
export async function destroySession(token: string): Promise<void> {
  const supabase = getSupabaseServer()
  if (!supabase) return
  await supabase.from("sessions").delete().eq("token", token)
}
