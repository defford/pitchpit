"use client";

import { useEffect } from "react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataLabel, DataStat } from "@/components/terminal/data-label";
import { RatingDelta } from "@/components/terminal/rank-movement";
import { TierMark } from "@/components/terminal/tier-mark";
import type {
  BattleCompany,
  BattlePayload,
  VoteOutcome,
} from "@/components/pitch-pit/types";
import type { Tier } from "@/config/tiers";
import {
  formatBattleId,
  formatRating,
  formatToday,
  initials,
  padRank,
} from "@/lib/format";
import { cn } from "@/lib/utils";

function Statline({
  company,
  align = "left",
  hideRank = false,
}: {
  company: BattleCompany;
  align?: "left" | "right";
  hideRank?: boolean;
}) {
  const today = formatToday(company.wins, company.losses);
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        align === "right" && "justify-end",
      )}
    >
      {!hideRank && company.rank != null ? (
        <DataLabel label="RANK" value={padRank(company.rank)} />
      ) : null}
      <DataLabel label="RATING" value={formatRating(company.elo)} />
      {today ? <DataStat>TODAY {today}</DataStat> : null}
    </div>
  );
}

function FighterMark({
  company,
  size,
}: {
  company: BattleCompany;
  size: "sm" | "md" | "lg";
}) {
  return (
    <Avatar
      className={cn(
        "rounded-sm after:rounded-sm",
        size === "sm" && "size-10",
        size === "md" && "size-14",
        size === "lg" && "size-16 sm:size-20",
      )}
    >
      {company.logoUrl ? <AvatarImage src={company.logoUrl} alt="" /> : null}
      <AvatarFallback className="rounded-sm bg-muted font-data text-xs text-silver">
        {initials(company.name)}
      </AvatarFallback>
    </Avatar>
  );
}

function CompanyModule({
  company,
  disabled,
  onVote,
  align,
  size,
  selected,
  locked,
}: {
  company: BattleCompany;
  disabled: boolean;
  onVote: () => void;
  align: "left" | "right";
  size: "pit" | "undercard" | "main";
  selected?: boolean;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || locked}
      onClick={onVote}
      aria-label={
        locked
          ? selected
            ? `You voted for ${company.name}`
            : `${company.name}`
          : `Cast vote for ${company.name}`
      }
      aria-pressed={selected || undefined}
      className={cn(
        "group flex h-full w-full min-w-0 flex-col text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60",
        align === "right" && "text-right",
        size === "pit" &&
          "gap-3 border border-border bg-card p-4 hover:border-signal",
        size === "undercard" &&
          "gap-4 border border-silver/50 bg-card p-5 hover:border-silver",
        size === "main" &&
          "gap-5 border border-signal/70 bg-card p-6 hover:border-signal",
        size === "main" && (align === "right" ? "rank-rail-1-end" : "rank-rail-1"),
        selected && "border-signal ring-1 ring-signal",
      )}
    >
      {size === "main" && company.rank != null ? (
        <p className="font-display text-5xl leading-none text-signal sm:text-6xl">
          {padRank(company.rank)}
        </p>
      ) : company.rank != null ? (
        <DataLabel label="RANK" value={padRank(company.rank)} />
      ) : (
        <DataLabel label="TIER" value={company.tier.replace("_", " ")} />
      )}
      <div
        className={cn(
          "flex items-center gap-3",
          align === "right" && "flex-row-reverse",
        )}
      >
        <FighterMark
          company={company}
          size={size === "main" ? "lg" : size === "undercard" ? "md" : "sm"}
        />
        <h3
          className={cn(
            "font-display min-w-0 flex-1 truncate leading-none tracking-[0.04em]",
            size === "pit" && "text-2xl",
            size === "undercard" && "text-3xl sm:text-4xl",
            size === "main" && "text-4xl sm:text-6xl",
          )}
        >
          {company.name}
        </h3>
      </div>
      <p
        className={cn(
          "leading-relaxed text-muted-foreground italic",
          size === "main" ? "text-base sm:text-lg" : "text-sm",
          align === "right" && "text-right",
        )}
      >
        “{company.pitch}”
      </p>
      <Statline company={company} align={align} hideRank={size === "main"} />
      <span
        className={cn(
          "font-display mt-1 inline-flex items-center justify-center tracking-[0.16em]",
          size === "pit" &&
            "h-10 border border-border text-sm group-hover:border-signal group-hover:bg-signal group-hover:text-signal-foreground",
          size === "undercard" &&
            "h-11 border border-silver/60 text-sm group-hover:border-silver group-hover:bg-silver group-hover:text-background",
          size === "main" &&
            "h-12 bg-signal text-base text-signal-foreground group-hover:bg-signal/90",
        )}
      >
        {locked
          ? selected
            ? "YOUR PICK"
            : "—"
          : size === "main"
            ? "FINAL VOTE"
            : "CAST VOTE"}
      </span>
    </button>
  );
}

