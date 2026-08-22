"use client";

import { useEffect, useState } from "react";

import {
  Arena,
  mapCardSession,
  type CardSession,
} from "@/components/decagon/arena";
import { StormField } from "@/components/decagon/storm-field";
import { MarketTicker } from "@/components/terminal/ticker";
import { Button } from "@/components/ui/button";

const FALLBACK_TICKER = [
  { id: "live", text: "LIVE · THE DECAGON" },
  { id: "enter", text: "ENTER THE DECAGON" },
  { id: "rank", text: "RANKINGS MOVE ON EVERY VOTE" },
];

export default function DecagonPage() {
  const [initialSession, setInitialSession] = useState<CardSession | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/battles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) return;
        const mapped = mapCardSession(await res.json());
        if (!cancelled) setInitialSession(mapped);
      } catch {
        // Arena shows start CTA when no battle
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden">
      <StormField className="absolute inset-0 z-0" />
      {!entered ? (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
          <p className="font-data text-[10px] tracking-[0.28em] text-silver">
            HOURLY CARD / 6 MATCHUPS
          </p>
          <h1 className="font-display mt-5 max-w-4xl text-4xl leading-[0.92] tracking-[0.04em] text-foreground sm:text-6xl">
            Welcome to
            <span className="mt-2 block text-5xl tracking-[0.06em] text-signal sm:text-7xl md:text-8xl">
              THE DECAGON
            </span>
          </h1>
          <Button
            type="button"
            size="lg"
            className="mt-10"
            onClick={() => setEntered(true)}
          >
            Enter the Decagon
          </Button>
        </div>
      ) : (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <MarketTicker items={FALLBACK_TICKER} />
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-start px-4 py-4 sm:px-6">
            {ready ? (
              <Arena initialSession={initialSession} />
            ) : (
              <div className="flex flex-1 items-center justify-center border border-border bg-card/80 py-16 font-data text-xs tracking-[0.16em] text-muted-foreground">
                OPENING THE FLOOR…
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
