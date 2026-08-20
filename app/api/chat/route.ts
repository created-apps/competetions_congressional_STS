import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
  toUIMessageStream,
  tool,
  type UIMessage,
} from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth/session"

export const maxDuration = 30

const DEFAULT_MODEL = "gpt-4o-mini"
const MAX_HISTORY = 20

type Attachment = { filename: string; text: string; truncated?: boolean }

/** Total characters of attached-document text we inject across a conversation. */
const MAX_TOTAL_DOC_CHARS = 120_000

/**
 * Builds a delimited context block from all documents attached to a
 * conversation, so the coach can use them on every turn (not just the upload
 * turn). Caps the combined size to protect the model's context budget.
 */
function buildDocumentsContext(docs: { filename: string; content: string }[]): string {
  if (docs.length === 0) return ""

  let budget = MAX_TOTAL_DOC_CHARS
  const blocks: string[] = []
  for (const doc of docs) {
    if (budget <= 0) break
    const slice = doc.content.slice(0, budget)
    budget -= slice.length
    const safeName = doc.filename.replace(/"/g, "'")
    blocks.push(`<attached_document name="${safeName}">\n${slice}\n</attached_document>`)
  }

  return `The user has attached the following document(s) to this conversation. Read them and use their contents to inform your answers, referring to them by name when relevant.\n\n${blocks.join("\n\n")}`
}

/** Emits a single assistant text message as a UI message stream response. */
function staticMessageResponse(text: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const id = generateId()
      writer.write({ type: "text-start", id })
      writer.write({ type: "text-delta", id, delta: text })
      writer.write({ type: "text-end", id })
    },
  })
  return createUIMessageStreamResponse({ stream })
}

/** Extracts the plain-text content from a UIMessage's parts. */
function textFromMessage(message: UIMessage | undefined): string {
  if (!message) return ""
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim()
}

async function tavilySearch(query: string) {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    return { error: "Web search is not configured right now.", results: [] as unknown[] }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: 5,
        include_answer: true,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      return { error: `Search failed (status ${res.status}).`, results: [] as unknown[] }
    }

    const data = (await res.json()) as {
      answer?: string
      results?: { title: string; url: string; content: string }[]
    }

    return {
      answer: data.answer ?? null,
      results: (data.results ?? []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
      })),
    }
  } catch {
    // Let the model keep answering without search rather than blocking.
    return { error: "The web search timed out or was unavailable.", results: [] as unknown[] }
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(req: Request) {
  let payload: { messages?: UIMessage[]; conversationId?: string; attachment?: Attachment }
  try {
    payload = await req.json()
  } catch {
    return staticMessageResponse("Something went wrong reading your message. Please try again.")
  }

  const { messages = [], conversationId, attachment } = payload
  const hasAttachment = Boolean(attachment?.text && attachment.filename)

  if (!process.env.OPENAI_API_KEY) {
    return staticMessageResponse(
      "I can't answer yet because the `OPENAI_API_KEY` hasn't been set up. Add it in your project settings and I'll be ready to help.",
    )
  }

  const supabase = getSupabaseServer()
  if (!supabase) {
    return staticMessageResponse(
      "The database isn't connected yet, so I can't save our chat. Add your Supabase environment variables and try again.",
    )
  }

  const user = await getCurrentUser()
  if (!user) {
    return staticMessageResponse("Your session has expired. Please sign in again to keep chatting.")
  }

  if (!conversationId) {
    return staticMessageResponse("This conversation is missing some information. Try starting a new chat.")
  }

  // Load the conversation and its assistant's system prompt.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, assistant_id, title")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single()

  if (!conversation) {
    return staticMessageResponse("I couldn't find this conversation. Try starting a new one from the sidebar.")
  }

  const { data: assistant } = await supabase
    .from("assistants")
    .select("system_prompt, name")
    .eq("id", conversation.assistant_id)
    .single()

  const systemPrompt =
    assistant?.system_prompt ??
    "You are a friendly, encouraging mentor helping a high school student with their competition."

  // Persist the newest user message (with a note when a document was attached).
  const lastMessage = messages[messages.length - 1]
  const userText = textFromMessage(lastMessage)
  if (lastMessage?.role === "user" && userText) {
    const persistedContent = hasAttachment
      ? `${userText}\n\n📎 Attached document: ${attachment!.filename}`
      : userText
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: persistedContent,
    })

    // Auto-title the conversation from the first user message.
    if (!conversation.title || conversation.title === "New conversation") {
      const title = userText.length > 60 ? `${userText.slice(0, 60).trim()}…` : userText
      await supabase.from("conversations").update({ title }).eq("id", conversationId)
    }
  }

  // Persist a newly attached document so it stays in context for later turns.
  if (hasAttachment) {
    await supabase.from("documents").insert({
      conversation_id: conversationId,
      filename: attachment!.filename,
      content: attachment!.text,
    })
  }

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const model = openai(process.env.OPENAI_MODEL || DEFAULT_MODEL)

  const recentMessages = messages.slice(-MAX_HISTORY)
  const modelMessages = await convertToModelMessages(recentMessages)

  // Inject every document attached to this conversation (including one just
  // uploaded above), so follow-up questions can still reference it.
  const { data: docRows } = await supabase
    .from("documents")
    .select("filename, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  // Prefer the persisted documents (available on every turn). Fall back to this
  // turn's attachment if the documents table isn't reachable yet (e.g. the
  // 004 migration hasn't been run), so uploads still work on the current turn.
  let docsForContext = docRows ?? []
  if (docsForContext.length === 0 && hasAttachment) {
    docsForContext = [{ filename: attachment!.filename, content: attachment!.text }]
  }

  const documentsContext = buildDocumentsContext(docsForContext)
  const effectiveSystem = documentsContext ? `${systemPrompt}\n\n${documentsContext}` : systemPrompt

  const result = streamText({
    model,
    system: effectiveSystem,
    messages: modelMessages,
    stopWhen: stepCountIs(5),
    tools: {
      web_search: tool({
        description:
          "Search the live web for current information; use this for anything time-sensitive (deadlines, rule changes, current events) or anything you're not fully certain of.",
        inputSchema: z.object({
          query: z.string().describe("The search query."),
        }),
        execute: async ({ query }) => {
          const output = await tavilySearch(query)
          // Log the tool call and result into the messages table for history.
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            role: "tool",
            content: `web_search: ${query}`,
            tool_name: "web_search",
            tool_input: { query },
            tool_output: output as Record<string, unknown>,
          })
          return output
        },
      }),
    },
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      onError: () =>
        "Sorry, I ran into a problem while responding. Please try sending your message again.",
      onEnd: async ({ messages: finalMessages }) => {
        const assistantMessage = finalMessages[finalMessages.length - 1]
        const assistantText = textFromMessage(assistantMessage)
        if (assistantMessage?.role === "assistant" && assistantText) {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: assistantText,
          })
          await supabase
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId)
        }
      },
    }),
  })
}
