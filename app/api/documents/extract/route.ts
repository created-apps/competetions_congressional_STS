import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import {
  MAX_FILE_BYTES,
  detectKind,
  extractDocumentText,
} from "@/lib/documents/extract"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Please sign in to upload a document." }, { status: 401 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 })
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "That file is too large. Please upload a document under 10 MB." },
      { status: 413 },
    )
  }

  const kind = detectKind(file)
  if (!kind) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF or Word (.docx) document." },
      { status: 415 },
    )
  }

  try {
    const { text, truncated } = await extractDocumentText(file, kind)
    if (!text) {
      return NextResponse.json(
        { error: "We couldn't find any text in that document. If it's a scanned PDF, it may be image-only." },
        { status: 422 },
      )
    }
    return NextResponse.json({
      filename: file.name,
      kind,
      chars: text.length,
      truncated,
      text,
    })
  } catch (err) {
    console.log("[documents] extraction failed:", err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: "We couldn't read that document. Please try a different file." },
      { status: 422 },
    )
  }
}
