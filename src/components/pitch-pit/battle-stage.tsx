"use client";

import { useEffect, type ReactNode } from "react";

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
        "flex flex-col gap-0.5 md:flex-row md:flex-wrap md:items-center md:gap-3",
        align === "right" ? "items-end md:justify-end" : "items-start",
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
        size === "sm" && "size-8 md:size-10",
        size === "md" && "size-10 md:size-14",
        size === "lg" && "size-12 md:size-16 lg:size-20",
      )}
    >
      {company.logoUrl ? <AvatarImage src={company.logoUrl} alt="" /> : null}
      <AvatarFallback className="rounded-sm bg-muted font-data text-[10px] text-silver md:text-xs">
        {initials(company.name)}
      </AvatarFallback>
    </Avatar>
  );
}

function MatchupLane({
  left,
  center,
  right,
  centerOnTop,
  className,
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  centerOnTop?: boolean;
  className?: string;
}) {
  if (centerOnTop) {
    return (
      <div
        className={cn(
          "grid grid-cols-2 items-stretch gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-3",
          className,
        )}
      >
        <div className="col-start-1 row-start-2 min-w-0 md:row-start-1">
          {left}
        </div>
        <div className="col-span-2 row-start-1 flex items-center justify-center md:col-span-1 md:col-start-2 md:flex-col">
          {center}
        </div>
        <div className="col-start-2 row-start-2 min-w-0 md:col-start-3 md:row-start-1">
          {right}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0">{left}</div>
      <div className="shrink-0">{center}</div>
      <div className="min-w-0">{right}</div>
    </div>
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
          "gap-2 border border-border bg-card p-3 hover:border-signal md:gap-3 md:p-4",
        size === "undercard" &&
          "gap-2.5 border border-silver/50 bg-card p-3 hover:border-silver md:gap-4 md:p-5",
        size === "main" &&
          "gap-3 border border-signal/70 bg-card p-3 hover:border-signal md:gap-5 md:p-6",
        size === "main" &&
          (align === "right" ? "rank-rail-1-end" : "rank-rail-1"),
        selected && "border-signal ring-1 ring-signal",
      )}
    >
      {size === "main" && company.rank != null ? (
        <p className="font-display text-3xl leading-none text-signal md:text-5xl lg:text-6xl">
          {padRank(company.rank)}
        </p>
      ) : company.rank != null ? (
        <DataLabel label="RANK" value={padRank(company.rank)} />
      ) : (
        <DataLabel label="TIER" value={company.tier.replace("_", " ")} />
      )}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-3",
          align === "right" && "items-end md:flex-row-reverse",
        )}
      >
        <FighterMark
          company={company}
          size={size === "main" ? "lg" : size === "undercard" ? "md" : "sm"}
        />
        <h3
          className={cn(
            "font-display min-w-0 flex-1 leading-[0.95] tracking-[0.04em] [overflow-wrap:anywhere] md:truncate md:leading-none",
            size === "pit" &&
              "line-clamp-2 text-lg md:line-clamp-none md:text-2xl",
            size === "undercard" &&
              "line-clamp-2 text-xl md:line-clamp-none md:text-3xl lg:text-4xl",
            size === "main" &&
              "line-clamp-2 text-xl md:line-clamp-none md:text-4xl lg:text-6xl",
          )}
        >
          {company.name}
        </h3>
      </div>
      <p
        className={cn(
          "min-w-0 leading-snug text-muted-foreground italic md:leading-relaxed",
          size === "main"
            ? "line-clamp-3 text-xs md:line-clamp-none md:text-base lg:text-lg"
            : "line-clamp-3 text-xs md:line-clamp-none md:text-sm",
          align === "right" && "text-right",
        )}
      >
        “{company.pitch}”
      </p>
      <Statline company={company} align={align} hideRank />
      <span
        className={cn(
          "font-display mt-auto inline-flex w-full items-center justify-center tracking-[0.14em] md:mt-1 md:tracking-[0.16em]",
          size === "pit" &&
            "h-9 border border-border text-[11px] group-hover:border-signal group-hover:bg-signal group-hover:text-signal-foreground md:h-10 md:text-sm",
          size === "undercard" &&
            "h-10 border border-silver/60 text-[11px] group-hover:border-silver group-hover:bg-silver group-hover:text-background md:h-11 md:text-sm",
          size === "main" &&
            "h-10 bg-signal text-xs text-signal-foreground group-hover:bg-signal/90 md:h-12 md:text-base",
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
    <div
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-0.5 md:flex-col md:gap-2 md:py-1"
      aria-label={`${votesA} to ${votesB}, first to ${votesToWin}`}
    >
      <p
        className={cn(
          "font-display leading-none tracking-[0.08em] text-signal",
          size === "pit" && "text-2xl md:text-3xl",
          size === "undercard" && "text-2xl md:text-4xl lg:text-5xl",
          size === "main" && "text-3xl md:text-5xl lg:text-6xl",
        )}
      >
        {votesA}
        <span className="mx-1.5 text-muted-foreground md:mx-2">–</span>
        {votesB}
      </p>
      <div className="flex flex-col items-center gap-1">
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
    <div className="animate-battle-fade space-y-3 md:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 md:gap-3">
        <TierMark
          tier={battle.tier}
          size={battle.tier === "pit" ? "md" : "lg"}
        />
        <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground">
          {seriesLabel} · BATTLE {formatBattleId(battle.id)}
        </span>
      </div>

      <MatchupLane
        centerOnTop
        left={
          <div className="animate-name-slam h-full min-w-0">
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
        }
        center={
          <div className="flex items-center justify-center gap-3 py-1 text-center md:flex-col md:py-2">
            <span
              className={cn(
                "font-display animate-vs-slam whitespace-nowrap leading-none text-signal",
                size === "pit" && "text-2xl md:text-3xl",
                size === "undercard" && "text-2xl md:text-5xl lg:text-6xl",
                size === "main" && "text-3xl md:text-7xl lg:text-8xl",
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
        }
        right={
          <div className="animate-name-slam-right h-full min-w-0">
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
        }
      />

      <p
        className={cn(
          "font-display text-center tracking-[0.18em]",
          size === "main" && "text-lg text-signal md:text-2xl lg:text-3xl",
          size === "undercard" && "text-base text-silver md:text-xl",
          size === "pit" && "text-base text-silver md:text-xl",
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

function IntroFighter({
  company,
  featured,
  align,
}: {
  company: BattleCompany;
  featured?: boolean;
  align: "left" | "right";
}) {
  const end = align === "right";
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        end ? "items-end text-right" : "items-start text-left",
      )}
    >
      {featured && company.rank != null ? (
        <p className="font-display text-xl leading-none text-signal sm:text-3xl md:text-4xl">
          #{padRank(company.rank)}
        </p>
      ) : null}
      <FighterMark company={company} size={featured ? "lg" : "md"} />
      <p
        className={cn(
          "font-display min-w-0 leading-[0.95] [overflow-wrap:anywhere]",
          featured
            ? "line-clamp-2 text-xl sm:line-clamp-none sm:text-4xl md:text-6xl"
            : "line-clamp-2 text-lg sm:line-clamp-none sm:text-3xl md:text-4xl",
        )}
      >
        {company.name}
      </p>
      {featured ? (
        <p className="line-clamp-3 text-xs leading-snug text-muted-foreground italic sm:line-clamp-none sm:text-sm">
          “{company.pitch}”
        </p>
      ) : null}
      <Statline company={company} align={align} hideRank={featured} />
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
    <div className="animate-battle-fade flex min-h-0 flex-col items-center justify-center px-1 py-6 text-center sm:min-h-[24rem] sm:px-4 sm:py-10">
      <p className="font-data text-[10px] tracking-[0.22em] text-silver">
        THE PITCH PIT
      </p>
      <h2 className="font-display mt-2 text-3xl leading-none tracking-[0.08em] text-silver sm:text-5xl md:text-6xl">
        UNDERCARD
      </h2>
      <MatchupLane
        className="mt-6 w-full max-w-3xl sm:mt-8"
        left={
          <div className="animate-name-slam">
            <IntroFighter company={battle.companyA} align="left" />
          </div>
        }
        center={
          <p className="font-display animate-vs-slam px-1 text-2xl text-silver sm:text-4xl md:text-5xl">
            VS
          </p>
        }
        right={
          <div className="animate-name-slam-right">
            <IntroFighter company={battle.companyB} align="right" />
          </div>
        }
      />
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
    <div className="flex min-h-0 flex-col items-center justify-center px-1 py-6 text-center sm:min-h-[32rem] sm:px-4 sm:py-12">
      <div className="animate-hard-reveal">
        <BrandLogo size="slam" className="mx-auto h-20 sm:h-36 md:h-44" />
      </div>
      <h2 className="font-display animate-main-wipe mt-3 text-4xl leading-none tracking-[0.06em] text-signal sm:mt-4 sm:text-6xl md:text-8xl lg:text-9xl">
        MAIN EVENT
      </h2>
      <p
        className="font-data animate-hard-reveal mt-2 text-[10px] tracking-[0.24em] text-silver"
        style={{ animationDelay: "180ms" }}
      >
        BATTLE {formatBattleId(battle.id)}
      </p>
      <MatchupLane
        className="mt-6 w-full max-w-4xl sm:mt-12"
        left={
          <div className="animate-name-slam">
            <IntroFighter company={battle.companyA} featured align="left" />
          </div>
        }
        center={
          <p className="font-display animate-vs-slam px-1 text-3xl text-signal sm:text-6xl md:text-8xl">
            VS
          </p>
        }
        right={
          <div className="animate-name-slam-right">
            <IntroFighter company={battle.companyB} featured align="right" />
          </div>
        }
      />
      <p
        className="font-display animate-hard-reveal mt-6 text-lg tracking-[0.22em] text-signal sm:mt-12 sm:text-xl md:text-2xl"
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
        "border px-3 py-4 sm:px-6 sm:py-6",
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
          "mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3",
          align === "right" && "items-end sm:flex-row-reverse",
        )}
      >
        <FighterMark company={company} size={featured ? "lg" : "md"} />
        <p
          className={cn(
            "font-display min-w-0 flex-1 leading-[0.95] [overflow-wrap:anywhere]",
            featured && won
              ? "line-clamp-2 text-xl sm:line-clamp-none sm:text-4xl md:text-5xl"
              : "line-clamp-2 text-lg sm:line-clamp-none sm:text-2xl md:text-3xl",
          )}
        >
          {company.name}
        </p>
      </div>
      <div
        className={cn(
          "mt-3 flex flex-col gap-1 sm:mt-4",
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
    <div className="animate-result-cut space-y-4 sm:space-y-6">
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
            featured
              ? "text-4xl sm:text-6xl md:text-8xl"
              : "text-3xl sm:text-5xl md:text-7xl",
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

      <div className="grid grid-cols-2 items-stretch gap-2 md:gap-3">
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
