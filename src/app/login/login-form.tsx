"use client";

import { useState, type FormEvent } from "react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OAuthProvider } from "@/lib/validation";

const AUTH_ERROR_MESSAGE = "Could not complete sign in. Try another method.";

export function LoginForm({
  next,
  authError,
}: {
  next: string;
  authError: boolean;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    authError ? "error" : "idle",
  );
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(
    authError ? AUTH_ERROR_MESSAGE : null,
  );

  const busy = status === "sending" || oauthProvider !== null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setMessage(null);

    try {
      const response = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setStatus("error");
        setMessage(data?.error || "Could not send magic link.");
        return;
      }

      setStatus("sent");
      setMessage("Check your email for the magic link.");
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Try again in a moment.");
    }
  }

  async function onOAuth(provider: OAuthProvider) {
    setOauthProvider(provider);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, next }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        url?: string;
      } | null;

      if (!response.ok || !data?.url) {
        setStatus("error");
        setMessage(data?.error || "Could not start social sign in.");
        setOauthProvider(null);
        return;
      }

      window.location.assign(data.url);
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Try again in a moment.");
      setOauthProvider(null);
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
          Sign in with Google, X, or a magic link to manage your listing.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={() => onOAuth("google")}
        >
          <GoogleMark />
          {oauthProvider === "google" ? "Redirecting…" : "Continue with Google"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={() => onOAuth("x")}
        >
          <XMark />
          {oauthProvider === "x" ? "Redirecting…" : "Continue with X"}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="font-data text-[10px] tracking-[0.18em] text-muted-foreground">
          OR EMAIL
        </span>
        <div className="h-px flex-1 bg-border" />
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
        <Button type="submit" disabled={busy} className="w-full">
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

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1H12.18v2.96h5.32c-.23 1.22-1.4 3.57-5.32 3.57-3.2 0-5.82-2.65-5.82-5.91s2.62-5.91 5.82-5.91c1.82 0 3.04.78 3.74 1.45l2.54-2.45C16.77 3.55 14.7 2.7 12.18 2.7 7.3 2.7 3.4 6.64 3.4 11.72s3.9 9.02 8.78 9.02c5.07 0 8.42-3.56 8.42-8.57 0-.57-.06-1.01-.25-1.07z"
      />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.23 10.16 22.1 1h-1.87l-6.84 7.96L7.93 1H1.5l8.26 12.02L1.5 23h1.87l7.22-8.4L16.07 23h6.43zm-2.56 2.98-.84-1.2L4.04 2.43h2.87l5.4 7.72.83 1.2 7.05 10.08h-2.87z"
      />
    </svg>
  );
}
