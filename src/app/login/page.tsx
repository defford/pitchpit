"use client";

import { useState, type FormEvent } from "react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setMessage(null);

    try {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        setStatus("error");
        setMessage(
          "Auth is not configured. Set Supabase env vars (or run with a linked project). Demo mode still supports Decagon voting on the homepage.",
        );
        return;
      }

      const supabase = createClient();
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next") ||
            "/dashboard"
          : "/dashboard";
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("sent");
      setMessage("Check your email for the magic link.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Login failed");
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-6 px-4 py-16">
      <div>
        <BrandLogo size="login" className="mb-4" />
        <h1 className="font-display mt-2 text-4xl tracking-[0.06em]">
          Owner login
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with a magic link to manage your listing.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <Button
          type="submit"
          disabled={status === "sending"}
          className="w-full"
        >
          {status === "sending" ? "Sending…" : "Send magic link"}
        </Button>
      </form>

      {message ? (
        <p
          className={
            status === "error"
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {message}
        </p>
      ) : null}
    </main>
  );
}
