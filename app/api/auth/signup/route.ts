import { NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseServer } from "@/lib/supabase/server"
import { hashPassword } from "@/lib/auth/password"
import { createSession, setSessionCookie } from "@/lib/auth/session"

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
})

export async function POST(req: Request) {
  const supabase = getSupabaseServer()
  if (!supabase) {
    return NextResponse.json(
      { error: "The database isn't connected yet. Add your Supabase environment variables to get started." },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email and a password of at least 8 characters." },
      { status: 400 },
    )
  }

  const email = parsed.data.email.trim().toLowerCase()
  const { password } = parsed.data

  const { data: existing } = await supabase.from("users").select("id").eq("email", email).maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try signing in instead." },
      { status: 409 },
    )
  }

  const password_hash = await hashPassword(password)
  const { data: user, error } = await supabase
    .from("users")
    .insert({ email, password_hash })
    .select("id")
    .single()

  if (error || !user) {
    // A unique-violation here means a concurrent signup won the race.
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 })
  }

  const token = await createSession(user.id as string)
  if (!token) {
    return NextResponse.json(
      { error: "Your account was created, but sign-in failed. Please sign in." },
      { status: 500 },
    )
  }

  await setSessionCookie(token)
  return NextResponse.json({ ok: true })
}
