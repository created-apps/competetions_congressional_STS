import Link from "next/link"
import { Compass } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Compass className="size-7" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold">We couldn&apos;t find that page</h1>
        <p className="max-w-sm text-pretty text-muted-foreground">
          This conversation may have been removed, or the link is incorrect. Let&apos;s get you back to your coaches.
        </p>
      </div>
      <Button size="lg" render={<Link href="/">Back to coaches</Link>} />
    </main>
  )
}
