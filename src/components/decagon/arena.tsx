"use client";

import { useCallback, useEffect, useState } from "react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataLabel, DataStat } from "@/components/terminal/data-label";
import { RatingDelta } from "@/components/terminal/rank-movement";
import { TierMark } from "@/components/terminal/tier-mark";
import type { Tier } from "@/config/tiers";
import type { Intensity } from "@/lib/data/demo";
import {
  formatBattleId,
  formatRating,
  formatToday,
  initials,
  padRank,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export type BattleCompany = {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  pitch: string;
  elo: number;
  tier: Tier;
  intensity: Intensity;
  wins?: number;
  losses?: number;
  rank?: number;
};

export type BattlePayload = {
  id: string;
  tier: Tier;
  companyA: BattleCompany;
  companyB: BattleCompany;
};

type VoteOutcome = {
  winner: BattleCompany;
  loser: BattleCompany;
  winnerEloBefore: number;
  winnerEloAfter: number;
  loserEloBefore: number;
  loserEloAfter: number;
};

type ArenaProps = {
  initialBattle?: BattlePayload | null;
  className?: string;
};

function CompanyModule({
  company,
  disabled,
  onVote,
  align,
  size,
}: {
  company: BattleCompany;
  disabled: boolean;
  onVote: () => void;
  align: "left" | "right";
  size: "pit" | "undercard" | "main";
}) {
  const today = formatToday(company.wins, company.losses);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onVote}
      aria-label={`Cast vote for ${company.name}`}
      className={cn(
        "group flex flex-col border border-border bg-card text-left transition-colors hover:border-signal focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60",
        align === "right" && "text-right",
        size === "pit" && "gap-3 p-4",
        size === "undercard" && "gap-4 p-5",
        size === "main" && "gap-5 p-6",
      )}
    >
      {company.rank != null ? (
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
        <Avatar
          className={cn(
            "rounded-sm after:rounded-sm",
            size === "main" ? "size-14" : "size-10",
          )}
        >
          {company.logoUrl ? (
            <AvatarImage src={company.logoUrl} alt="" />
          ) : null}
          <AvatarFallback className="rounded-sm bg-muted font-data text-xs text-silver">
            {initials(company.name)}
          </AvatarFallback>
        </Avatar>
        <h3
          className={cn(
            "font-display min-w-0 flex-1 truncate leading-none tracking-[0.04em]",
            size === "pit" && "text-2xl",
            size === "undercard" && "text-3xl",
            size === "main" && "text-4xl sm:text-5xl",
          )}
        >
          {company.name}
        </h3>
      </div>
      <p
        className={cn(
          "text-sm leading-relaxed text-muted-foreground italic",
          align === "right" && "text-right",
        )}
      >
        “{company.pitch}”
      </p>
      <div
        className={cn(
          "mt-auto flex flex-wrap items-center gap-3",
          align === "right" && "justify-end",
        )}
      >
        <DataLabel label="RATING" value={formatRating(company.elo)} />
        {today ? <DataStat>TODAY {today}</DataStat> : null}
      </div>
      <span className="font-display mt-1 inline-flex h-10 items-center justify-center border border-border bg-transparent text-sm tracking-[0.16em] group-hover:border-signal group-hover:bg-signal group-hover:text-signal-foreground">
        CAST VOTE
      </span>
    </button>
  );
}

type ApiBattleCompany = {
  id: string;
  name: string;
  pitch: string;
  website_url?: string;
  websiteUrl?: string;
  logo_path?: string | null;
  logoUrl?: string | null;
  tier: BattleCompany["tier"];
  elo?: number;
  wins?: number;
  losses?: number;
  rank?: number;
};

function mapApiCompany(company: ApiBattleCompany): BattleCompany {
  const intensity: Intensity =
    company.tier === "main_event"
      ? "loud"
      : company.tier === "undercard"
        ? "bold"
        : "plain";

  return {
    id: company.id,
    name: company.name,
    pitch: company.pitch,
    websiteUrl: company.websiteUrl ?? company.website_url ?? null,
    logoUrl: company.logoUrl ?? company.logo_path ?? null,
    elo: company.elo ?? 1500,
    wins: company.wins,
    losses: company.losses,
    rank: company.rank,
    tier: company.tier,
    intensity,
  };
}

export function mapBattleResponse(data: unknown): BattlePayload {
  const payload = data as {
    battle?: {
      id: string;
      tier?: Tier;
      companyA?: BattleCompany;
      companyB?: BattleCompany;
      companyAId?: string;
      companyBId?: string;
    };
    companies?: ApiBattleCompany[];
    id?: string;
    tier?: Tier;
    companyA?: BattleCompany;
    companyB?: BattleCompany;
  };

  if (payload.battle?.companyA && payload.battle?.companyB) {
    return {
      id: payload.battle.id,
      tier: payload.battle.tier ?? payload.battle.companyA.tier,
      companyA: payload.battle.companyA,
      companyB: payload.battle.companyB,
    };
  }

  if (
    payload.battle?.id &&
    Array.isArray(payload.companies) &&
    payload.companies.length >= 2
  ) {
    const [a, b] = payload.companies;
    return {
      id: payload.battle.id,
      tier: payload.battle.tier ?? a.tier,
      companyA: mapApiCompany(a),
      companyB: mapApiCompany(b),
    };
  }

  if (payload.id && payload.companyA && payload.companyB) {
    return {
      id: payload.id,
      tier: payload.tier ?? payload.companyA.tier,
      companyA: payload.companyA,
      companyB: payload.companyB,
    };
  }

  throw new Error("Invalid battle response");
}

async function fetchBattle(): Promise<BattlePayload> {
  const res = await fetch("/api/battles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body?.error === "string" ? body.error : "Failed to load battle",
    );
  }
  return mapBattleResponse(await res.json());
}

