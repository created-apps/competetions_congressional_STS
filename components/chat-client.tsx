"use client"

import { useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { Menu, SendHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { ChatSidebar, type ConversationListItem } from "@/components/chat-sidebar"
import { MessageRow, TypingIndicator } from "@/components/message-list"

type Props = {
  conversationId: string
  assistant: { id: string; name: string; description: string; conversation_starters: string[] }
  conversations: ConversationListItem[]
  initialMessages: UIMessage[]
}

export function ChatClient({ conversationId, assistant, conversations, initialMessages }: Props) {
  const [input, setInput] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          conversationId,
        },
      }),
    }),
  })

  const busy = status === "submitted" || status === "streaming"
  const isEmpty = messages.length === 0

  // Auto-scroll to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, busy])

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    sendMessage({ text: trimmed })
    setInput("")
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit(input)
    }
  }

  const lastMessage = messages[messages.length - 1]
  const showTyping = status === "submitted" || (status === "streaming" && lastMessage?.role !== "assistant")

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <ChatSidebar
          assistantId={assistant.id}
          assistantName={assistant.name}
          conversations={conversations}
          activeConversationId={conversationId}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open conversations" />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Conversations</SheetTitle>
              <ChatSidebar
                assistantId={assistant.id}
                assistantName={assistant.name}
                conversations={conversations}
                activeConversationId={conversationId}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-base font-semibold">{assistant.name}</h1>
            <p className="truncate text-xs text-muted-foreground">{assistant.description}</p>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
            {isEmpty ? (
              <div className="flex flex-col items-center gap-3 pt-8 text-center">
                <h2 className="font-heading text-2xl font-semibold text-balance">
                  Hi! I&apos;m your {assistant.name.replace(" Coach", "")} coach.
                </h2>
                <p className="max-w-md text-pretty text-muted-foreground">
                  Ask me anything, or tap a suggestion below to get started. There are no silly questions here.
                </p>
              </div>
            ) : (
              messages.map((m) => <MessageRow key={m.id} message={m} />)
            )}
            {showTyping ? <TypingIndicator /> : null}
            {error ? (
              <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Something went wrong. Please try sending your message again.
              </p>
            ) : null}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-background/80 px-4 py-3 backdrop-blur">
          <div className="mx-auto w-full max-w-3xl">
            {isEmpty && assistant.conversation_starters.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {assistant.conversation_starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => submit(starter)}
                    disabled={busy}
                    className="rounded-full border border-border bg-card px-3.5 py-1.5 text-left text-sm text-foreground/90 transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-60"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            ) : null}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                submit(input)
              }}
              className="relative flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-primary/50"
            >
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Message your coach…"
                aria-label="Message your coach"
                className="max-h-40 min-h-10 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <Button
                type="submit"
                size="icon"
                disabled={busy || !input.trim()}
                aria-label="Send message"
                className="shrink-0 rounded-xl"
              >
                <SendHorizontal />
              </Button>
            </form>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Coaches can make mistakes — double-check important details like deadlines.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
