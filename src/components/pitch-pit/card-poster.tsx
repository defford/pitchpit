"use client";

import { useMemo } from "react";

import { CompanyLink, CompanyMark } from "@/components/company-mark";
import type {
  BattleCompany,
  CardMatchup,
  CardSession,
} from "@/components/pitch-pit/types";
import { Button } from "@/components/ui/button";
import { TIERS, type Tier } from "@/config/tiers";
import { cn } from "@/lib/utils";

type PosterWeight = "pit" | "undercard" | "main";

function weightForTier(tier: Tier): PosterWeight {
  if (tier === "main_event") return "main";
  if (tier === "undercard") return "undercard";
  return "pit";
}

function PosterCompany({
  company,
  align,
  weight,
  picked,
}: {
  company: BattleCompany;
  align: "left" | "right";
  weight: PosterWeight;
  picked: boolean;
}) {
  const mark = (
    <CompanyMark
      name={company.name}
      logoUrl={company.logoUrl}
      websiteUrl={company.websiteUrl}
      size={weight === "main" ? "lg" : weight === "undercard" ? "md" : "sm"}
    />
  );
  const name = (
    <span
      className={cn(
        "min-w-0 truncate font-display tracking-[0.04em]",
        weight === "main" && "text-xl md:text-3xl lg:text-4xl",
        weight === "undercard" && "text-base md:text-lg",
        weight === "pit" && "text-sm md:text-base",
        picked && "text-signal",
      )}
    >
      {company.name}
    </span>
  );

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center bg-card",
        align === "left" ? "justify-start" : "justify-end",
        weight === "main" &&
          "border border-signal/70 px-4 py-3 md:px-5 md:py-4",
        weight === "undercard" &&
          "border border-silver/50 px-3 py-3 md:px-4 md:py-3.5",
        weight === "pit" && "border border-border px-3 py-2.5",
        picked && "border-signal",
      )}
    >
      <CompanyLink
        name={company.name}
        companyId={company.id}
        websiteUrl={company.websiteUrl}
        clickCount={company.clickCount}
        className={cn(
          "max-w-full items-center gap-2 pb-2.5",
          align === "right" && "text-right",
        )}
      >
        {align === "left" ? (
          <>
            {mark}
            {name}
          </>
        ) : (
          <>
            {name}
            {mark}
          </>
        )}
      </CompanyLink>
    </div>
  );
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
        "flex min-w-0 items-stretch",
        weight === "main"
          ? "gap-3 md:flex-1 md:gap-6"
          : weight === "undercard"
            ? "gap-2.5 md:flex-1"
            : "gap-2 md:flex-1",
      )}
    >
      <PosterCompany
        company={fight.companyA}
        align="left"
        weight={weight}
        picked={aPicked}
      />
      <div
        className={cn(
          "flex shrink-0 items-center text-signal",
          weight === "main" &&
            "font-display text-2xl tracking-[0.08em] md:text-4xl",
          weight === "undercard" &&
            "font-display text-lg tracking-[0.1em] md:text-xl",
          weight === "pit" && "font-data text-[10px] tracking-[0.16em]",
        )}
      >
        {showFloor ? `${fight.pointsA}–${fight.pointsB}` : "VS"}
      </div>
      <PosterCompany
        company={fight.companyB}
        align="right"
        weight={weight}
        picked={bPicked}
      />
    </li>
  );
}

function PosterSection({
  tier,
  fights,
  className,
}: {
  tier: Tier;
  fights: CardMatchup[];
  className?: string;
}) {
  if (fights.length === 0) return null;
  const weight = weightForTier(tier);
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col",
        weight !== "pit" && "max-md:pt-1",
        className,
      )}
    >
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
      <ul
        className={cn("flex flex-col gap-2", weight !== "main" && "md:flex-1")}
      >
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

  const ctaLabel = session.card.votesUsed === 0 ? "Start the card" : "Continue";

  return (
    <div className="space-y-5" data-testid="card-poster">
      <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:items-stretch md:gap-x-8 md:gap-y-6">
        <PosterSection
          tier="pit"
          fights={byTier.pit}
          className="md:col-start-1 md:row-start-1"
        />
        <PosterSection
          tier="undercard"
          fights={byTier.undercard}
          className="md:col-start-2 md:row-start-1"
        />
        <PosterSection
          tier="main_event"
          fights={byTier.main_event}
          className="md:col-span-2 md:row-start-2"
        />
      </div>

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
