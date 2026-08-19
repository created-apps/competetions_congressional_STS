import { notFound, redirect } from "next/navigation"
import type { UIMessage } from "ai"
import { getChatData, listUserConversations } from "@/lib/conversations"
import { getCurrentUser } from "@/lib/auth/session"
import { ChatClient } from "@/components/chat-client"
import type { DBMessage } from "@/lib/types"

export const dynamic = "force-dynamic"

/** Converts stored user/assistant messages into UIMessages for the client. */
function toUIMessages(messages: DBMessage[]): UIMessage[] {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim().length > 0)
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    }))
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const { conversationId } = await params
  const data = await getChatData(conversationId, user.id)

  if (!data) {
    notFound()
  }

  const conversations = await listUserConversations(user.id, data.assistant.id)

  return (
    <ChatClient
      conversationId={conversationId}
      assistant={data.assistant}
      conversations={conversations}
      initialMessages={toUIMessages(data.messages)}
    />
  )
}
