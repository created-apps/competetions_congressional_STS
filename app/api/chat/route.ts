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
  let payload: { messages?: UIMessage[]; conversationId?: string }
  try {
    payload = await req.json()
  } catch {
    return staticMessageResponse("Something went wrong reading your message. Please try again.")
  }

  const { messages = [], conversationId } = payload

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

  // Persist the newest user message.
  const lastMessage = messages[messages.length - 1]
  const userText = textFromMessage(lastMessage)
  if (lastMessage?.role === "user" && userText) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: userText,
    })

    // Auto-title the conversation from the first user message.
    if (!conversation.title || conversation.title === "New conversation") {
      const title = userText.length > 60 ? `${userText.slice(0, 60).trim()}…` : userText
      await supabase.from("conversations").update({ title }).eq("id", conversationId)
    }
  }

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const model = openai(process.env.OPENAI_MODEL || DEFAULT_MODEL)

  const recentMessages = messages.slice(-MAX_HISTORY)
  const modelMessages = await convertToModelMessages(recentMessages)

  const result = streamText({
    model,
    system: systemPrompt,
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
