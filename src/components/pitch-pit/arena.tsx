"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  BattleIntro,
  ComeBackBoard,
  FightStage,
  ResultBoard,
  needsIntro,
} from "@/components/pitch-pit/battle-stage";
import { Button } from "@/components/ui/button";
import type {
  BattleCompany,
  BattlePayload,
  BattleStatus,
  CardMeta,
  CardSession,
  VoteOutcome,
} from "@/components/pitch-pit/types";
import type { Intensity } from "@/lib/data/demo";
import type { Tier } from "@/config/tiers";
import { cn } from "@/lib/utils";

export type { BattleCompany, BattlePayload, CardSession };

type ArenaProps = {
  initialSession?: CardSession | null;
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

function resultFields(src: {
  winnerId?: string | null;
  loserId?: string | null;
  winnerEloBefore?: number | null;
  loserEloBefore?: number | null;
  winnerEloAfter?: number | null;
  loserEloAfter?: number | null;
}) {
  return {
    winnerId: src.winnerId ?? null,
    loserId: src.loserId ?? null,
    winnerEloBefore: src.winnerEloBefore ?? null,
    loserEloBefore: src.loserEloBefore ?? null,
    winnerEloAfter: src.winnerEloAfter ?? null,
    loserEloAfter: src.loserEloAfter ?? null,
  };
}

function mapCardMeta(raw: unknown): CardMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const card = raw as Partial<CardMeta>;
  if (typeof card.id !== "string" || typeof card.endsAt !== "string") {
    return null;
  }
  return {
    id: card.id,
    hourKey: card.hourKey ?? "",
    startsAt: card.startsAt ?? card.endsAt,
    endsAt: card.endsAt,
    slot: card.slot ?? 1,
    matchupCount: card.matchupCount ?? 6,
    votesUsed: card.votesUsed ?? 0,
    votesRemaining: card.votesRemaining ?? 0,
  };
}

function mapBattleFromParts(
  battle: {
    id: string;
    tier?: Tier;
    status?: BattleStatus;
    votesA?: number;
    votesB?: number;
    votesToWin?: number;
    companyA?: BattleCompany;
    companyB?: BattleCompany;
    winnerId?: string | null;
    loserId?: string | null;
    winnerEloBefore?: number | null;
    loserEloBefore?: number | null;
    winnerEloAfter?: number | null;
    loserEloAfter?: number | null;
  },
  companies: ApiBattleCompany[] | undefined,
  hasVoted: boolean,
  myWinnerId: string | null,
): BattlePayload | null {
  if (battle.companyA && battle.companyB) {
    return {
      id: battle.id,
      tier: battle.tier ?? battle.companyA.tier,
      companyA: battle.companyA,
      companyB: battle.companyB,
      status: battle.status ?? "open",
      votesA: battle.votesA ?? 0,
      votesB: battle.votesB ?? 0,
      votesToWin: battle.votesToWin ?? 1,
      hasVoted,
      myWinnerId,
      ...resultFields(battle),
    };
  }
  if (Array.isArray(companies) && companies.length >= 2) {
    const [a, b] = companies;
    return {
      id: battle.id,
      tier: battle.tier ?? a.tier,
      companyA: mapApiCompany(a),
      companyB: mapApiCompany(b),
      status: battle.status ?? "open",
      votesA: battle.votesA ?? 0,
      votesB: battle.votesB ?? 0,
      votesToWin: battle.votesToWin ?? 1,
      hasVoted,
      myWinnerId,
      ...resultFields(battle),
    };
  }
  return null;
}

export function mapCardSession(data: unknown): CardSession {
  const payload = data as {
    sessionComplete?: boolean;
    card?: unknown;
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

  const card = mapCardMeta(payload.card);
  const sessionComplete = Boolean(payload.sessionComplete);

  if (payload.battle?.id) {
    const battle = mapBattleFromParts(
      payload.battle,
      payload.companies,
      payload.hasVoted ?? false,
      payload.myWinnerId ?? null,
    );
    if (battle) {
      return { sessionComplete, card, battle };
    }
  }

  if (payload.id && payload.companyA && payload.companyB) {
    return {
      sessionComplete,
      card,
      battle: {
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
      },
    };
  }

  if (sessionComplete && card) {
    return { sessionComplete: true, card, battle: null };
  }

  throw new Error("Invalid battle response");
}

async function fetchSession(
  body: {
    afterBattleId?: string;
    skip?: boolean;
  } = {},
): Promise<CardSession> {
  const res = await fetch("/api/battles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      typeof errBody?.error === "string"
        ? errBody.error
        : "Failed to load battle",
    );
  }
  return mapCardSession(await res.json());
}

