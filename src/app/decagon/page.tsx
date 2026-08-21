"use client";

import { useEffect, useState } from "react";

import {
  Arena,
  mapBattleResponse,
  type BattlePayload,
} from "@/components/decagon/arena";
import { StormField } from "@/components/decagon/storm-field";
import { MarketTicker } from "@/components/terminal/ticker";

const FALLBACK_TICKER = [
  { id: "live", text: "LIVE · THE DECAGON" },
  { id: "enter", text: "ENTER THE DECAGON" },
  { id: "rank", text: "RANKINGS MOVE ON EVERY VOTE" },
];

export default function DecagonPage() {
  const [initialBattle, setInitialBattle] = useState<BattlePayload | null>(
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
        const mapped = mapBattleResponse(await res.json());
        if (!cancelled) setInitialBattle(mapped);
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
    <main className="relative isolate flex-1 overflow-hidden">
      <StormField className="absolute inset-0 z-0" />
      <div className="relative z-10">
        <MarketTicker items={FALLBACK_TICKER} />
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          <header className="mb-8 border-b border-border pb-5">
            <p className="font-data text-[10px] tracking-[0.2em] text-muted-foreground">
              OPEN FLOOR / LIVE PAIRING
            </p>
            <h1 className="font-display mt-1 text-5xl leading-none tracking-[0.04em] text-foreground sm:text-6xl">
              THE DECAGON
            </h1>
            <p className="mt-2 max-w-lg text-sm text-silver">
              Cast a vote. Rating moves. The session closes on the clock.
            </p>
          </header>
          {ready ? (
            <Arena initialBattle={initialBattle} />
          ) : (
            <div className="flex justify-center border border-border bg-card/80 py-16 font-data text-xs tracking-[0.16em] text-muted-foreground">
              OPENING THE FLOOR…
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
