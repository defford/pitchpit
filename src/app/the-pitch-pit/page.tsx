"use client";

import { useEffect, useState } from "react";

import {
  Arena,
  mapBattleResponse,
  type BattlePayload,
} from "@/components/pitch-pit/arena";
import { StormField } from "@/components/pitch-pit/storm-field";
import { MarketTicker } from "@/components/terminal/ticker";
import { Button } from "@/components/ui/button";

const FALLBACK_TICKER = [
  { id: "live", text: "LIVE · THE PITCH PIT" },
  { id: "enter", text: "ENTER THE PITCH PIT" },
  { id: "rank", text: "RANKINGS MOVE ON EVERY VOTE" },
];

export default function PitchPitPage() {
  const [initialBattle, setInitialBattle] = useState<BattlePayload | null>(
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
    <main className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden">
      <StormField className="absolute inset-0 z-0" />
      {!entered ? (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
          <p className="font-data text-[10px] tracking-[0.28em] text-silver">
            OPEN FLOOR / LIVE PAIRING
          </p>
          <h1 className="font-display mt-5 max-w-4xl text-4xl leading-[0.92] tracking-[0.04em] text-foreground sm:text-6xl">
            Welcome to
            <span className="mt-2 block text-5xl tracking-[0.06em] text-signal sm:text-7xl md:text-8xl">
              THE PITCH PIT
            </span>
          </h1>
          <Button
            type="button"
            size="lg"
            className="mt-10"
            onClick={() => setEntered(true)}
          >
            Enter The Pitch Pit
          </Button>
        </div>
      ) : (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <MarketTicker items={FALLBACK_TICKER} />
          <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col justify-start overflow-y-auto px-4 py-4 sm:px-6">
            {ready ? (
              <Arena initialBattle={initialBattle} />
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
