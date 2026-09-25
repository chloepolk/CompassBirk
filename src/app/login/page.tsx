"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/prosera/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/prosera/card"
import { Input } from "@/components/ui/prosera/input"

const COMPASS_ROUTE = "/"

export default function LoginPage() {
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const password = String(formData.get("password") ?? "")
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    if (res.ok) router.push(COMPASS_ROUTE)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-6 py-12">
      <div className="w-full max-w-[420px]">
        <Card className="rounded-2xl border-border/60 shadow-xl">
          <CardHeader className="items-center space-y-4 pb-2 text-center">
            <div className="rounded-lg bg-white px-4 py-3">
              <img
                src="/compass/birkenstock-logo.png"
                alt="Birkenstock"
                width={220}
                height={36}
                className="h-9 w-auto"
              />
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              Logistics-services sourcing and vendor performance
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue="d.hoffmann@compass.example"
                  autoComplete="email"
                  autoFocus
                  className="h-11 rounded-[10px] bg-card"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  defaultValue="compass"
                  autoComplete="current-password"
                  className="h-11 rounded-[10px] bg-card"
                />
              </div>

              <Button type="submit" className="h-11 w-full rounded-[10px] text-sm font-semibold">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
