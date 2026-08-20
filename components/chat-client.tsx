"use client"

import { useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { FileText, Menu, Paperclip, SendHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ChatSidebar, type ConversationListItem } from "@/components/chat-sidebar"
import { MessageRow, TypingIndicator } from "@/components/message-list"

type Props = {
  conversationId: string
  assistant: { id: string; name: string; description: string; conversation_starters: string[] }
  conversations: ConversationListItem[]
  initialMessages: UIMessage[]
}

type Attachment = { filename: string; text: string; truncated: boolean; chars: number }

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export function ChatClient({ conversationId, assistant, conversations, initialMessages }: Props) {
  const [input, setInput] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [uploading, setUploading] = useState(false)
  const [attachError, setAttachError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // `body` carries per-message extras (the attachment) from sendMessage().
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: {
          messages,
          conversationId,
          ...body,
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

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return

    setAttachError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/documents/extract", { method: "POST", body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "We couldn't read that document.")
      setAttachment({
        filename: data.filename,
        text: data.text,
        truncated: Boolean(data.truncated),
        chars: data.chars ?? data.text.length,
      })
    } catch (err) {
      setAttachment(null)
      setAttachError(err instanceof Error ? err.message : "We couldn't read that document.")
    } finally {
      setUploading(false)
    }
  }

  function submit(text: string) {
    const trimmed = text.trim()
    if (busy || uploading) return
    if (!trimmed && !attachment) return

    const messageText = trimmed || `Please take a look at my attached document (${attachment!.filename}).`
    sendMessage(
      { text: messageText },
      attachment
        ? { body: { attachment: { filename: attachment.filename, text: attachment.text, truncated: attachment.truncated } } }
        : undefined,
    )
    setInput("")
    setAttachment(null)
    setAttachError(null)
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
  const canSend = !busy && !uploading && (Boolean(input.trim()) || Boolean(attachment))

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
                  Ask me anything, attach a PDF or Word doc for feedback, or tap a suggestion below to get started.
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
                    disabled={busy || uploading}
                    className="rounded-full border border-border bg-card px-3.5 py-1.5 text-left text-sm text-foreground/90 transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-60"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Attachment status */}
            {uploading ? (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                <Spinner />
                Reading your document…
              </div>
            ) : attachment ? (
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{attachment.filename}</span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {attachment.chars.toLocaleString()} chars{attachment.truncated ? " (truncated)" : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  aria-label="Remove attached document"
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : attachError ? (
              <p className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{attachError}</p>
            ) : null}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                submit(input)
              }}
              className="relative flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-primary/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                onChange={onFileSelected}
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || uploading}
                aria-label="Attach a PDF or Word document"
                className="shrink-0 rounded-xl"
              >
                <Paperclip />
              </Button>
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
                disabled={!canSend}
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