async function castVote(
  battleId: string,
  winnerId: string,
): Promise<{
  winnerEloAfter: number;
  loserEloAfter: number;
  winnerId: string;
  loserId: string;
}> {
  const res = await fetch("/api/votes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ battleId, winnerId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body?.error === "string" ? body.error : "Vote failed",
    );
  }
  return res.json();
}

function moduleSize(tier: Tier): "pit" | "undercard" | "main" {
  if (tier === "main_event") return "main";
  if (tier === "undercard") return "undercard";
  return "pit";
}

function ResultBoard({
  outcome,
  battleId,
  busy,
  onNext,
}: {
  outcome: VoteOutcome;
  battleId: string;
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

  return (
    <div className="animate-result-cut border border-border bg-card px-5 py-10 text-center sm:px-8">
      <p className="font-data text-[10px] tracking-[0.2em] text-muted-foreground">
        BATTLE {formatBattleId(battleId)}
      </p>
      <h2 className="font-display mt-3 text-5xl leading-none tracking-[0.04em] text-signal sm:text-7xl">
        {headline}
      </h2>
      {beatChampion || upset ? (
        <p className="font-display mt-3 text-3xl tracking-[0.06em] sm:text-5xl">
          {outcome.winner.name}
        </p>
      ) : null}
      {beatChampion ? (
        <p className="font-data mt-3 text-xs tracking-[0.14em] text-silver">
          #{padRank(outcome.winner.rank ?? 0)} DEFEATS #
          {padRank(outcome.loser.rank ?? 1)}
        </p>
      ) : null}
      <div className="mt-8 flex flex-col items-center gap-2">
        <DataLabel
          label="RATING"
          value={`${formatRating(outcome.winnerEloBefore)} → ${formatRating(outcome.winnerEloAfter)}`}
        />
        <RatingDelta delta={outcome.winnerEloAfter - outcome.winnerEloBefore} />
      </div>
      <Button
        type="button"
        size="lg"
        disabled={busy}
        onClick={onNext}
        className="mt-8"
      >
        {busy ? "LOADING…" : "Next Fight"}
      </Button>
    </div>
  );
}

function MainEventIntro({
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
    const id = window.setTimeout(onDone, 1600);
    return () => window.clearTimeout(id);
    // Intro is keyed per battle; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[28rem] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="animate-hard-reveal">
        <BrandLogo size="slam" className="mx-auto" />
      </div>
      <h2 className="font-display animate-hard-reveal mt-3 text-6xl leading-none tracking-[0.06em] text-signal sm:text-8xl">
        MAIN EVENT
      </h2>
      <div className="mt-10 grid w-full max-w-3xl items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <div className="animate-name-slam">
          {battle.companyA.rank != null ? (
            <p className="font-data text-xs text-silver">
              #{padRank(battle.companyA.rank)}
            </p>
          ) : null}
          <p className="font-display text-4xl leading-none sm:text-5xl">
            {battle.companyA.name}
          </p>
        </div>
        <p className="font-display animate-vs-slam text-5xl text-signal sm:text-6xl">
          VS
        </p>
        <div className="animate-name-slam" style={{ animationDelay: "80ms" }}>
          {battle.companyB.rank != null ? (
            <p className="font-data text-xs text-silver">
              #{padRank(battle.companyB.rank)}
            </p>
          ) : null}
          <p className="font-display text-4xl leading-none sm:text-5xl">
            {battle.companyB.name}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Arena({ initialBattle = null, className }: ArenaProps) {
  const [battle, setBattle] = useState<BattlePayload | null>(initialBattle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<VoteOutcome | null>(null);
  const [intro, setIntro] = useState(initialBattle?.tier === "main_event");

  const loadNext = useCallback(async () => {
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      const next = await fetchBattle();
      setBattle(next);
      setIntro(next.tier === "main_event");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load battle");
    } finally {
      setBusy(false);
    }
  }, []);

  async function vote(winnerId: string) {
    if (!battle || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await castVote(battle.id, winnerId);
      const winner =
        battle.companyA.id === result.winnerId
          ? battle.companyA
          : battle.companyB;
      const loser =
        winner.id === battle.companyA.id ? battle.companyB : battle.companyA;
      setOutcome({
        winner,
        loser,
        winnerEloBefore: winner.elo,
        winnerEloAfter: result.winnerEloAfter,
        loserEloBefore: loser.elo,
        loserEloAfter: result.loserEloAfter,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setBusy(false);
    }
  }

  if (!battle) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-5 border border-border bg-card px-6 py-12 text-center",
          className,
        )}
      >
        <p className="font-data text-[10px] tracking-[0.2em] text-muted-foreground">
          OPEN FLOOR
        </p>
        <p className="font-display text-6xl leading-none tracking-[0.08em] text-signal">
          VS
        </p>
        <p className="max-w-sm text-sm text-silver">
          Two competitors. One vote. Rankings move when you decide.
        </p>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="button" size="lg" disabled={busy} onClick={loadNext}>
          {busy ? "LOADING…" : "Enter the Decagon"}
        </Button>
      </div>
    );
  }

  if (outcome) {
    return (
      <div className={cn(className)}>
        <ResultBoard
          outcome={outcome}
          battleId={battle.id}
          busy={busy}
          onNext={loadNext}
        />
      </div>
    );
  }

  if (intro && battle.tier === "main_event") {
    return (
      <div className={cn(className)}>
        <MainEventIntro
          key={battle.id}
          battle={battle}
          onDone={() => setIntro(false)}
        />
      </div>
    );
  }

  const size = moduleSize(battle.tier);

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <TierMark
          tier={battle.tier}
          size={battle.tier === "main_event" ? "lg" : "md"}
        />
        <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground">
          BATTLE {formatBattleId(battle.id)}
        </span>
      </div>

      {battle.tier === "main_event" ? (
        <p className="font-display text-center text-4xl tracking-[0.1em] text-signal sm:text-5xl">
          MAIN EVENT
        </p>
      ) : null}

      <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
        <CompanyModule
          company={battle.companyA}
          disabled={busy}
          onVote={() => vote(battle.companyA.id)}
          align="left"
          size={size}
        />
        <div className="flex items-center justify-center py-2">
          <span
            className={cn(
              "font-display leading-none text-signal",
              size === "pit" && "text-3xl",
              size === "undercard" && "text-5xl",
              size === "main" && "text-7xl sm:text-8xl",
            )}
          >
            VS
          </span>
        </div>
        <CompanyModule
          company={battle.companyB}
          disabled={busy}
          onVote={() => vote(battle.companyB.id)}
          align="right"
          size={size}
        />
      </div>

      <p className="font-display text-center text-xl tracking-[0.18em] text-silver">
        WHO WINS?
      </p>

      {error ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={loadNext}
          className="text-[10px] tracking-[0.16em] text-muted-foreground"
        >
          Skip battle
        </Button>
      </div>
    </div>
  );
}