async function fetchBattleById(id: string): Promise<CardSession> {
  const res = await fetch(`/api/battles/${id}`);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      typeof errBody?.error === "string"
        ? errBody.error
        : "Failed to load battle",
    );
  }
  return mapCardSession(await res.json());
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
  votesUsed?: number;
  votesRemaining?: number;
  sessionComplete?: boolean;
  nextCardAt?: string | null;
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
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      typeof errBody?.error === "string" ? errBody.error : "Vote failed",
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
    battle.companyA.id === result.winnerId ? battle.companyA : battle.companyB;
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

export function Arena({ initialSession = null, className }: ArenaProps) {
  const [session, setSession] = useState<CardSession | null>(initialSession);
  const battle = session?.battle ?? null;
  const card = session?.card ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<VoteOutcome | null>(null);
  const [intro, setIntro] = useState(
    initialSession?.battle ? needsIntro(initialSession.battle.tier) : false,
  );
  const watchingId = useRef<string | null>(null);
  const battleIdRef = useRef<string | undefined>(undefined);

  const applySession = useCallback((next: CardSession) => {
    setSession(next);
    setIntro(next.battle ? needsIntro(next.battle.tier) : false);
    watchingId.current = next.battle?.id ?? null;
    battleIdRef.current = next.battle?.id;
    if (next.sessionComplete || !next.battle) {
      setOutcome(null);
    }
  }, []);

  useEffect(() => {
    battleIdRef.current = battle?.id;
  }, [battle?.id]);

  const loadNext = useCallback(
    async (opts: { skip?: boolean } = {}) => {
      setBusy(true);
      setError(null);
      setOutcome(null);
      watchingId.current = null;
      try {
        const next = await fetchSession({
          afterBattleId: battleIdRef.current,
          skip: opts.skip,
        });
        applySession(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load battle");
      } finally {
        setBusy(false);
      }
    },
    [applySession],
  );

  useEffect(() => {
    if (initialSession?.battle) {
      watchingId.current = initialSession.battle.id;
    }
  }, [initialSession]);

  const liveBattleId =
    battle && battle.status === "open" && !outcome ? battle.id : null;

  useEffect(() => {
    if (!liveBattleId) return;

    const battleId = liveBattleId;
    let cancelled = false;

    async function refresh() {
      try {
        const next = await fetchBattleById(battleId);
        if (cancelled || watchingId.current !== battleId) return;
        setSession(next);
        const live = next.battle;
        if (live?.status === "resolved" && live.winnerId && live.loserId) {
          const winner =
            live.companyA.id === live.winnerId ? live.companyA : live.companyB;
          const loser =
            winner.id === live.companyA.id ? live.companyB : live.companyA;
          setOutcome({
            winner,
            loser,
            winnerEloBefore: live.winnerEloBefore ?? winner.elo,
            winnerEloAfter: live.winnerEloAfter ?? winner.elo,
            loserEloBefore: live.loserEloBefore ?? loser.elo,
            loserEloAfter: live.loserEloAfter ?? loser.elo,
            votesA: live.votesA,
            votesB: live.votesB,
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
      setSession((prev) => {
        if (!prev?.battle) return prev;
        return {
          sessionComplete: result.sessionComplete ?? prev.sessionComplete,
          card: prev.card
            ? {
                ...prev.card,
                votesUsed: result.votesUsed ?? prev.card.votesUsed + 1,
                votesRemaining:
                  result.votesRemaining ??
                  Math.max(0, prev.card.votesRemaining - 1),
              }
            : prev.card,
          battle: {
            ...prev.battle,
            votesA: result.votesA,
            votesB: result.votesB,
            votesToWin: result.votesToWin,
            status: result.status,
            hasVoted: true,
            myWinnerId: result.myWinnerId,
          },
        };
      });
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

  if (outcome && battle) {
    return (
      <div className={cn(className)}>
        <ResultBoard
          outcome={outcome}
          battleId={battle.id}
          tier={battle.tier}
          card={card}
          busy={busy}
          onNext={() => void loadNext()}
        />
      </div>
    );
  }

  if (session?.sessionComplete && card) {
    return (
      <div className={cn(className)}>
        <ComeBackBoard
          card={card}
          busy={busy}
          error={error}
          onNext={() => void loadNext()}
        />
      </div>
    );
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
          Six matchups an hour. Least-fought names get the next shot.
        </p>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          size="lg"
          disabled={busy}
          onClick={() => void loadNext()}
        >
          {busy ? "LOADING…" : "Enter The Pitch Pit"}
        </Button>
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
        card={card}
        busy={busy}
        error={error}
        onVote={vote}
        onSkip={() => void loadNext({ skip: true })}
        onNext={() => void loadNext()}
      />
    </div>
  );
}
