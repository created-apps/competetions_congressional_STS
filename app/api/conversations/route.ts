import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth/session"

export async function POST(req: Request) {
  const supabase = getSupabaseServer()
  if (!supabase) {
    return NextResponse.json(
      { error: "The database isn't connected yet. Add your Supabase environment variables to get started." },
      { status: 503 },
    )
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Please sign in to start a conversation." }, { status: 401 })
  }

  let body: { assistantId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { assistantId } = body
  if (!assistantId) {
    return NextResponse.json({ error: "Missing assistantId." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      assistant_id: assistantId,
      user_id: user.id,
      title: "New conversation",
    })
    .select("id")
    .single()

  if (error || !data) {
    console.log("[v0] Failed to create conversation:", error?.message)
    return NextResponse.json({ error: "Could not start a new conversation. Please try again." }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
