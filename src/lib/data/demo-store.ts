import { ELO_K, INITIAL_ELO, type Tier } from "@/config/tiers";
import {
  buildCardMatchups,
  getCardHour,
  getCardPhase,
  getVoteBudget,
  isValidAllocation,
  updateEloFromShare,
  type CardFighter,
} from "@/lib/domain";
import { getSeasonBounds, getSeasonKey } from "@/lib/domain/seasons";

export type DemoCompany = {
  id: string;
  owner_id: string | null;
  name: string;
  pitch: string;
  website_url: string;
  logo_path: string | null;
  click_count: number;
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
  grace_ends_at: string;
  status: "open" | "resolved";
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
  points_a: number;
  points_b: number;
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
  visitorOpenedCards: Map<string, Set<string>>;
  clicks: Map<string, number>;
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
    visitorOpenedCards: new Map(),
    clicks: new Map(),
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
      click_count: 0,
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

  seedResolvedHistoryCard(store, season, now);
  return store;
}

function fightersFromCompanies(companies: DemoCompany[]): CardFighter[] {
  return companies.map((company) => ({ id: company.id, fightCount: 0 }));
}

function seedResolvedHistoryCard(
  store: DemoStore,
  season: DemoSeason,
  now: Date,
) {
  const previous = getCardHour(new Date(now.getTime() - 60 * 60 * 1000));
  const card: DemoCard = {
    id: "44444444-4444-4444-8444-000000000001",
    season_id: season.id,
    hour_key: previous.hourKey,
    starts_at: previous.startsAt.toISOString(),
    ends_at: previous.endsAt.toISOString(),
    grace_ends_at: previous.graceEndsAt.toISOString(),
    status: "resolved",
    created_at: previous.startsAt.toISOString(),
  };
  store.cards.set(card.id, card);

  const byTier = {
    pit: fightersFromCompanies(
      [...store.companies.values()].filter((c) => c.tier === "pit"),
    ),
    undercard: fightersFromCompanies(
      [...store.companies.values()].filter((c) => c.tier === "undercard"),
    ),
    main_event: fightersFromCompanies(
      [...store.companies.values()].filter((c) => c.tier === "main_event"),
    ),
  };
  const matchups = buildCardMatchups(byTier);

  matchups.forEach((matchup, index) => {
    const budget = getVoteBudget(matchup.tier);
    const pointsA = budget - (index % 2);
    const pointsB = budget - pointsA;
    const winnerId =
      pointsA >= pointsB ? matchup.companyAId : matchup.companyBId;
    const loserId =
      winnerId === matchup.companyAId ? matchup.companyBId : matchup.companyAId;
    const ratingA = store.ratings.get(`${season.id}:${matchup.companyAId}`);
    const ratingB = store.ratings.get(`${season.id}:${matchup.companyBId}`);
    const share = pointsA / (pointsA + pointsB);
    const next =
      ratingA && ratingB
        ? updateEloFromShare(ratingA.elo, ratingB.elo, share, ELO_K)
        : null;
    const winnerBefore =
      winnerId === matchup.companyAId
        ? (ratingA?.elo ?? null)
        : (ratingB?.elo ?? null);
    const loserBefore =
      winnerId === matchup.companyAId
        ? (ratingB?.elo ?? null)
        : (ratingA?.elo ?? null);

    if (ratingA && ratingB && next) {
      ratingA.elo = next.ratingA;
      ratingB.elo = next.ratingB;
      if (pointsA > pointsB) {
        ratingA.wins += 1;
        ratingB.losses += 1;
      } else if (pointsB > pointsA) {
        ratingB.wins += 1;
        ratingA.losses += 1;
      }
    }

    const battleId = `55555555-5555-4555-8555-${String(index + 1).padStart(12, "0")}`;
    store.battles.set(battleId, {
      id: battleId,
      season_id: season.id,
      card_id: card.id,
      card_slot: matchup.slot,
      tier: matchup.tier,
      company_a_id: matchup.companyAId,
      company_b_id: matchup.companyBId,
      status: "resolved",
      visitor_id: null,
      expires_at: card.grace_ends_at,
      created_at: card.starts_at,
      votes_a: pointsA * 4,
      votes_b: pointsB * 4,
      winner_id: winnerId,
      loser_id: loserId,
      winner_elo_before: winnerBefore,
      loser_elo_before: loserBefore,
      winner_elo_after:
        winnerId === matchup.companyAId
          ? (next?.ratingA ?? null)
          : (next?.ratingB ?? null),
      loser_elo_after:
        winnerId === matchup.companyAId
          ? (next?.ratingB ?? null)
          : (next?.ratingA ?? null),
    });
  });
}

