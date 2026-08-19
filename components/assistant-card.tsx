"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Code2, FlaskConical, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { Assistant } from "@/lib/types"

const THEMES: Record<string, { icon: typeof FlaskConical; className: string; tag: string }> = {
  "regeneron-sts": {
    icon: FlaskConical,
    className: "bg-science/12 text-science ring-1 ring-science/25",
    tag: "Science research",
  },
  "congressional-app-challenge": {
    icon: Code2,
    className: "bg-code/15 text-code ring-1 ring-code/30",
    tag: "App building",
  },
}

export function AssistantCard({ assistant }: { assistant: Assistant }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const theme = THEMES[assistant.slug] ?? {
    icon: Sparkles,
    className: "bg-primary/12 text-primary ring-1 ring-primary/25",
    tag: "Coach",
  }
  const Icon = theme.icon

  async function startChat() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantId: assistant.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Could not start a chat.")
      router.push(`/chat/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Card className="group relative flex flex-col overflow-hidden border-border/70 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader>
        <div className="flex items-center gap-4">
          <span className={cn("flex size-12 items-center justify-center rounded-2xl", theme.className)}>
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{theme.tag}</span>
            <CardTitle className="font-heading text-xl leading-tight text-balance">{assistant.name}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <CardDescription className="text-pretty text-[0.95rem] leading-relaxed">
          {assistant.description}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2">
        <Button onClick={startChat} disabled={loading} size="lg" className="w-full">
          {loading ? (
            <>
              <Spinner data-icon="inline-start" />
              Starting…
            </>
          ) : (
            <>
              Start chatting
              <ArrowRight data-icon="inline-end" className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
        {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
      </CardFooter>
    </Card>
  )
}
