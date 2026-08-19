"use client"

import type { UIMessage } from "ai"
import { Globe, Sparkles } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Markdown } from "@/components/markdown"
import { cn } from "@/lib/utils"

function CoachAvatar() {
  return (
    <Avatar className="size-8 shrink-0 border border-border">
      <AvatarFallback className="bg-primary/12 text-primary">
        <Sparkles className="size-4" aria-hidden="true" />
      </AvatarFallback>
    </Avatar>
  )
}

export function MessageRow({ message }: { message: UIMessage }) {
  const isUser = message.role === "user"

  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")

  // Detect an in-progress web search (tool part without output yet).
  const searching = message.parts.some(
    (p) =>
      p.type === "tool-web_search" &&
      "state" in p &&
      (p.state === "input-streaming" || p.state === "input-available"),
  )

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground sm:max-w-[75%]">
          <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">{text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <CoachAvatar />
      <div className="min-w-0 flex-1 pt-0.5">
        {searching ? (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
            <Globe className="size-3.5 animate-pulse" aria-hidden="true" />
            Searching the web…
          </div>
        ) : null}
        {text ? (
          <div className="text-foreground">
            <Markdown>{text}</Markdown>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <CoachAvatar />
      <div className="flex items-center gap-1 pt-3" aria-label="Coach is typing">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("size-2 animate-bounce rounded-full bg-muted-foreground/50")}
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