function moduleSize(tier: Tier): "pit" | "undercard" | "main" {
  if (tier === "main_event") return "main";
  if (tier === "undercard") return "undercard";
  return "pit";
}

type FightStageProps = {
  battle: BattlePayload;
  busy: boolean;
  error: string | null;
  onVote: (winnerId: string) => void;
  onSkip: () => void;
};

function SeriesScoreboard({
  votesA,
  votesB,
  votesToWin,
  size,
}: {
  votesA: number;
  votesB: number;
  votesToWin: number;
  size: "pit" | "undercard" | "main";
}) {
  const totalPips = votesToWin;
  return (
    <div className="flex flex-col items-center gap-2 py-1">
      <p
        className={cn(
          "font-display leading-none tracking-[0.08em] text-signal",
          size === "pit" && "text-3xl",
          size === "undercard" && "text-4xl sm:text-5xl",
          size === "main" && "text-5xl sm:text-6xl",
        )}
      >
        {votesA}
        <span className="mx-2 text-muted-foreground">–</span>
        {votesB}
      </p>
      <p className="font-data text-[10px] tracking-[0.2em] text-silver">
        FIRST TO {votesToWin}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: totalPips }).map((_, i) => (
            <span
              key={`a-${i}`}
              className={cn(
                "size-1.5 rounded-full",
                i < votesA ? "bg-signal" : "bg-border",
              )}
            />
          ))}
        </div>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: totalPips }).map((_, i) => (
            <span
              key={`b-${i}`}
              className={cn(
                "size-1.5 rounded-full",
                i < votesB ? "bg-signal" : "bg-border",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FightStage({
  battle,
  busy,
  error,
  onVote,
  onSkip,
}: FightStageProps) {
  const size = moduleSize(battle.tier);
  const locked = battle.hasVoted;

  const seriesLabel =
    battle.tier === "main_event"
      ? "BEST OF 7 · LIVE"
      : battle.tier === "undercard"
        ? "BEST OF 3 · LIVE"
        : "LIVE";

  return (
    <div className="animate-battle-fade space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
        <TierMark
          tier={battle.tier}
          size={battle.tier === "pit" ? "md" : "lg"}
        />
        <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground">
          {seriesLabel} · BATTLE {formatBattleId(battle.id)}
        </span>
      </div>

      <div className="grid items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="animate-name-slam min-w-0">
          <CompanyModule
            company={battle.companyA}
            disabled={busy}
            locked={locked}
            selected={battle.myWinnerId === battle.companyA.id}
            onVote={() => onVote(battle.companyA.id)}
            align="left"
            size={size}
          />
        </div>
        <div className="flex flex-col items-center justify-center gap-3 justify-self-center py-2 text-center">
          <span
            className={cn(
              "font-display animate-vs-slam whitespace-nowrap leading-none text-signal",
              size === "pit" && "text-3xl",
              size === "undercard" && "text-5xl sm:text-6xl",
              size === "main" && "text-7xl sm:text-8xl",
            )}
          >
            VS
          </span>
          <SeriesScoreboard
            votesA={battle.votesA}
            votesB={battle.votesB}
            votesToWin={battle.votesToWin}
            size={size}
          />
        </div>
        <div className="animate-name-slam-right min-w-0">
          <CompanyModule
            company={battle.companyB}
            disabled={busy}
            locked={locked}
            selected={battle.myWinnerId === battle.companyB.id}
            onVote={() => onVote(battle.companyB.id)}
            align="right"
            size={size}
          />
        </div>
      </div>

      <p
        className={cn(
          "font-display text-center tracking-[0.18em]",
          size === "main" && "text-2xl text-signal sm:text-3xl",
          size === "undercard" && "text-xl text-silver",
          size === "pit" && "text-xl text-silver",
        )}
      >
        {locked
          ? "PICK LOCKED · WATCH THE TALLY"
          : size === "main"
            ? "WHO TAKES IT?"
            : "WHO WINS?"}
      </p>

      {error ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-center">
        {locked ? (
          <Button type="button" size="lg" disabled={busy} onClick={onSkip}>
            {busy ? "LOADING…" : "Next Fight"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onSkip}
            className="text-[10px] tracking-[0.16em] text-muted-foreground"
          >
            Skip battle
          </Button>
        )}
      </div>
    </div>
  );
}

export function UndercardIntro({
  battle,
  onDone,
}: {
  battle: BattlePayload;
  onDone: () => void;
}) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      onDone();
      return;
    }
    const id = window.setTimeout(onDone, 1300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="animate-battle-fade flex min-h-[24rem] flex-col items-center justify-center px-4 py-10 text-center">
      <p className="font-data text-[10px] tracking-[0.22em] text-silver">
        THE PITCH PIT
      </p>
      <h2 className="font-display mt-2 text-5xl leading-none tracking-[0.08em] text-silver sm:text-6xl">
        UNDERCARD
      </h2>
      <div className="mt-8 grid w-full max-w-3xl items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <div className="animate-name-slam">
          <div className="flex justify-center">
            <FighterMark company={battle.companyA} size="md" />
          </div>
          <p className="font-display mt-3 text-3xl leading-none sm:text-4xl">
            {battle.companyA.name}
          </p>
          <div className="mt-2 flex justify-center">
            <Statline company={battle.companyA} />
          </div>
        </div>
        <p className="font-display animate-vs-slam text-4xl text-silver sm:text-5xl">
          VS
        </p>
        <div className="animate-name-slam-right">
          <div className="flex justify-center">
            <FighterMark company={battle.companyB} size="md" />
          </div>
          <p className="font-display mt-3 text-3xl leading-none sm:text-4xl">
            {battle.companyB.name}
          </p>
          <div className="mt-2 flex justify-center">
            <Statline company={battle.companyB} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MainEventIntro({
  battle,
  onDone,
}: {
  battle: BattlePayload;
  onDone: () => void;
}) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      onDone();
      return;
    }
    const id = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[32rem] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="animate-hard-reveal">
        <BrandLogo size="slam" className="mx-auto" />
      </div>
      <h2 className="font-display animate-main-wipe mt-4 text-6xl leading-none tracking-[0.06em] text-signal sm:text-8xl md:text-9xl">
        MAIN EVENT
      </h2>
      <p
        className="font-data animate-hard-reveal mt-2 text-[10px] tracking-[0.24em] text-silver"
        style={{ animationDelay: "180ms" }}
      >
        BATTLE {formatBattleId(battle.id)}
      </p>
      <div className="mt-12 grid w-full max-w-4xl items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
        <div className="animate-name-slam">
          {battle.companyA.rank != null ? (
            <p className="font-display text-3xl leading-none text-signal sm:text-4xl">
              #{padRank(battle.companyA.rank)}
            </p>
          ) : null}
          <p className="font-display mt-1 text-4xl leading-none sm:text-6xl">
            {battle.companyA.name}
          </p>
          <p className="mt-3 text-sm text-muted-foreground italic">
            “{battle.companyA.pitch}”
          </p>
          <div className="mt-3 flex justify-center">
            <Statline company={battle.companyA} />
          </div>
        </div>
        <p className="font-display animate-vs-slam text-6xl text-signal sm:text-8xl">
          VS
        </p>
        <div className="animate-name-slam-right">
          {battle.companyB.rank != null ? (
            <p className="font-display text-3xl leading-none text-signal sm:text-4xl">
              #{padRank(battle.companyB.rank)}
            </p>
          ) : null}
          <p className="font-display mt-1 text-4xl leading-none sm:text-6xl">
            {battle.companyB.name}
          </p>
          <p className="mt-3 text-sm text-muted-foreground italic">
            “{battle.companyB.pitch}”
          </p>
          <div className="mt-3 flex justify-center">
            <Statline company={battle.companyB} />
          </div>
        </div>
      </div>
      <p
        className="font-display animate-hard-reveal mt-12 text-xl tracking-[0.22em] text-signal sm:text-2xl"
        style={{ animationDelay: "280ms" }}
      >
        FINAL VOTE
      </p>
    </div>
  );
}

function ResultFighter({
  company,
  role,
  eloBefore,
  eloAfter,
  align,
  featured,
}: {
  company: BattleCompany;
  role: "winner" | "loser";
  eloBefore: number;
  eloAfter: number;
  align: "left" | "right";
  featured: boolean;
}) {
  const won = role === "winner";
  return (
    <article
      className={cn(
        "border px-4 py-6 sm:px-6",
        won && "animate-winner-rise border-signal bg-signal/10",
        !won && "animate-loser-sink border-border bg-card grayscale",
        featured && won && "sm:py-8",
        align === "right" && "text-right",
      )}
    >
      <p
        className={cn(
          "font-data text-[10px] tracking-[0.18em]",
          won ? "text-signal" : "text-down",
        )}
      >
        {won ? "VICTORY" : "DEFEAT"}
      </p>
      <div
        className={cn(
          "mt-3 flex items-center gap-3",
          align === "right" && "flex-row-reverse",
        )}
      >
        <FighterMark company={company} size={featured ? "lg" : "md"} />
        <p
          className={cn(
            "font-display min-w-0 flex-1 leading-none",
            featured && won ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl",
          )}
        >
          {company.name}
        </p>
      </div>
      <div
        className={cn(
          "mt-4 flex flex-col gap-1",
          align === "right" && "items-end",
        )}
      >
        <DataLabel
          label="RATING"
          value={`${formatRating(eloBefore)} → ${formatRating(eloAfter)}`}
        />
        <RatingDelta delta={eloAfter - eloBefore} />
      </div>
    </article>
  );
}

export function ResultBoard({
  outcome,
  battleId,
  tier,
  busy,
  onNext,
}: {
  outcome: VoteOutcome;
  battleId: string;
  tier: Tier;
  busy: boolean;
  onNext: () => void;
}) {
  const beatChampion = outcome.loser.rank === 1 && outcome.winner.rank !== 1;
  const upset = outcome.winnerEloBefore < outcome.loserEloBefore;
  const headline = beatChampion
    ? "NEW #1"
    : upset
      ? "UPSET"
      : `${outcome.winner.name.toUpperCase()} WINS`;
  const featured = tier === "main_event";

  return (
    <div className="animate-result-cut space-y-6">
      <div className="text-center">
        <p className="font-data text-[10px] tracking-[0.2em] text-muted-foreground">
          {tier === "main_event"
            ? "MAIN EVENT RESULT"
            : tier === "undercard"
              ? "UNDERCARD RESULT"
              : `BATTLE ${formatBattleId(battleId)}`}
        </p>
        <h2
          className={cn(
            "font-display mt-2 leading-none tracking-[0.04em] text-signal",
            featured ? "text-6xl sm:text-8xl" : "text-5xl sm:text-7xl",
          )}
        >
          {headline}
        </h2>
        {beatChampion ? (
          <p className="font-data mt-3 text-xs tracking-[0.14em] text-silver">
            #{padRank(outcome.winner.rank ?? 0)} DEFEATS #
            {padRank(outcome.loser.rank ?? 1)}
          </p>
        ) : null}
      </div>

      <div className="grid items-stretch gap-3 md:grid-cols-2">
        <ResultFighter
          company={outcome.winner}
          role="winner"
          eloBefore={outcome.winnerEloBefore}
          eloAfter={outcome.winnerEloAfter}
          align="left"
          featured={featured}
        />
        <ResultFighter
          company={outcome.loser}
          role="loser"
          eloBefore={outcome.loserEloBefore}
          eloAfter={outcome.loserEloAfter}
          align="right"
          featured={featured}
        />
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          size="lg"
          disabled={busy}
          onClick={onNext}
          className={featured ? "h-12 px-8" : undefined}
        >
          {busy ? "LOADING…" : "Next Fight"}
        </Button>
      </div>
    </div>
  );
}

export function needsIntro(tier: Tier): boolean {
  return tier === "main_event" || tier === "undercard";
}

export function BattleIntro({
  battle,
  onDone,
}: {
  battle: BattlePayload;
  onDone: () => void;
}) {
  if (battle.tier === "main_event") {
    return <MainEventIntro key={battle.id} battle={battle} onDone={onDone} />;
  }
  return <UndercardIntro key={battle.id} battle={battle} onDone={onDone} />;
}
