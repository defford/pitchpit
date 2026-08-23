"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { CardChrome, FightRow } from "@/components/pitch-pit/card-board";
import { FightIntro } from "@/components/pitch-pit/fight-intro";
import { CardPoster } from "@/components/pitch-pit/card-poster";
import { Button } from "@/components/ui/button";
import type {
  BattleCompany,
  CardMatchup,
  CardSession,
} from "@/components/pitch-pit/types";
import type { Intensity } from "@/lib/data/demo";
import type { Tier } from "@/config/tiers";
import { resolveCompanyLogoUrl } from "@/lib/logos";
import { cn } from "@/lib/utils";

export type { CardSession };

type ArenaProps = {
  initialSession?: CardSession | null;
  className?: string;
};

type CardView = "poster" | "intro" | "fight";

type ApiCompany = {
  id: string;
  name: string;
  pitch: string;
  website_url?: string;
  websiteUrl?: string;
  logo_path?: string | null;
  logoUrl?: string | null;
  click_count?: number;
  clickCount?: number;
  tier: BattleCompany["tier"];
  elo?: number;
  wins?: number;
  losses?: number;
  rank?: number;
};

function viewStorageKey(cardId: string) {
  return `pp_card_view_${cardId}`;
}

function readStoredView(cardId: string): CardView | null {
  try {
    const value = sessionStorage.getItem(viewStorageKey(cardId));
    if (value === "fight" || value === "intro" || value === "poster") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredView(cardId: string, view: CardView) {
  try {
    sessionStorage.setItem(viewStorageKey(cardId), view);
  } catch {
    // sessionStorage may be unavailable; in-memory flow still works.
  }
}

function orderedMatchups(matchups: CardMatchup[]) {
  return [...matchups].sort((a, b) => a.slot - b.slot);
}

function firstUnvoted(matchups: CardMatchup[]) {
  return orderedMatchups(matchups).find((row) => !row.hasVoted) ?? null;
}

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
    clickCount: company.clickCount ?? company.click_count ?? 0,
    logoUrl: resolveCompanyLogoUrl({
      logoPath: company.logoUrl ?? company.logo_path,
      websiteUrl: company.websiteUrl ?? company.website_url,
    }),
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

type ViewState = {
  cardId: string;
  view: CardView;
  battleId: string | null;
};

function resolveViewState(
  session: CardSession,
  override: ViewState | null,
  storedView: CardView | null,
): ViewState {
  const cardId = session.card.id;
  if (session.sessionComplete) {
    return { cardId, view: "poster", battleId: null };
  }
  if (override?.cardId === cardId) {
    if (override.view === "intro" || override.view === "fight") {
      const preferred =
        (override.battleId
          ? session.matchups.find(
              (row) => row.id === override.battleId && !row.hasVoted,
            )
          : null) ?? firstUnvoted(session.matchups);
      if (preferred) {
        return { cardId, view: override.view, battleId: preferred.id };
      }
      return { cardId, view: "poster", battleId: null };
    }
    return { cardId, view: "poster", battleId: null };
  }
  if (storedView === "intro" || storedView === "fight") {
    const next = firstUnvoted(session.matchups);
    if (next) {
      return { cardId, view: storedView, battleId: next.id };
    }
  }
  return { cardId, view: "poster", battleId: null };
}

function useStoredCardView(cardId: string | undefined): CardView | null {
  return useSyncExternalStore(
    () => () => undefined,
    () => (cardId ? readStoredView(cardId) : null),
    () => null,
  );
}

export function Arena({ initialSession = null, className }: ArenaProps) {
  const [session, setSession] = useState<CardSession | null>(initialSession);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewOverride, setViewOverride] = useState<ViewState | null>(null);
  const storedView = useStoredCardView(session?.card.id);

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

  const viewState = useMemo(
    () =>
      session ? resolveViewState(session, viewOverride, storedView) : null,
    [session, viewOverride, storedView],
  );

  const activeMatchup = useMemo(() => {
    if (
      !session ||
      !viewState ||
      (viewState.view !== "fight" && viewState.view !== "intro")
    ) {
      return null;
    }
    return (
      session.matchups.find((row) => row.id === viewState.battleId) ?? null
    );
  }, [session, viewState]);

  const fightIndex = useMemo(() => {
    if (!session || !viewState?.battleId) return 0;
    const ordered = orderedMatchups(session.matchups);
    const idx = ordered.findIndex((row) => row.id === viewState.battleId);
    return idx >= 0 ? idx + 1 : 0;
  }, [session, viewState]);

  function setCardView(view: CardView, battleId: string | null) {
    if (!session) return;
    setViewOverride({
      cardId: session.card.id,
      view,
      battleId,
    });
    writeStoredView(session.card.id, view);
  }

  function enterFight() {
    if (!session || session.sessionComplete) return;
    const next = firstUnvoted(session.matchups);
    if (!next) {
      setCardView("poster", null);
      return;
    }
    setCardView("intro", next.id);
  }

  function enterVote() {
    if (!session || !activeMatchup || activeMatchup.hasVoted) return;
    setCardView("fight", activeMatchup.id);
  }

  function showPoster() {
    setCardView("poster", null);
  }

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
      const nextMatchups = session.matchups.map((row) =>
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
      );
      const complete =
        result.sessionComplete ?? nextMatchups.every((row) => row.hasVoted);
      const nextFight = firstUnvoted(nextMatchups);

      setSession({
        ...session,
        sessionComplete: complete,
        card: {
          ...session.card,
          votesUsed: result.votesUsed ?? session.card.votesUsed + 1,
          votesRemaining:
            result.votesRemaining ??
            Math.max(0, session.card.votesRemaining - 1),
        },
        matchups: nextMatchups,
      });

      if (complete || !nextFight) {
        setCardView("poster", null);
      } else {
        setCardView("intro", nextFight.id);
      }
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
    <div className={cn("space-y-6", className)}>
      <CardChrome session={session} error={error} />

      {viewState?.view === "poster" || !activeMatchup ? (
        <CardPoster session={session} onStart={enterFight} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-data text-[10px] tracking-[0.18em] text-silver">
              FIGHT {fightIndex} OF {session.card.matchupCount}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={showPoster}
            >
              See the card
            </Button>
          </div>
          {viewState.view === "intro" ? (
            <FightIntro
              key={activeMatchup.id}
              matchup={activeMatchup}
              fightIndex={fightIndex}
              matchupCount={session.card.matchupCount}
              onContinue={enterVote}
            />
          ) : (
            <FightRow
              key={activeMatchup.id}
              matchup={activeMatchup}
              busy={busy}
              onAllocate={onAllocate}
            />
          )}
        </div>
      )}
    </div>
  );
}
