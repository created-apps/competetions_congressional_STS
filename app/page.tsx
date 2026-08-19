import { redirect } from "next/navigation"
import { Code2, FlaskConical, Info, Sparkles } from "lucide-react"
import { getActiveAssistants } from "@/lib/assistants"
import { getCurrentUser } from "@/lib/auth/session"
import { AssistantCard } from "@/components/assistant-card"
import { SignOutButton } from "@/components/sign-out-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

const PREVIEW = [
  {
    slug: "regeneron-sts",
    name: "Regeneron Science Talent Search Coach",
    description:
      "Your mentor for the nation's oldest science research competition — from picking a research question to polishing your entry essays.",
    icon: FlaskConical,
    tag: "Science research",
    className: "bg-science/12 text-science ring-1 ring-science/25",
  },
  {
    slug: "congressional-app-challenge",
    name: "Congressional App Challenge Coach",
    description:
      "Your guide to designing, building, and pitching an app for your district — no matter your coding experience.",
    icon: Code2,
    tag: "App building",
    className: "bg-code/15 text-code ring-1 ring-code/30",
  },
]

export default async function HomePage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  const assistants = await getActiveAssistants()
  const configured = assistants.length > 0

  return (
    <main className="relative min-h-svh overflow-hidden">
      {/* Soft brand wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent"
      />

      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pt-5 sm:px-6">
        <span className="truncate text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user.email}</span>
        </span>
        <SignOutButton />
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
        <header className="flex flex-col items-center gap-5 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            Your AI competition mentors
          </span>
          <h1 className="max-w-2xl font-heading text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">
            Turn a big idea into a winning entry
          </h1>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Pick a coach and start chatting. Ask anything — brainstorming, feedback, deadlines, or where to begin. Your
            coach is patient, encouraging, and always up to date.
          </p>
        </header>

        <section className="mt-14" aria-labelledby="coaches-heading">
          <h2 id="coaches-heading" className="sr-only">
            Choose a coach
          </h2>

          {!configured ? (
            <Alert className="mb-8">
              <Info />
              <AlertTitle>Almost ready to chat</AlertTitle>
              <AlertDescription>
                Connect your Supabase database and add the OpenAI and Tavily keys in your project settings, then your
                coaches will appear here and be ready to talk. Here&apos;s a preview of who you&apos;ll meet.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2">
            {configured
              ? assistants.map((assistant) => <AssistantCard key={assistant.id} assistant={assistant} />)
              : PREVIEW.map((coach) => {
                  const Icon = coach.icon
                  return (
                    <Card key={coach.slug} className="flex flex-col opacity-90">
                      <CardHeader>
                        <div className="flex items-center gap-4">
                          <span className={`flex size-12 items-center justify-center rounded-2xl ${coach.className}`}>
                            <Icon className="size-6" aria-hidden="true" />
                          </span>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {coach.tag}
                            </span>
                            <CardTitle className="font-heading text-xl leading-tight text-balance">
                              {coach.name}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-pretty text-[0.95rem] leading-relaxed text-muted-foreground">
                          {coach.description}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
          </div>
        </section>
      </div>
    </main>
  )
}
