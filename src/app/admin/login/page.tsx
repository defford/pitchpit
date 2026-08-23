"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setMessage(null);

    try {
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next") || "/admin"
          : "/admin";

      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        next?: string;
      } | null;

      if (!response.ok) {
        setStatus("error");
        setMessage(data?.error || "Could not sign in.");
        return;
      }

      router.push(data?.next || "/admin");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Try again in a moment.");
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 px-4 py-16">
      <div>
        <BrandLogo size="login" className="mb-4" />
        <h1 className="font-display mt-2 text-4xl tracking-[0.06em]">
          Admin login
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Email and password. Listings on the public site do not use this login.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={status === "sending"}
          className="w-full"
        >
          {status === "sending" ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </main>
  );
}
