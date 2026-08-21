"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  BattleIntro,
  FightStage,
  ResultBoard,
  needsIntro,
} from "@/components/decagon/battle-stage";
import { Button } from "@/components/ui/button";
import type {
  BattleCompany,
  BattlePayload,
  BattleStatus,
  VoteOutcome,
} from "@/components/decagon/types";
import type { Intensity } from "@/lib/data/demo";
import type { Tier } from "@/config/tiers";
import { cn } from "@/lib/utils";

export type { BattleCompany, BattlePayload };

type ArenaProps = {
  initialBattle?: BattlePayload | null;
  className?: string;
};

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
      status?: BattleStatus;
      votesA?: number;
      votesB?: number;
      votesToWin?: number;
      winnerId?: string | null;
      loserId?: string | null;
      winnerEloBefore?: number | null;
      loserEloBefore?: number | null;
      winnerEloAfter?: number | null;
      loserEloAfter?: number | null;
      companyA?: BattleCompany;
      companyB?: BattleCompany;
      companyAId?: string;
      companyBId?: string;
    };
    companies?: ApiBattleCompany[];
    hasVoted?: boolean;
    myWinnerId?: string | null;
    id?: string;
    tier?: Tier;
    status?: BattleStatus;
    votesA?: number;
    votesB?: number;
    votesToWin?: number;
    companyA?: BattleCompany;
    companyB?: BattleCompany;
  };

  const resultFields = (src: {
    winnerId?: string | null;
    loserId?: string | null;
    winnerEloBefore?: number | null;
    loserEloBefore?: number | null;
    winnerEloAfter?: number | null;
    loserEloAfter?: number | null;
  }) => ({
    winnerId: src.winnerId ?? null,
    loserId: src.loserId ?? null,
    winnerEloBefore: src.winnerEloBefore ?? null,
    loserEloBefore: src.loserEloBefore ?? null,
    winnerEloAfter: src.winnerEloAfter ?? null,
    loserEloAfter: src.loserEloAfter ?? null,
  });

  if (payload.battle?.companyA && payload.battle?.companyB) {
    return {
      id: payload.battle.id,
      tier: payload.battle.tier ?? payload.battle.companyA.tier,
      companyA: payload.battle.companyA,
      companyB: payload.battle.companyB,
      status: payload.battle.status ?? "open",
      votesA: payload.battle.votesA ?? 0,
      votesB: payload.battle.votesB ?? 0,
      votesToWin: payload.battle.votesToWin ?? 1,
      hasVoted: payload.hasVoted ?? false,
      myWinnerId: payload.myWinnerId ?? null,
      ...resultFields(payload.battle),
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
      status: payload.battle.status ?? "open",
      votesA: payload.battle.votesA ?? 0,
      votesB: payload.battle.votesB ?? 0,
      votesToWin: payload.battle.votesToWin ?? 1,
      hasVoted: payload.hasVoted ?? false,
      myWinnerId: payload.myWinnerId ?? null,
      ...resultFields(payload.battle),
    };
  }

  if (payload.id && payload.companyA && payload.companyB) {
    return {
      id: payload.id,
      tier: payload.tier ?? payload.companyA.tier,
      companyA: payload.companyA,
      companyB: payload.companyB,
      status: payload.status ?? "open",
      votesA: payload.votesA ?? 0,
      votesB: payload.votesB ?? 0,
      votesToWin: payload.votesToWin ?? 1,
      hasVoted: payload.hasVoted ?? false,
      myWinnerId: payload.myWinnerId ?? null,
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

async function fetchBattleById(id: string): Promise<BattlePayload> {
  const res = await fetch(`/api/battles/${id}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body?.error === "string" ? body.error : "Failed to load battle",
    );
  }
  return mapBattleResponse(await res.json());
}

type VoteApiResult = {
  status: BattleStatus;
  votesA: number;
  votesB: number;
  votesToWin: number;
  myWinnerId: string;
  winnerId: string | null;
  loserId: string | null;
  winnerEloBefore?: number;
  loserEloBefore?: number;
  winnerEloAfter?: number;
  loserEloAfter?: number;
};

async function castVote(
  battleId: string,
  winnerId: string,
): Promise<VoteApiResult> {
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

function outcomeFromResolved(
  battle: BattlePayload,
  result: VoteApiResult,
): VoteOutcome | null {
  if (result.status !== "resolved" || !result.winnerId || !result.loserId) {
    return null;
  }
  const winner =
    battle.companyA.id === result.winnerId
      ? battle.companyA
      : battle.companyB;
  const loser =
    winner.id === battle.companyA.id ? battle.companyB : battle.companyA;
  return {
    winner,
    loser,
    winnerEloBefore: result.winnerEloBefore ?? winner.elo,
    winnerEloAfter: result.winnerEloAfter ?? winner.elo,
    loserEloBefore: result.loserEloBefore ?? loser.elo,
    loserEloAfter: result.loserEloAfter ?? loser.elo,
    votesA: result.votesA,
    votesB: result.votesB,
  };
}

function canUseRealtime(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_DEMO_MODE !== "true",
  );
}

export function Arena({ initialBattle = null, className }: ArenaProps) {
  const [battle, setBattle] = useState<BattlePayload | null>(initialBattle);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<VoteOutcome | null>(null);
  const [intro, setIntro] = useState(
    initialBattle ? needsIntro(initialBattle.tier) : false,
  );
  const watchingId = useRef<string | null>(null);

  const loadNext = useCallback(async () => {
    setBusy(true);
    setError(null);
    setOutcome(null);
    watchingId.current = null;
    try {
      const next = await fetchBattle();
      setBattle(next);
      setIntro(needsIntro(next.tier));
      watchingId.current = next.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load battle");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (initialBattle) {
      watchingId.current = initialBattle.id;
    }
  }, [initialBattle]);

  const liveBattleId =
    battle && battle.status === "open" && !outcome ? battle.id : null;

  // Live score: Realtime when available, otherwise poll while fight is open
  useEffect(() => {
    if (!liveBattleId) return;

    const battleId = liveBattleId;
    let cancelled = false;

    async function refresh() {
      try {
        const next = await fetchBattleById(battleId);
        if (cancelled || watchingId.current !== battleId) return;
        setBattle(next);
        if (next.status === "resolved" && next.winnerId && next.loserId) {
          const winner =
            next.companyA.id === next.winnerId
              ? next.companyA
              : next.companyB;
          const loser =
            winner.id === next.companyA.id ? next.companyB : next.companyA;
          setOutcome({
            winner,
            loser,
            winnerEloBefore: next.winnerEloBefore ?? winner.elo,
            winnerEloAfter: next.winnerEloAfter ?? winner.elo,
            loserEloBefore: next.loserEloBefore ?? loser.elo,
            loserEloAfter: next.loserEloAfter ?? loser.elo,
            votesA: next.votesA,
            votesB: next.votesB,
          });
        }
      } catch {
        // ignore transient poll errors
      }
    }

    let channel: { unsubscribe: () => void } | null = null;

    if (canUseRealtime()) {
      void (async () => {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const sub = supabase
            .channel(`battle-votes-${battleId}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "votes",
                filter: `battle_id=eq.${battleId}`,
              },
              () => {
                void refresh();
              },
            )
            .subscribe();
          if (!cancelled) {
            channel = sub;
          } else {
            void supabase.removeChannel(sub);
          }
        } catch {
          // fall through to polling
        }
      })();
    }

    const pollMs = canUseRealtime() ? 8000 : 1500;
    const timer = window.setInterval(() => {
      void refresh();
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      channel?.unsubscribe();
    };
  }, [liveBattleId]);

  async function vote(winnerId: string) {
    if (!battle || busy || battle.hasVoted) return;
    setBusy(true);
    setError(null);
    try {
      const result = await castVote(battle.id, winnerId);
      setBattle((prev) =>
        prev
          ? {
              ...prev,
              votesA: result.votesA,
              votesB: result.votesB,
              votesToWin: result.votesToWin,
              status: result.status,
              hasVoted: true,
              myWinnerId: result.myWinnerId,
            }
          : prev,
      );
      const resolved = outcomeFromResolved(battle, result);
      if (resolved) {
        setOutcome(resolved);
      }
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
          Shared fights. Live tallies. Rankings move when a series is decided.
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
          tier={battle.tier}
          busy={busy}
          onNext={loadNext}
        />
      </div>
    );
  }

  if (intro && needsIntro(battle.tier)) {
    return (
      <div className={cn(className)}>
        <BattleIntro battle={battle} onDone={() => setIntro(false)} />
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      <FightStage
        key={battle.id}
        battle={battle}
        busy={busy}
        error={error}
        onVote={vote}
        onSkip={loadNext}
      />
    </div>
  );
}
