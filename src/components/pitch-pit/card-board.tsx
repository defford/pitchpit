"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { CompanyLink, CompanyMark } from "@/components/company-mark";
import { Button } from "@/components/ui/button";
import { DataLabel, DataStat } from "@/components/terminal/data-label";
import { TierMark } from "@/components/terminal/tier-mark";
import { SeasonCountdown } from "@/components/leaderboard/season-countdown";
import type {
  BattleCompany,
  CardMatchup,
  CardSession,
} from "@/components/pitch-pit/types";
import type { Tier } from "@/config/tiers";
import { formatRating, padRank } from "@/lib/format";
import { cn } from "@/lib/utils";

function Statline({
  company,
  align = "left",
}: {
  company: BattleCompany;
  align?: "left" | "right";
}) {
  const today =
    company.wins != null && company.losses != null
      ? `${company.wins}–${company.losses}`
      : null;
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 md:flex-row md:flex-wrap md:items-center md:gap-3",
        align === "right" ? "items-end md:justify-end" : "items-start",
      )}
    >
      {company.rank != null ? (
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
    <CompanyMark
      name={company.name}
      logoUrl={company.logoUrl}
      websiteUrl={company.websiteUrl}
      size={size === "lg" ? "xl" : size === "md" ? "lg" : "md"}
    />
  );
}

function MatchupLane({
  left,
  center,
  right,
  className,
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  className?: string;
}) {
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

export function budgetCopy(tier: Tier, budget: number) {
  if (tier === "main_event") return `BEST OF 7 · ${budget} POINTS`;
  if (tier === "undercard") return `${budget} POINTS TO SPLIT`;
  return "1 POINT";
}

export function voteBudgetHeadline(budget: number) {
  return budget === 1 ? "1 VOTE" : `${budget} VOTES`;
}

function CompanyPick({
  company,
  align,
  size,
  selected,
  locked,
  disabled,
  onPick,
}: {
  company: BattleCompany;
  align: "left" | "right";
  size: "pit" | "undercard" | "main";
  selected?: boolean;
  locked?: boolean;
  disabled?: boolean;
  onPick: () => void;
}) {
  const voteLabel = locked
    ? selected
      ? `You voted for ${company.name}`
      : company.name
    : size === "pit"
      ? `Cast vote for ${company.name}`
      : `Give a point to ${company.name}`;

  return (
    <div
      className={cn(
        "group flex h-full w-full min-w-0 flex-col",
        align === "right" && "text-right",
        size === "pit" && "gap-2 border border-border bg-card p-3 md:p-4",
        size === "undercard" &&
          "gap-2 border border-silver/50 bg-card p-3 md:p-4",
        size === "main" && "gap-3 border border-signal/70 bg-card p-3 md:p-5",
        selected && "border-signal ring-1 ring-signal",
      )}
    >
      <CompanyLink
        name={company.name}
        companyId={company.id}
        websiteUrl={company.websiteUrl}
        clickCount={company.clickCount}
        className={cn(
          "w-full flex-col gap-2 pb-3",
          align === "right" && "items-end",
        )}
      >
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
              "font-display min-w-0 flex-1 leading-[0.95] tracking-[0.04em] [overflow-wrap:anywhere] md:truncate",
              size === "pit" && "line-clamp-2 text-lg md:text-xl",
              size === "undercard" && "line-clamp-2 text-xl md:text-2xl",
              size === "main" && "line-clamp-2 text-xl md:text-3xl lg:text-4xl",
            )}
          >
            {company.name}
          </h3>
        </div>
        <p
          className={cn(
            "line-clamp-3 min-w-0 text-xs leading-snug text-muted-foreground italic md:text-sm",
            align === "right" && "text-right",
          )}
        >
          “{company.pitch}”
        </p>
        <Statline company={company} align={align} />
      </CompanyLink>
      {size === "pit" ? (
        <button
          type="button"
          disabled={disabled || locked}
          onClick={onPick}
          aria-label={voteLabel}
          aria-pressed={selected || undefined}
          className="font-display mt-auto inline-flex h-9 w-full items-center justify-center border border-border text-[11px] tracking-[0.14em] hover:border-signal hover:bg-signal hover:text-signal-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60 md:h-10 md:text-sm"
        >
          {locked ? (selected ? "YOUR PICK" : "—") : "CAST VOTE"}
        </button>
      ) : null}
    </div>
  );
}

function SplitControls({
  matchup,
  draftA,
  draftB,
  busy,
  onDraft,
  onLock,
}: {
  matchup: CardMatchup;
  draftA: number;
  draftB: number;
  busy: boolean;
  onDraft: (pointsA: number, pointsB: number) => void;
  onLock: () => void;
}) {
  const spent = draftA + draftB;
  const remaining = matchup.voteBudget - spent;
  const ready = remaining === 0;

  function bump(side: "a" | "b", delta: number) {
    if (matchup.hasVoted || busy) return;
    const nextA = side === "a" ? draftA + delta : draftA;
    const nextB = side === "b" ? draftB + delta : draftB;
    if (nextA < 0 || nextB < 0) return;
    if (nextA + nextB > matchup.voteBudget) return;
    onDraft(nextA, nextB);
  }

  return (
    <div className="flex flex-col items-center gap-2 py-1">
      <p className="font-display text-2xl leading-none tracking-[0.08em] text-signal md:text-3xl">
        {draftA}
        <span className="mx-1.5 text-muted-foreground">–</span>
        {draftB}
      </p>
      <p className="font-data text-[10px] tracking-[0.16em] text-silver">
        {remaining} LEFT · FLOOR {matchup.pointsA}–{matchup.pointsB}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || matchup.hasVoted || draftA <= 0}
            aria-label={`Remove a point from ${matchup.companyA.name}`}
            onClick={() => bump("a", -1)}
          >
            −
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || matchup.hasVoted || remaining <= 0}
            aria-label={`Give a point to ${matchup.companyA.name}`}
            onClick={() => bump("a", 1)}
          >
            +
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || matchup.hasVoted || draftB <= 0}
            aria-label={`Remove a point from ${matchup.companyB.name}`}
            onClick={() => bump("b", -1)}
          >
            −
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || matchup.hasVoted || remaining <= 0}
            aria-label={`Give a point to ${matchup.companyB.name}`}
            onClick={() => bump("b", 1)}
          >
            +
          </Button>
        </div>
      </div>
      {matchup.hasVoted ? (
        <p className="font-data text-[10px] tracking-[0.16em] text-signal">
          LOCKED {matchup.myPointsA}–{matchup.myPointsB}
        </p>
      ) : (
        <Button
          type="button"
          size="sm"
          disabled={busy || !ready}
          onClick={onLock}
        >
          {ready ? "Lock in" : "Split the points"}
        </Button>
      )}
    </div>
  );
}

