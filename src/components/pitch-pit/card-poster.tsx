"use client";

import { useMemo } from "react";

import type { CardMatchup, CardSession } from "@/components/pitch-pit/types";
import { Button } from "@/components/ui/button";
import { TIERS, type Tier } from "@/config/tiers";
import { cn } from "@/lib/utils";

const SECTION_ORDER: Tier[] = ["pit", "undercard", "main_event"];

type PosterWeight = "pit" | "undercard" | "main";

function weightForTier(tier: Tier): PosterWeight {
  if (tier === "main_event") return "main";
  if (tier === "undercard") return "undercard";
  return "pit";
}

function PosterRow({
  fight,
  weight,
}: {
  fight: CardMatchup;
  weight: PosterWeight;
}) {
  const aPicked = fight.hasVoted && fight.myWinnerId === fight.companyA.id;
  const bPicked = fight.hasVoted && fight.myWinnerId === fight.companyB.id;
  const showFloor = fight.hasVoted || fight.pointsA + fight.pointsB > 0;

  return (
    <li
      data-testid="card-poster-row"
      data-weight={weight}
      className={cn(
        "bg-card",
        weight === "main" &&
          "border border-signal/70 px-4 py-4 md:px-5 md:py-5",
        weight === "undercard" &&
          "border border-silver/50 px-3.5 py-3.5 md:px-4 md:py-4",
        weight === "pit" && "border border-border px-3 py-3",
      )}
    >
      <div
        className={cn(
          "grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center",
          weight === "main" ? "gap-3" : weight === "undercard" ? "gap-2.5" : "gap-2",
        )}
      >
        <p
          className={cn(
            "truncate font-display tracking-[0.04em]",
            weight === "main" && "text-xl md:text-2xl lg:text-3xl",
            weight === "undercard" && "text-base md:text-lg",
            weight === "pit" && "text-sm",
            aPicked && "text-signal",
          )}
        >
          {fight.companyA.name}
        </p>
        <p
          className={cn(
            "text-center text-signal",
            weight === "main" &&
              "font-display text-2xl tracking-[0.08em] md:text-3xl",
            weight === "undercard" &&
              "font-display text-lg tracking-[0.1em] md:text-xl",
            weight === "pit" && "font-data text-[10px] tracking-[0.16em]",
          )}
        >
          {showFloor ? `${fight.pointsA}–${fight.pointsB}` : "VS"}
        </p>
        <p
          className={cn(
            "truncate text-right font-display tracking-[0.04em]",
            weight === "main" && "text-xl md:text-2xl lg:text-3xl",
            weight === "undercard" && "text-base md:text-lg",
            weight === "pit" && "text-sm",
            bPicked && "text-signal",
          )}
        >
          {fight.companyB.name}
        </p>
      </div>
    </li>
  );
}

function PosterSection({
  tier,
  fights,
}: {
  tier: Tier;
  fights: CardMatchup[];
}) {
  if (fights.length === 0) return null;
  const weight = weightForTier(tier);
  return (
    <section className={cn(weight !== "pit" && "pt-1")}>
      <h2
        className={cn(
          "font-display mb-2 tracking-[0.12em] text-signal",
          weight === "main" && "text-2xl md:text-3xl",
          weight === "undercard" && "text-xl md:text-2xl",
          weight === "pit" && "text-lg md:text-xl",
        )}
      >
        {TIERS[tier].label}
      </h2>
      <ul className="space-y-2">
        {fights.map((fight) => (
          <PosterRow key={fight.id} fight={fight} weight={weight} />
        ))}
      </ul>
    </section>
  );
}

export function CardPoster({
  session,
  onStart,
}: {
  session: CardSession;
  onStart: () => void;
}) {
  const byTier = useMemo(() => {
    const sorted = [...session.matchups].sort((a, b) => a.slot - b.slot);
    return {
      pit: sorted.filter((row) => row.tier === "pit"),
      undercard: sorted.filter((row) => row.tier === "undercard"),
      main_event: sorted.filter((row) => row.tier === "main_event"),
    };
  }, [session.matchups]);

  const ctaLabel =
    session.card.votesUsed === 0 ? "Start the card" : "Continue";

  return (
    <div className="space-y-5" data-testid="card-poster">
      {SECTION_ORDER.map((tier) => (
        <PosterSection key={tier} tier={tier} fights={byTier[tier]} />
      ))}

      {!session.sessionComplete ? (
        <div className="flex justify-center pt-1">
          <Button type="button" size="lg" onClick={onStart}>
            {ctaLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
