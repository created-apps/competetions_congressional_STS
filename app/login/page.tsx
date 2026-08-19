import { redirect } from "next/navigation"
import { Sparkles } from "lucide-react"
import { getCurrentUser } from "@/lib/auth/session"
import { AuthForm } from "@/components/auth-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) {
    redirect("/")
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent"
      />

      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Sparkles className="size-6" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Competition Coach</h1>
        <p className="max-w-sm text-pretty text-muted-foreground">
          Sign in to chat with your AI coaches and keep all your past conversations in one place.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Welcome</CardTitle>
          <CardDescription>Sign in with your email, or create a free account.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm />
        </CardContent>
      </Card>
    </main>
  )
}
