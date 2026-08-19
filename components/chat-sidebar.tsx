"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, MessageSquarePlus, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { SignOutButton } from "@/components/sign-out-button"

export type ConversationListItem = {
  id: string
  title: string
  updated_at: string
}

export function ChatSidebar({
  assistantId,
  assistantName,
  conversations,
  activeConversationId,
  onNavigate,
}: {
  assistantId: string
  assistantName: string
  conversations: ConversationListItem[]
  activeConversationId: string
  onNavigate?: () => void
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function newChat() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantId }),
      })
      const data = await res.json()
      if (res.ok) {
        onNavigate?.()
        router.push(`/chat/${data.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div className="flex flex-col gap-1 px-1 pt-1">
        <Link
          href="/"
          onClick={onNavigate}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All coaches
        </Link>
        <p className="mt-1 truncate font-heading text-sm font-semibold text-sidebar-foreground">{assistantName}</p>
      </div>

      <Button onClick={newChat} disabled={creating} className="w-full justify-start">
        {creating ? <Spinner data-icon="inline-start" /> : <MessageSquarePlus data-icon="inline-start" />}
        New chat
      </Button>

      <div className="flex min-h-0 flex-1 flex-col">
        <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Your chats</p>
        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-1 pr-2" aria-label="Past conversations">
            {conversations.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No chats yet. Start one above!
              </p>
            ) : (
              conversations.map((c) => {
                const active = c.id === activeConversationId
                return (
                  <Link
                    key={c.id}
                    href={`/chat/${c.id}`}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                    )}
                  >
                    <MessageCircle className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                    <span className="truncate">{c.title || "New conversation"}</span>
                  </Link>
                )
              })
            )}
          </nav>
        </ScrollArea>
      </div>

      <div className="border-t border-sidebar-border pt-3">
        <SignOutButton className="w-full justify-start" />
      </div>
    </div>
  )
}