export function FightRow({
  matchup,
  busy,
  onAllocate,
}: {
  matchup: CardMatchup;
  busy: boolean;
  onAllocate: (battleId: string, pointsA: number, pointsB: number) => void;
}) {
  const [draftA, setDraftA] = useState(matchup.myPointsA ?? 0);
  const [draftB, setDraftB] = useState(matchup.myPointsB ?? 0);
  const size =
    matchup.tier === "main_event"
      ? "main"
      : matchup.tier === "undercard"
        ? "undercard"
        : "pit";
  const locked = matchup.hasVoted;

  return (
    <article
      data-testid="card-fight"
      data-tier={matchup.tier}
      className={cn(
        "border bg-card/80 p-3 md:p-4",
        matchup.tier === "main_event" ? "border-signal/60" : "border-border",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <TierMark
          tier={matchup.tier}
          size={matchup.tier === "pit" ? "sm" : "md"}
        />
        <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground">
          {budgetCopy(matchup.tier, matchup.voteBudget)}
        </span>
      </div>
      <MatchupLane
        left={
          <CompanyPick
            company={matchup.companyA}
            align="left"
            size={size}
            locked={locked}
            selected={matchup.myWinnerId === matchup.companyA.id}
            disabled={busy}
            onPick={() => {
              if (matchup.tier === "pit") {
                onAllocate(matchup.id, 1, 0);
                return;
              }
              setDraftA((n) => (n + draftB < matchup.voteBudget ? n + 1 : n));
            }}
          />
        }
        center={
          matchup.tier === "pit" ? (
            <div className="flex flex-col items-center gap-1 py-1 text-center">
              <span className="font-display text-2xl leading-none text-signal md:text-3xl">
                VS
              </span>
              <p className="font-data text-[10px] tracking-[0.16em] text-silver">
                FLOOR {matchup.pointsA}–{matchup.pointsB}
              </p>
              {locked ? (
                <p className="font-data text-[10px] tracking-[0.16em] text-signal">
                  YOUR PICK
                </p>
              ) : null}
            </div>
          ) : (
            <SplitControls
              matchup={matchup}
              draftA={draftA}
              draftB={draftB}
              busy={busy}
              onDraft={(a, b) => {
                setDraftA(a);
                setDraftB(b);
              }}
              onLock={() => onAllocate(matchup.id, draftA, draftB)}
            />
          )
        }
        right={
          <CompanyPick
            company={matchup.companyB}
            align="right"
            size={size}
            locked={locked}
            selected={matchup.myWinnerId === matchup.companyB.id}
            disabled={busy}
            onPick={() => {
              if (matchup.tier === "pit") {
                onAllocate(matchup.id, 0, 1);
                return;
              }
              setDraftB((n) => (n + draftA < matchup.voteBudget ? n + 1 : n));
            }}
          />
        }
      />
    </article>
  );
}

export function CardChrome({
  session,
  error,
  blurb = "Six fights. Preview the card, then vote one matchup at a time. Pit gets 1 point, Undercard 3, Main Event 7.",
}: {
  session: CardSession;
  error?: string | null;
  blurb?: string;
}) {
  const timerEnd = session.servingGrace
    ? session.card.graceEndsAt
    : session.card.endsAt;

  return (
    <>
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-data text-[10px] tracking-[0.22em] text-silver">
            HOURLY CARD · {session.card.votesUsed}/{session.card.matchupCount}{" "}
            LOCKED
          </p>
          <h1 className="font-display mt-1 text-3xl tracking-[0.06em] text-foreground sm:text-4xl">
            THE PITCH PIT
          </h1>
          <p className="mt-1 max-w-xl text-sm text-silver">{blurb}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <SeasonCountdown
            endsAt={timerEnd}
            kicker={session.servingGrace ? "GRACE" : "NEXT CARD"}
            endedLabel={session.servingGrace ? "CLOSED" : "NOW"}
          />
          <Link
            href="/the-pitch-pit/history"
            className="font-data text-[10px] tracking-[0.16em] text-muted-foreground uppercase hover:text-signal"
          >
            Card history
          </Link>
        </div>
      </header>

      {session.servingGrace ? (
        <p
          className="border border-signal/40 bg-signal/10 px-3 py-2 text-sm text-signal"
          role="status"
        >
          This hour’s card closed. You have 10 minutes of grace to finish
          voting. After that, leftover ballots are dropped and the floor tallies
          lock in.
        </p>
      ) : null}

      {session.sessionComplete ? (
        <p className="border border-border bg-card px-3 py-2 text-sm text-silver">
          Card locked. Watch the floor totals, then come back when the next card
          drops.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
