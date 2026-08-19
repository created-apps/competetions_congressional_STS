import { NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseServer } from "@/lib/supabase/server"
import { verifyPassword } from "@/lib/auth/password"
import { createSession, setSessionCookie } from "@/lib/auth/session"

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
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
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const { password } = parsed.data

  const { data: user } = await supabase
    .from("users")
    .select("id, password_hash")
    .eq("email", email)
    .maybeSingle()

  // Same generic message and comparison path whether or not the user exists.
  const valid = user ? await verifyPassword(password, user.password_hash) : false
  if (!user || !valid) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 })
  }

  const token = await createSession(user.id as string)
  if (!token) {
    return NextResponse.json({ error: "Could not sign you in. Please try again." }, { status: 500 })
  }

  await setSessionCookie(token)
  return NextResponse.json({ ok: true })
}
