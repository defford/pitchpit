"use client";

import { CompanyLink, CompanyMark } from "@/components/company-mark";
import { voteBudgetHeadline } from "@/components/pitch-pit/card-board";
import type { BattleCompany, CardMatchup } from "@/components/pitch-pit/types";
import { TierMark } from "@/components/terminal/tier-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function IntroFighter({
  company,
  align,
}: {
  company: BattleCompany;
  align: "left" | "right";
}) {
  return (
    <div
      data-testid="fight-intro-fighter"
      className={cn(
        "flex min-w-0 flex-col items-center gap-2 text-center md:gap-3",
        align === "left" ? "animate-name-slam" : "animate-name-slam-right",
      )}
    >
      <CompanyLink
        name={company.name}
        companyId={company.id}
        websiteUrl={company.websiteUrl}
        clickCount={company.clickCount}
        className="w-full flex-col items-center gap-2 pb-3 md:gap-3"
      >
        <CompanyMark
          name={company.name}
          logoUrl={company.logoUrl}
          websiteUrl={company.websiteUrl}
          size="2xl"
        />
        <h2 className="font-display max-w-full text-xl leading-[0.95] tracking-[0.04em] [overflow-wrap:anywhere] md:text-4xl">
          {company.name}
        </h2>
      </CompanyLink>
    </div>
  );
}

export function FightIntro({
  matchup,
  fightIndex,
  matchupCount,
  onContinue,
  exhibition = false,
}: {
  matchup: CardMatchup;
  fightIndex: number;
  matchupCount: number;
  onContinue: () => void;
  exhibition?: boolean;
}) {
  const budget = matchup.voteBudget;
  const split = budget > 1;

  return (
    <article
      data-testid="fight-intro"
      data-tier={matchup.tier}
      className="border border-border bg-card/80 px-3 py-4 animate-panel-in md:px-8 md:py-8"
    >
      <div className="mb-4 flex flex-col items-center gap-2 text-center md:mb-6">
        <p className="font-data text-[10px] tracking-[0.22em] text-silver">
          {exhibition ? "EXHIBITION" : `FIGHT ${fightIndex} OF ${matchupCount}`}
        </p>
        {exhibition ? null : (
          <TierMark
            tier={matchup.tier}
            size={matchup.tier === "pit" ? "sm" : "md"}
          />
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-6">
        <IntroFighter company={matchup.companyA} align="left" />
        <span className="font-display animate-vs-slam text-2xl leading-none text-signal md:text-5xl">
          VS
        </span>
        <IntroFighter company={matchup.companyB} align="right" />
      </div>

      <div className="mt-4 flex flex-col items-center gap-1 text-center animate-hard-reveal md:mt-6">
        <p className="font-data text-[10px] tracking-[0.2em] text-silver">
          YOU GET
        </p>
        <p className="font-display text-4xl leading-none tracking-[0.08em] text-signal md:text-6xl">
          {voteBudgetHeadline(budget)}
        </p>
        <p className="font-data text-[10px] tracking-[0.16em] text-muted-foreground">
          {split
            ? "FOR THIS FIGHT · SPLIT THEM HOWEVER YOU WANT"
            : "FOR THIS FIGHT"}
        </p>
      </div>

      <div className="mt-4 flex justify-center md:mt-6">
        <Button type="button" size="lg" onClick={onContinue}>
          Vote now
        </Button>
      </div>
    </article>
  );
}
