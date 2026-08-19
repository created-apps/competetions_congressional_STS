import "server-only"
import { getSupabaseServer } from "@/lib/supabase/server"
import type { Assistant, Conversation, DBMessage } from "@/lib/types"

export type ChatData = {
  conversation: Conversation
  assistant: Pick<Assistant, "id" | "name" | "description" | "conversation_starters">
  messages: DBMessage[]
}

/** Loads a conversation, its assistant, and message history for its owner. */
export async function getChatData(conversationId: string, userId: string): Promise<ChatData | null> {
  const supabase = getSupabaseServer()
  if (!supabase) return null

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single()

  if (!conversation) return null

  const { data: assistant } = await supabase
    .from("assistants")
    .select("id, name, description, conversation_starters")
    .eq("id", conversation.assistant_id)
    .single()

  if (!assistant) return null

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  return {
    conversation: conversation as Conversation,
    assistant: {
      ...assistant,
      conversation_starters: Array.isArray(assistant.conversation_starters)
        ? (assistant.conversation_starters as string[])
        : [],
    },
    messages: (messages ?? []) as DBMessage[],
  }
}

/** Lists a user's conversations for a given assistant, newest first. */
export async function listUserConversations(
  userId: string,
  assistantId: string,
): Promise<Pick<Conversation, "id" | "title" | "updated_at">[]> {
  const supabase = getSupabaseServer()
  if (!supabase) return []

  const { data } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .eq("assistant_id", assistantId)
    .order("updated_at", { ascending: false })

  return (data ?? []) as Pick<Conversation, "id" | "title" | "updated_at">[]
}
