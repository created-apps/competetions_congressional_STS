"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function SignOutButton({
  variant = "ghost",
  className,
  label = "Sign out",
}: {
  variant?: "ghost" | "outline"
  className?: string
  label?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function signOut() {
    if (loading) return
    setLoading(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.replace("/login")
      router.refresh()
    } catch {
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} size="sm" onClick={signOut} disabled={loading} className={className}>
      {loading ? <Spinner data-icon="inline-start" /> : <LogOut data-icon="inline-start" />}
      {label}
    </Button>
  )
}
