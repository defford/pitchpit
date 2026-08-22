"use client";

import { useCallback, useEffect, useState } from "react";

import { CardBoard } from "@/components/pitch-pit/card-board";
import { Button } from "@/components/ui/button";
import type {
  BattleCompany,
  CardMatchup,
  CardSession,
} from "@/components/pitch-pit/types";
import type { Intensity } from "@/lib/data/demo";
import type { Tier } from "@/config/tiers";
import { cn } from "@/lib/utils";

export type { CardSession };

type ArenaProps = {
  initialSession?: CardSession | null;
  className?: string;
};

type ApiCompany = {
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

function mapCompany(company: ApiCompany): BattleCompany {
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

function mapMatchup(raw: {
  battle: {
    id: string;
    slot?: number;
    tier: Tier;
    status?: CardMatchup["status"];
    votesA?: number;
    votesB?: number;
    voteBudget?: number;
    winnerId?: string | null;
    loserId?: string | null;
  };
  companies: [ApiCompany, ApiCompany];
  hasVoted?: boolean;
  myPointsA?: number | null;
  myPointsB?: number | null;
  myWinnerId?: string | null;
}): CardMatchup {
  const [a, b] = raw.companies;
  return {
    id: raw.battle.id,
    slot: raw.battle.slot ?? 0,
    tier: raw.battle.tier,
    companyA: mapCompany(a),
    companyB: mapCompany(b),
    status: raw.battle.status ?? "open",
    pointsA: raw.battle.votesA ?? 0,
    pointsB: raw.battle.votesB ?? 0,
    voteBudget: raw.battle.voteBudget ?? 1,
    hasVoted: raw.hasVoted ?? false,
    myPointsA: raw.myPointsA ?? null,
    myPointsB: raw.myPointsB ?? null,
    myWinnerId: raw.myWinnerId ?? null,
    winnerId: raw.battle.winnerId ?? null,
    loserId: raw.battle.loserId ?? null,
  };
}

export function mapCardSession(data: unknown): CardSession {
  const payload = data as {
    sessionComplete?: boolean;
    servingGrace?: boolean;
    card?: Partial<CardSession["card"]>;
    matchups?: Array<{
      battle: {
        id: string;
        slot?: number;
        tier: Tier;
        status?: CardMatchup["status"];
        votesA?: number;
        votesB?: number;
        voteBudget?: number;
        winnerId?: string | null;
        loserId?: string | null;
      };
      companies: [ApiCompany, ApiCompany];
      hasVoted?: boolean;
      myPointsA?: number | null;
      myPointsB?: number | null;
      myWinnerId?: string | null;
    }>;
  };

  if (!payload.card?.id || !payload.card.endsAt || !payload.card.graceEndsAt) {
    throw new Error("Invalid battle response");
  }
  if (!Array.isArray(payload.matchups) || payload.matchups.length === 0) {
    throw new Error("Invalid battle response");
  }

  return {
    sessionComplete: Boolean(payload.sessionComplete),
    servingGrace: Boolean(payload.servingGrace),
    card: {
      id: payload.card.id,
      hourKey: payload.card.hourKey ?? "",
      startsAt: payload.card.startsAt ?? payload.card.endsAt,
      endsAt: payload.card.endsAt,
      graceEndsAt: payload.card.graceEndsAt,
      phase: payload.card.phase ?? "open",
      matchupCount: payload.card.matchupCount ?? payload.matchups.length,
      votesUsed: payload.card.votesUsed ?? 0,
      votesRemaining: payload.card.votesRemaining ?? 0,
    },
    matchups: payload.matchups.map(mapMatchup),
  };
}

async function fetchSession(): Promise<CardSession> {
  const res = await fetch("/api/battles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
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

async function allocateVote(
  battleId: string,
  pointsA: number,
  pointsB: number,
) {
  const res = await fetch("/api/votes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ battleId, pointsA, pointsB }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      typeof errBody?.error === "string" ? errBody.error : "Vote failed",
    );
  }
  return res.json() as Promise<{
    votesA: number;
    votesB: number;
    myPointsA: number;
    myPointsB: number;
    myWinnerId: string;
    votesUsed?: number;
    votesRemaining?: number;
    sessionComplete?: boolean;
  }>;
}

export function Arena({ initialSession = null, className }: ArenaProps) {
  const [session, setSession] = useState<CardSession | null>(initialSession);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setSession(await fetchSession());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load card");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const cardId = session?.card.id;
    if (!cardId) return;
    const id = window.setInterval(() => {
      void fetchSession()
        .then(setSession)
        .catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(id);
  }, [session?.card.id]);

  async function onAllocate(
    battleId: string,
    pointsA: number,
    pointsB: number,
  ) {
    if (!session || busy) return;
    const fight = session.matchups.find((row) => row.id === battleId);
    if (!fight || fight.hasVoted) return;
    setBusy(true);
    setError(null);
    try {
      const result = await allocateVote(battleId, pointsA, pointsB);
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sessionComplete: result.sessionComplete ?? prev.sessionComplete,
          card: {
            ...prev.card,
            votesUsed: result.votesUsed ?? prev.card.votesUsed + 1,
            votesRemaining:
              result.votesRemaining ??
              Math.max(0, prev.card.votesRemaining - 1),
          },
          matchups: prev.matchups.map((row) =>
            row.id === battleId
              ? {
                  ...row,
                  pointsA: result.votesA,
                  pointsB: result.votesB,
                  hasVoted: true,
                  myPointsA: result.myPointsA,
                  myPointsB: result.myPointsB,
                  myWinnerId: result.myWinnerId,
                }
              : row,
          ),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-5 border border-border bg-card px-6 py-12 text-center",
          className,
        )}
      >
        <p className="font-data text-[10px] tracking-[0.2em] text-muted-foreground">
          OPENING THE CARD
        </p>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : (
          <p className="font-data text-xs tracking-[0.16em] text-silver">
            SIX FIGHTS / ONE HOUR
          </p>
        )}
        <Button type="button" disabled={busy} onClick={() => void load()}>
          {busy ? "LOADING…" : "Load the card"}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      <CardBoard
        session={session}
        busy={busy}
        error={error}
        onAllocate={onAllocate}
      />
    </div>
  );
}
