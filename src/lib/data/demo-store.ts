import { INITIAL_ELO, type Tier } from "@/config/tiers";
import { getVotesToWin, isSeriesDecided, updateElo } from "@/lib/domain";
import { getSeasonBounds, getSeasonKey } from "@/lib/domain/seasons";

export type DemoCompany = {
  id: string;
  owner_id: string;
  name: string;
  pitch: string;
  website_url: string;
  logo_path: string | null;
  tier: Tier;
  preferred_billing_mode: "one_day" | "daily_renew";
  status: "draft" | "pending_review" | "approved" | "rejected" | "suspended";
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DemoPlacement = {
  id: string;
  company_id: string;
  tier: Tier;
  billing_mode: "one_day" | "daily_renew";
  status: "pending" | "active" | "expired" | "canceled";
  starts_at: string | null;
  ends_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
};

export type DemoSeason = {
  id: string;
  season_key: string;
  starts_at: string;
  ends_at: string;
};

export type DemoRating = {
  id: string;
  season_id: string;
  company_id: string;
  tier: Tier;
  elo: number;
  wins: number;
  losses: number;
};

export type DemoCard = {
  id: string;
  season_id: string;
  hour_key: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

export type DemoBattle = {
  id: string;
  season_id: string;
  card_id: string | null;
  card_slot: number | null;
  tier: Tier;
  company_a_id: string;
  company_b_id: string;
  status: "open" | "resolved" | "expired";
  visitor_id: string | null;
  expires_at: string;
  created_at: string;
  votes_a: number;
  votes_b: number;
  winner_id: string | null;
  loser_id: string | null;
  winner_elo_before: number | null;
  loser_elo_before: number | null;
  winner_elo_after: number | null;
  loser_elo_after: number | null;
};

export type DemoVote = {
  id: string;
  battle_id: string;
  winner_id: string;
  loser_id: string;
  visitor_id: string;
  created_at: string;
};

type DemoStore = {
  companies: Map<string, DemoCompany>;
  placements: Map<string, DemoPlacement>;
  seasons: Map<string, DemoSeason>;
  ratings: Map<string, DemoRating>;
  cards: Map<string, DemoCard>;
  battles: Map<string, DemoBattle>;
  votes: Map<string, DemoVote>;
  voteTimestampsByVisitor: Map<string, number[]>;
};

const globalForDemo = globalThis as unknown as {
  __pitchpitDemoStore?: DemoStore;
};

function createSeedStore(): DemoStore {
  const store: DemoStore = {
    companies: new Map(),
    placements: new Map(),
    seasons: new Map(),
    ratings: new Map(),
    cards: new Map(),
    battles: new Map(),
    votes: new Map(),
    voteTimestampsByVisitor: new Map(),
  };

  const now = new Date();
  const { startsAt, endsAt } = getSeasonBounds(now);
  const season: DemoSeason = {
    id: "demo-season",
    season_key: getSeasonKey(now),
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  };
  store.seasons.set(season.id, season);

  const seeds: Array<{
    id: string;
    name: string;
    tier: Tier;
    pitch?: string;
  }> = [
    {
      id: "11111111-1111-4111-8111-111111111101",
      name: "Gary",
      tier: "main_event",
      pitch: "I am Gary.",
    },
    {
      id: "11111111-1111-4111-8111-111111111102",
      name: "OmniAI",
      tier: "main_event",
      pitch: "The operating system for work.",
    },
    {
      id: "11111111-1111-4111-8111-111111111201",
      name: "Silverline Soft",
      tier: "undercard",
    },
    {
      id: "11111111-1111-4111-8111-111111111202",
      name: "Northwind Ops",
      tier: "undercard",
    },
    {
      id: "11111111-1111-4111-8111-111111111203",
      name: "Parcel Grid",
      tier: "undercard",
    },
    {
      id: "11111111-1111-4111-8111-111111111204",
      name: "Blueprint AI",
      tier: "undercard",
    },
    {
      id: "11111111-1111-4111-8111-111111111301",
      name: "Tiny Ticket",
      tier: "pit",
    },
    {
      id: "11111111-1111-4111-8111-111111111302",
      name: "Mugshot Coffee",
      tier: "pit",
    },
    {
      id: "11111111-1111-4111-8111-111111111303",
      name: "Lane Logistics",
      tier: "pit",
    },
    {
      id: "11111111-1111-4111-8111-111111111304",
      name: "Pixel Pantry",
      tier: "pit",
    },
    {
      id: "11111111-1111-4111-8111-111111111305",
      name: "Drift Tools",
      tier: "pit",
    },
    {
      id: "11111111-1111-4111-8111-111111111306",
      name: "Cobalt Cards",
      tier: "pit",
    },
  ];

  seeds.forEach((seed, index) => {
    const id = seed.id;
    const company: DemoCompany = {
      id,
      owner_id: "00000000-0000-4000-8000-000000000001",
      name: seed.name,
      pitch:
        seed.pitch ??
        `${seed.name} brings a sharp pitch to the ${seed.tier.replace("_", " ")}.`,
      website_url: `https://example.com/${seed.name.toLowerCase().replace(/\s+/g, "-")}`,
      logo_path: null,
      tier: seed.tier,
      preferred_billing_mode: "one_day",
      status: "approved",
      review_notes: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    store.companies.set(id, company);
    store.placements.set(`demo-placement-${index + 1}`, {
      id: `22222222-2222-4222-8222-${String(index + 1).padStart(12, "0")}`,
      company_id: id,
      tier: seed.tier,
      billing_mode: "one_day",
      status: "active",
      starts_at: now.toISOString(),
      ends_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      stripe_checkout_session_id: null,
      stripe_subscription_id: null,
      created_at: now.toISOString(),
    });
    store.ratings.set(`${season.id}:${id}`, {
      id: `33333333-3333-4333-8333-${String(index + 1).padStart(12, "0")}`,
      season_id: season.id,
      company_id: id,
      tier: seed.tier,
      elo: INITIAL_ELO + (seeds.length - index) * 12,
      wins: 0,
      losses: 0,
    });
  });

  return store;
}

export function getDemoStore(): DemoStore {
  if (!globalForDemo.__pitchpitDemoStore) {
    globalForDemo.__pitchpitDemoStore = createSeedStore();
  }
  return globalForDemo.__pitchpitDemoStore;
}

export function demoEnsureSeason(now = new Date()): DemoSeason {
  const store = getDemoStore();
  const key = getSeasonKey(now);
  for (const season of store.seasons.values()) {
    if (season.season_key === key) {
      return season;
    }
  }
  const { startsAt, endsAt } = getSeasonBounds(now);
  const season: DemoSeason = {
    id: crypto.randomUUID(),
    season_key: key,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  };
  store.seasons.set(season.id, season);

  for (const placement of store.placements.values()) {
    if (placement.status !== "active") continue;
    const company = store.companies.get(placement.company_id);
    if (!company || company.status !== "approved") continue;
    const ratingKey = `${season.id}:${company.id}`;
    if (!store.ratings.has(ratingKey)) {
      store.ratings.set(ratingKey, {
        id: crypto.randomUUID(),
        season_id: season.id,
        company_id: company.id,
        tier: company.tier,
        elo: INITIAL_ELO,
        wins: 0,
        losses: 0,
      });
    }
  }

  return season;
}

export function demoActiveCompaniesByTier(tier: Tier): DemoCompany[] {
  const store = getDemoStore();
  const now = Date.now();
  const ids = new Set<string>();
  for (const placement of store.placements.values()) {
    if (placement.status !== "active" || placement.tier !== tier) continue;
    if (placement.ends_at && new Date(placement.ends_at).getTime() <= now)
      continue;
    ids.add(placement.company_id);
  }
  return [...ids]
    .map((id) => store.companies.get(id))
    .filter(
      (c): c is DemoCompany =>
        !!c && c.status === "approved" && c.tier === tier,
    );
}

export function demoGetBattle(battleId: string): DemoBattle | undefined {
  return getDemoStore().battles.get(battleId);
}

export function demoGetCard(cardId: string): DemoCard | undefined {
  return getDemoStore().cards.get(cardId);
}

export function demoCardByHourKey(hourKey: string): DemoCard | undefined {
  for (const card of getDemoStore().cards.values()) {
    if (card.hour_key === hourKey) return card;
  }
  return undefined;
}

export function demoFightCounts(seasonId: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const battle of getDemoStore().battles.values()) {
    if (battle.season_id !== seasonId) continue;
    counts.set(battle.company_a_id, (counts.get(battle.company_a_id) ?? 0) + 1);
    counts.set(battle.company_b_id, (counts.get(battle.company_b_id) ?? 0) + 1);
  }
  return counts;
}

export function demoBattlesForCard(cardId: string): DemoBattle[] {
  return [...getDemoStore().battles.values()]
    .filter((battle) => battle.card_id === cardId)
    .sort((a, b) => (a.card_slot ?? 0) - (b.card_slot ?? 0));
}

export function demoVisitorVotedBattleIds(
  cardId: string,
  visitorId: string,
): string[] {
  const battleIds = new Set(
    demoBattlesForCard(cardId).map((battle) => battle.id),
  );
  const voted: string[] = [];
  for (const vote of getDemoStore().votes.values()) {
    if (vote.visitor_id === visitorId && battleIds.has(vote.battle_id)) {
      voted.push(vote.battle_id);
    }
  }
  return voted;
}

export function demoCastVote(params: {
  battleId: string;
  winnerId: string;
  visitorId: string;
}) {
  const store = getDemoStore();
  const battle = store.battles.get(params.battleId);
  if (!battle) {
    throw new Error("battle_not_found");
  }
  if (battle.status !== "open") {
    throw new Error("battle_not_open");
  }
  if (new Date(battle.expires_at).getTime() < Date.now()) {
    battle.status = "expired";
    throw new Error("battle_expired");
  }
  if (
    params.winnerId !== battle.company_a_id &&
    params.winnerId !== battle.company_b_id
  ) {
    throw new Error("invalid_winner");
  }
  if (
    [...store.votes.values()].some(
      (v) => v.battle_id === battle.id && v.visitor_id === params.visitorId,
    )
  ) {
    throw new Error("already_voted");
  }

  const ballotLoserId =
    params.winnerId === battle.company_a_id
      ? battle.company_b_id
      : battle.company_a_id;

  if (params.winnerId === battle.company_a_id) {
    battle.votes_a += 1;
  } else {
    battle.votes_b += 1;
  }

  const vote: DemoVote = {
    id: crypto.randomUUID(),
    battle_id: battle.id,
    winner_id: params.winnerId,
    loser_id: ballotLoserId,
    visitor_id: params.visitorId,
    created_at: new Date().toISOString(),
  };
  store.votes.set(vote.id, vote);

  const stamps = store.voteTimestampsByVisitor.get(params.visitorId) ?? [];
  stamps.push(Date.now());
  store.voteTimestampsByVisitor.set(params.visitorId, stamps);

  const votesToWin = getVotesToWin(battle.tier);

  if (!isSeriesDecided(battle.votes_a, battle.votes_b, battle.tier)) {
    return {
      status: "open" as const,
      votesA: battle.votes_a,
      votesB: battle.votes_b,
      votesToWin,
      myWinnerId: params.winnerId,
      winnerId: null,
      loserId: null,
    };
  }

  const seriesWinnerId =
    battle.votes_a >= votesToWin ? battle.company_a_id : battle.company_b_id;
  const seriesLoserId =
    seriesWinnerId === battle.company_a_id
      ? battle.company_b_id
      : battle.company_a_id;

  const winnerRating = store.ratings.get(
    `${battle.season_id}:${seriesWinnerId}`,
  );
  const loserRating = store.ratings.get(`${battle.season_id}:${seriesLoserId}`);
  if (!winnerRating || !loserRating) {
    throw new Error("rating_missing");
  }

  const winnerEloBefore = winnerRating.elo;
  const loserEloBefore = loserRating.elo;
  const next = updateElo(winnerRating.elo, loserRating.elo);
  winnerRating.elo = next.winner;
  winnerRating.wins += 1;
  loserRating.elo = next.loser;
  loserRating.losses += 1;

  battle.status = "resolved";
  battle.winner_id = seriesWinnerId;
  battle.loser_id = seriesLoserId;
  battle.winner_elo_before = winnerEloBefore;
  battle.loser_elo_before = loserEloBefore;
  battle.winner_elo_after = next.winner;
  battle.loser_elo_after = next.loser;

  return {
    status: "resolved" as const,
    votesA: battle.votes_a,
    votesB: battle.votes_b,
    votesToWin,
    myWinnerId: params.winnerId,
    winnerId: seriesWinnerId,
    loserId: seriesLoserId,
    winnerEloBefore,
    loserEloBefore,
    winnerEloAfter: next.winner,
    loserEloAfter: next.loser,
  };
}

export function demoSoftRateLimited(
  visitorId: string,
  limit = 6,
  windowMs = 60 * 60 * 1000,
) {
  const store = getDemoStore();
  const now = Date.now();
  const stamps = (store.voteTimestampsByVisitor.get(visitorId) ?? []).filter(
    (t) => now - t < windowMs,
  );
  store.voteTimestampsByVisitor.set(visitorId, stamps);
  return stamps.length >= limit;
}
