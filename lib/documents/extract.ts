import "server-only"

/** Max characters of extracted text we keep, to stay within the model's context budget. */
export const MAX_EXTRACTED_CHARS = 100_000

/** Max upload size we accept (10 MB). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export type ExtractResult = {
  text: string
  truncated: boolean
}

export type SupportedKind = "pdf" | "docx"

/** Determines whether a file is a supported PDF or DOCX, by MIME type then extension. */
export function detectKind(file: File): SupportedKind | null {
  const type = file.type
  const name = file.name.toLowerCase()

  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf"
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "docx"
  }
  return null
}

/** Collapses excessive whitespace and trims, then caps at MAX_EXTRACTED_CHARS. */
function normalize(raw: string): ExtractResult {
  const cleaned = raw.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  if (cleaned.length > MAX_EXTRACTED_CHARS) {
    return { text: cleaned.slice(0, MAX_EXTRACTED_CHARS), truncated: true }
  }
  return { text: cleaned, truncated: false }
}

/** Extracts plain text from a supported document. Throws on unreadable files. */
export async function extractDocumentText(file: File, kind: SupportedKind): Promise<ExtractResult> {
  if (kind === "docx") {
    const mammoth = (await import("mammoth")).default
    const buffer = Buffer.from(await file.arrayBuffer())
    const { value } = await mammoth.extractRawText({ buffer })
    return normalize(value ?? "")
  }

  // pdf
  const { extractText, getDocumentProxy } = await import("unpdf")
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocumentProxy(data)
  const { text } = await extractText(pdf, { mergePages: true })
  return normalize(Array.isArray(text) ? text.join("\n") : text ?? "")
}