export function getDemoStore(): DemoStore {
  if (!globalForDemo.__pitchpitDemoStore) {
    globalForDemo.__pitchpitDemoStore = createSeedStore();
  }
  const store = globalForDemo.__pitchpitDemoStore;
  if (!store.clicks) store.clicks = new Map();
  return store;
}

export function incrementDemoCompanyClick(id: string): number {
  const store = getDemoStore();
  const company = store.companies.get(id);
  if (company) {
    company.click_count = (company.click_count ?? 0) + 1;
    return company.click_count;
  }
  const next = (store.clicks.get(id) ?? 0) + 1;
  store.clicks.set(id, next);
  return next;
}

export function demoClickCount(id: string): number {
  const store = getDemoStore();
  return store.companies.get(id)?.click_count ?? store.clicks.get(id) ?? 0;
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

export function demoMarkCardOpened(cardId: string, visitorId: string) {
  const store = getDemoStore();
  let opened = store.visitorOpenedCards.get(visitorId);
  if (!opened) {
    opened = new Set();
    store.visitorOpenedCards.set(visitorId, opened);
  }
  opened.add(cardId);
}

export function demoVisitorOpenedCard(
  cardId: string,
  visitorId: string,
): boolean {
  return Boolean(getDemoStore().visitorOpenedCards.get(visitorId)?.has(cardId));
}

export function demoVisitorAllocation(
  battleId: string,
  visitorId: string,
): { pointsA: number; pointsB: number; winnerId: string } | null {
  for (const vote of getDemoStore().votes.values()) {
    if (vote.battle_id === battleId && vote.visitor_id === visitorId) {
      return {
        pointsA: vote.points_a,
        pointsB: vote.points_b,
        winnerId: vote.winner_id,
      };
    }
  }
  return null;
}

function demoCardAcceptsVotes(
  card: DemoCard,
  visitorId: string,
  now = new Date(),
) {
  if (card.status === "resolved") return false;
  const phase = getCardPhase(card.ends_at, card.grace_ends_at, now);
  if (phase === "closed") return false;
  if (phase === "open") return true;
  return demoVisitorOpenedCard(card.id, visitorId);
}

export function demoResolveBattle(battle: DemoBattle) {
  const store = getDemoStore();
  if (battle.status !== "open") return;

  const total = battle.votes_a + battle.votes_b;
  if (total <= 0) {
    battle.status = "expired";
    return;
  }

  const ratingA = store.ratings.get(
    `${battle.season_id}:${battle.company_a_id}`,
  );
  const ratingB = store.ratings.get(
    `${battle.season_id}:${battle.company_b_id}`,
  );
  if (!ratingA || !ratingB) {
    throw new Error("rating_missing");
  }

  const winnerEloBeforeA = ratingA.elo;
  const winnerEloBeforeB = ratingB.elo;
  const share = battle.votes_a / total;
  const next = updateEloFromShare(ratingA.elo, ratingB.elo, share, ELO_K);
  ratingA.elo = next.ratingA;
  ratingB.elo = next.ratingB;

  if (battle.votes_a > battle.votes_b) {
    ratingA.wins += 1;
    ratingB.losses += 1;
    battle.winner_id = battle.company_a_id;
    battle.loser_id = battle.company_b_id;
    battle.winner_elo_before = winnerEloBeforeA;
    battle.loser_elo_before = winnerEloBeforeB;
    battle.winner_elo_after = next.ratingA;
    battle.loser_elo_after = next.ratingB;
  } else if (battle.votes_b > battle.votes_a) {
    ratingB.wins += 1;
    ratingA.losses += 1;
    battle.winner_id = battle.company_b_id;
    battle.loser_id = battle.company_a_id;
    battle.winner_elo_before = winnerEloBeforeB;
    battle.loser_elo_before = winnerEloBeforeA;
    battle.winner_elo_after = next.ratingB;
    battle.loser_elo_after = next.ratingA;
  } else {
    battle.winner_id = null;
    battle.loser_id = null;
    battle.winner_elo_before = winnerEloBeforeA;
    battle.loser_elo_before = winnerEloBeforeB;
    battle.winner_elo_after = next.ratingA;
    battle.loser_elo_after = next.ratingB;
  }

  battle.status = "resolved";
}

export function demoResolveCard(card: DemoCard) {
  if (card.status === "resolved") return;
  for (const battle of demoBattlesForCard(card.id)) {
    demoResolveBattle(battle);
  }
  card.status = "resolved";
}

export function demoResolveExpiredCards(now = new Date()) {
  for (const card of getDemoStore().cards.values()) {
    if (card.status === "resolved") continue;
    if (getCardPhase(card.ends_at, card.grace_ends_at, now) !== "closed") {
      continue;
    }
    demoResolveCard(card);
  }
}

export function demoAllocateVote(params: {
  battleId: string;
  pointsA: number;
  pointsB: number;
  visitorId: string;
}) {
  const store = getDemoStore();
  demoResolveExpiredCards();
  const battle = store.battles.get(params.battleId);
  if (!battle) {
    throw new Error("battle_not_found");
  }
  if (battle.status !== "open") {
    throw new Error("battle_not_open");
  }
  if (!battle.card_id) {
    throw new Error("battle_not_open");
  }
  const card = store.cards.get(battle.card_id);
  if (!card || !demoCardAcceptsVotes(card, params.visitorId)) {
    throw new Error("card_closed");
  }

  const budget = getVoteBudget(battle.tier);
  if (!isValidAllocation(params.pointsA, params.pointsB, budget)) {
    throw new Error("invalid_allocation");
  }
  if (demoVisitorAllocation(battle.id, params.visitorId)) {
    throw new Error("already_voted");
  }

  const voted = demoVisitorVotedBattleIds(card.id, params.visitorId);
  if (voted.length >= demoBattlesForCard(card.id).length) {
    throw new Error("rate_limited");
  }

  const winnerId =
    params.pointsA >= params.pointsB
      ? battle.company_a_id
      : battle.company_b_id;
  const loserId =
    winnerId === battle.company_a_id
      ? battle.company_b_id
      : battle.company_a_id;

  battle.votes_a += params.pointsA;
  battle.votes_b += params.pointsB;

  const vote: DemoVote = {
    id: crypto.randomUUID(),
    battle_id: battle.id,
    winner_id: winnerId,
    loser_id: loserId,
    visitor_id: params.visitorId,
    points_a: params.pointsA,
    points_b: params.pointsB,
    created_at: new Date().toISOString(),
  };
  store.votes.set(vote.id, vote);
  demoMarkCardOpened(card.id, params.visitorId);

  return {
    status: battle.status,
    votesA: battle.votes_a,
    votesB: battle.votes_b,
    voteBudget: budget,
    myPointsA: params.pointsA,
    myPointsB: params.pointsB,
    myWinnerId: winnerId,
  };
}

export function demoListCards() {
  demoResolveExpiredCards();
  return [...getDemoStore().cards.values()]
    .filter(
      (card) =>
        card.status === "resolved" ||
        getCardPhase(card.ends_at, card.grace_ends_at) === "closed",
    )
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
}
