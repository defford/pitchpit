"use client";

import { useEffect, useState } from "react";

import {
  Arena,
  mapCardSession,
  type CardSession,
} from "@/components/pitch-pit/arena";
import { StormField } from "@/components/pitch-pit/storm-field";
import { MarketTicker } from "@/components/terminal/ticker";

const FALLBACK_TICKER = [
  { id: "live", text: "LIVE · THE PITCH PIT" },
  { id: "card", text: "EXHIBITIONS NOW · FULL CARD AT 6-4-2" },
  { id: "rank", text: "ELO LOCKS WHEN THE HOUR CLOSES" },
];

export default function PitchPitPage() {
  const [initialSession, setInitialSession] = useState<CardSession | null>(
    null,
  );
  const [ready, setReady] = useState(false);

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
        // Arena loads itself when the first fetch misses.
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
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <MarketTicker items={FALLBACK_TICKER} />
        <div className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col justify-start overflow-y-auto px-4 py-4 sm:px-6">
          {ready ? (
            <Arena initialSession={initialSession} />
          ) : (
            <div className="flex flex-1 items-center justify-center border border-border bg-card/80 py-16 font-data text-xs tracking-[0.16em] text-muted-foreground">
              OPENING THE CARD…
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
