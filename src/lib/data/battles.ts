import { ELO_K, type Tier } from "@/config/tiers";
import {
  demoActiveCompaniesByTier,
  demoAllocateVote,
  demoBattlesForCard,
  demoCardByHourKey,
  demoEnsureSeason,
  demoFightCounts,
  demoGetBattle,
  demoGetCard,
  demoListCards,
  demoMarkCardOpened,
  demoResolveExpiredCards,
  demoVisitorAllocation,
  demoVisitorOpenedCard,
  demoVisitorVotedBattleIds,
  getDemoStore,
  type DemoBattle,
  type DemoCard,
  type DemoCompany,
} from "@/lib/data/demo-store";
import { ensureCurrentSeason } from "@/lib/data/seasons";
import { isDemoMode, tryGetAdminClient } from "@/lib/demo-mode";
import {
  buildCardMatchups,
  getCardHour,
  getCardPhase,
  getVoteBudget,
  isCardComplete,
  votesRemaining,
  type CardFighter,
  type CardMeta,
  type CardPhase,
} from "@/lib/domain";

export type BattleCompany = {
  id: string;
  name: string;
  pitch: string;
  website_url: string;
  logo_path: string | null;
  tier: Tier;
  elo?: number;
  wins?: number;
  losses?: number;
  rank?: number;
};

export type BattleStatus = "open" | "resolved" | "expired";

export type BattleBody = {
  id: string;
  slot: number;
  tier: Tier;
  seasonId: string;
  expiresAt: string;
  companyAId: string;
  companyBId: string;
  status: BattleStatus;
  votesA: number;
  votesB: number;
  voteBudget: number;
  winnerId?: string | null;
  loserId?: string | null;
  winnerEloBefore?: number | null;
  loserEloBefore?: number | null;
  winnerEloAfter?: number | null;
  loserEloAfter?: number | null;
};

export type CardMatchupPayload = {
  battle: BattleBody;
  companies: [BattleCompany, BattleCompany];
  hasVoted: boolean;
  myPointsA: number | null;
  myPointsB: number | null;
  myWinnerId: string | null;
};

export type CardSessionPayload = {
  sessionComplete: boolean;
  servingGrace: boolean;
  card: CardMeta;
  matchups: CardMatchupPayload[];
};

export type VoteResult = {
  status: BattleStatus;
  votesA: number;
  votesB: number;
  voteBudget: number;
  myPointsA: number;
  myPointsB: number;
  myWinnerId: string;
  votesUsed: number;
  votesRemaining: number;
  sessionComplete: boolean;
  servingGrace: boolean;
  nextCardAt: string;
  graceEndsAt: string;
  phase: CardPhase;
};

export type CardHistoryCompany = {
  id: string;
  name: string;
  logo_path: string | null;
};

export type CardHistoryMatchup = {
  id: string;
  slot: number;
  tier: Tier;
  companyA: CardHistoryCompany;
  companyB: CardHistoryCompany;
  pointsA: number;
  pointsB: number;
  winnerId: string | null;
};

export type CardHistoryItem = {
  id: string;
  hourKey: string;
  startsAt: string;
  endsAt: string;
  matchups: CardHistoryMatchup[];
};

function ratingRank(
  seasonId: string,
  companyId: string,
  tier: Tier,
): { elo: number; wins: number; losses: number; rank: number } | null {
  const store = getDemoStore();
  const rating = store.ratings.get(`${seasonId}:${companyId}`);
  if (!rating) return null;
  const peers = [...store.ratings.values()]
    .filter((row) => row.season_id === seasonId && row.tier === tier)
    .sort((a, b) => b.elo - a.elo);
  return {
    elo: rating.elo,
    wins: rating.wins,
    losses: rating.losses,
    rank: peers.findIndex((row) => row.company_id === companyId) + 1,
  };
}

function toBattleCompany(
  company: DemoCompany,
  seasonId: string,
): BattleCompany {
  const stats = ratingRank(seasonId, company.id, company.tier);
  return {
    id: company.id,
    name: company.name,
    pitch: company.pitch,
    website_url: company.website_url,
    logo_path: company.logo_path,
    tier: company.tier,
    elo: stats?.elo,
    wins: stats?.wins,
    losses: stats?.losses,
    rank: stats?.rank,
  };
}

function cardMetaFrom(
  card: {
    id: string;
    hour_key: string;
    starts_at: string;
    ends_at: string;
    grace_ends_at: string;
  },
  matchupCount: number,
  votesUsed: number,
): CardMeta {
  return {
    id: card.id,
    hourKey: card.hour_key,
    startsAt: card.starts_at,
    endsAt: card.ends_at,
    graceEndsAt: card.grace_ends_at,
    phase: getCardPhase(card.ends_at, card.grace_ends_at),
    matchupCount,
    votesUsed,
    votesRemaining: votesRemaining(votesUsed, matchupCount),
  };
}

function fightersForTier(
  companies: { id: string }[],
  counts: Map<string, number>,
): CardFighter[] {
  return companies.map((company) => ({
    id: company.id,
    fightCount: counts.get(company.id) ?? 0,
  }));
}

function toBattleBody(battle: {
  id: string;
  card_slot?: number | null;
  tier: Tier;
  season_id: string;
  expires_at: string;
  company_a_id: string;
  company_b_id: string;
  status: BattleStatus;
  votes_a?: number;
  votes_b?: number;
  winner_id?: string | null;
  loser_id?: string | null;
  winner_elo_before?: number | null;
  loser_elo_before?: number | null;
  winner_elo_after?: number | null;
  loser_elo_after?: number | null;
}): BattleBody {
  return {
    id: battle.id,
    slot: battle.card_slot ?? 0,
    tier: battle.tier,
    seasonId: battle.season_id,
    expiresAt: battle.expires_at,
    companyAId: battle.company_a_id,
    companyBId: battle.company_b_id,
    status: battle.status,
    votesA: battle.votes_a ?? 0,
    votesB: battle.votes_b ?? 0,
    voteBudget: getVoteBudget(battle.tier),
    winnerId: battle.winner_id ?? null,
    loserId: battle.loser_id ?? null,
    winnerEloBefore: battle.winner_elo_before ?? null,
    loserEloBefore: battle.loser_elo_before ?? null,
    winnerEloAfter: battle.winner_elo_after ?? null,
    loserEloAfter: battle.loser_elo_after ?? null,
  };
}

function previousHourKey(hourKey: string): string {
  return String(Number(hourKey) - 1);
}

function ensureDemoCard(hour = getCardHour(new Date())): DemoCard {
  const season = demoEnsureSeason();
  const existing = demoCardByHourKey(hour.hourKey);
  if (existing) return existing;

  const store = getDemoStore();
  const card: DemoCard = {
    id: crypto.randomUUID(),
    season_id: season.id,
    hour_key: hour.hourKey,
    starts_at: hour.startsAt.toISOString(),
    ends_at: hour.endsAt.toISOString(),
    grace_ends_at: hour.graceEndsAt.toISOString(),
    status: "open",
    created_at: new Date().toISOString(),
  };
  store.cards.set(card.id, card);

  const counts = demoFightCounts(season.id);
  const matchups = buildCardMatchups({
    pit: fightersForTier(demoActiveCompaniesByTier("pit"), counts),
    undercard: fightersForTier(demoActiveCompaniesByTier("undercard"), counts),
    main_event: fightersForTier(
      demoActiveCompaniesByTier("main_event"),
      counts,
    ),
  });

  for (const matchup of matchups) {
    const id = crypto.randomUUID();
    store.battles.set(id, {
      id,
      season_id: season.id,
      card_id: card.id,
      card_slot: matchup.slot,
      tier: matchup.tier,
      company_a_id: matchup.companyAId,
      company_b_id: matchup.companyBId,
      status: "open",
      visitor_id: null,
      expires_at: card.grace_ends_at,
      created_at: new Date().toISOString(),
      votes_a: 0,
      votes_b: 0,
      winner_id: null,
      loser_id: null,
      winner_elo_before: null,
      loser_elo_before: null,
      winner_elo_after: null,
      loser_elo_after: null,
    });
  }

  return card;
}

function demoMatchupPayload(
  battle: DemoBattle,
  visitorId: string,
): CardMatchupPayload {
  const store = getDemoStore();
  const companyA = store.companies.get(battle.company_a_id)!;
  const companyB = store.companies.get(battle.company_b_id)!;
  const mine = demoVisitorAllocation(battle.id, visitorId);
  return {
    battle: toBattleBody(battle),
    companies: [
      toBattleCompany(companyA, battle.season_id),
      toBattleCompany(companyB, battle.season_id),
    ],
    hasVoted: mine != null,
    myPointsA: mine?.pointsA ?? null,
    myPointsB: mine?.pointsB ?? null,
    myWinnerId: mine?.winnerId ?? null,
  };
}

function demoSessionFromCard(
  card: DemoCard,
  visitorId: string,
  servingGrace: boolean,
): CardSessionPayload {
  const battles = demoBattlesForCard(card.id);
  if (battles.length === 0) {
    throw new Error("no_eligible_companies");
  }
  const votedIds = demoVisitorVotedBattleIds(card.id, visitorId);
  return {
    sessionComplete: isCardComplete(votedIds.length, battles.length),
    servingGrace,
    card: cardMetaFrom(card, battles.length, votedIds.length),
    matchups: battles.map((battle) => demoMatchupPayload(battle, visitorId)),
  };
}

function pickDemoServingCard(visitorId: string): {
  card: DemoCard;
  servingGrace: boolean;
} {
  demoResolveExpiredCards();
  const hour = getCardHour(new Date());
  const current = ensureDemoCard(hour);
  const previous = demoCardByHourKey(previousHourKey(hour.hourKey));
  if (
    previous &&
    previous.status !== "resolved" &&
    getCardPhase(previous.ends_at, previous.grace_ends_at) === "grace" &&
    demoVisitorOpenedCard(previous.id, visitorId)
  ) {
    const battles = demoBattlesForCard(previous.id);
    const voted = demoVisitorVotedBattleIds(previous.id, visitorId);
    if (!isCardComplete(voted.length, battles.length)) {
      return { card: previous, servingGrace: true };
    }
  }

  demoMarkCardOpened(current.id, visitorId);
  return { card: current, servingGrace: false };
}

function demoCardSession(visitorId: string): CardSessionPayload {
  const { card, servingGrace } = pickDemoServingCard(visitorId);
  return demoSessionFromCard(card, visitorId, servingGrace);
}

export async function getCardSession(
  visitorId: string,
): Promise<CardSessionPayload> {
  const adminClient = await tryGetAdminClient();
  if (isDemoMode() || !adminClient) {
    return demoCardSession(visitorId);
  }

  const season = await ensureCurrentSeason();
  const admin = adminClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  await resolveExpiredDbCards(db);

  const pools = await loadActivePools(db);
  const available = (Object.keys(pools) as Tier[]).filter(
    (tier) => pools[tier].length >= 2,
  );
  if (available.length === 0) {
    throw new Error("no_eligible_companies");
  }

  const hour = getCardHour(new Date());
  const current = await ensureDbCard(db, season.id, hour, pools);
  const previous = await loadCardByHourKey(db, previousHourKey(hour.hourKey));
  let serving = current;
  let servingGrace = false;

  if (previous) {
    const prevPhase = getCardPhase(previous.ends_at, previous.grace_ends_at);
    const opened = await visitorOpenedDbCard(db, previous.id, visitorId);
    if (previous.status !== "resolved" && prevPhase === "grace" && opened) {
      const battles = await loadCardBattles(db, previous.id);
      const votedIds = await loadVotedBattleIds(db, battles, visitorId);
      if (!isCardComplete(votedIds.length, battles.length)) {
        serving = previous;
        servingGrace = true;
      }
    }
  }

  if (!servingGrace) {
    await markDbCardOpened(db, serving.id, visitorId);
  }

  return hydrateDbCardSession(db, serving, pools, visitorId, servingGrace);
}

type DbCard = {
  id: string;
  hour_key: string;
  starts_at: string;
  ends_at: string;
  grace_ends_at: string;
  status?: string;
};

type DbBattle = {
  id: string;
  season_id: string;
  card_id?: string | null;
  card_slot?: number | null;
  tier: Tier;
  company_a_id: string;
  company_b_id: string;
  status: BattleStatus;
  expires_at: string;
  created_at?: string;
  votes_a?: number;
  votes_b?: number;
  winner_id?: string | null;
  loser_id?: string | null;
  winner_elo_before?: number | null;
  loser_elo_before?: number | null;
  winner_elo_after?: number | null;
  loser_elo_after?: number | null;
};

async function loadActivePools(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<Record<Tier, BattleCompany[]>> {
  const nowIso = new Date().toISOString();
  const { data: placements, error } = await db
    .from("placements")
    .select(
      "company_id, tier, companies!inner(id, name, pitch, website_url, logo_path, tier, status)",
    )
    .eq("status", "active")
    .gt("ends_at", nowIso);

  if (error) throw new Error(error.message);

  const byTier: Record<Tier, BattleCompany[]> = {
    pit: [],
    undercard: [],
    main_event: [],
  };

  for (const row of placements ?? []) {
    const company = Array.isArray(row.companies)
      ? row.companies[0]
      : row.companies;
    if (!company || company.status !== "approved") continue;
    const tier = (row.tier || company.tier) as Tier;
    byTier[tier].push({
      id: company.id,
      name: company.name,
      pitch: company.pitch,
      website_url: company.website_url,
      logo_path: company.logo_path,
      tier,
    });
  }

  return byTier;
}

async function ensureDbCard(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  seasonId: string,
  hour: ReturnType<typeof getCardHour>,
  pools: Record<Tier, BattleCompany[]>,
): Promise<DbCard> {
  await db.from("cards").upsert(
    {
      season_id: seasonId,
      hour_key: hour.hourKey,
      starts_at: hour.startsAt.toISOString(),
      ends_at: hour.endsAt.toISOString(),
      grace_ends_at: hour.graceEndsAt.toISOString(),
      status: "open",
    },
    { onConflict: "hour_key", ignoreDuplicates: true },
  );

  const { data: card, error } = await db
    .from("cards")
    .select("id, hour_key, starts_at, ends_at, grace_ends_at, status")
    .eq("hour_key", hour.hourKey)
    .single();

  if (error || !card) throw new Error(error?.message ?? "card_failed");

  const existing = await loadCardBattles(db, card.id);
  if (existing.length > 0) return card as DbCard;

  const { data: seasonBattles } = await db
    .from("battles")
    .select("company_a_id, company_b_id")
    .eq("season_id", seasonId);

  const counts = new Map<string, number>();
  for (const row of seasonBattles ?? []) {
    counts.set(row.company_a_id, (counts.get(row.company_a_id) ?? 0) + 1);
    counts.set(row.company_b_id, (counts.get(row.company_b_id) ?? 0) + 1);
  }

  const matchups = buildCardMatchups({
    pit: fightersForTier(pools.pit, counts),
    undercard: fightersForTier(pools.undercard, counts),
    main_event: fightersForTier(pools.main_event, counts),
  });

  const companyIds = [
    ...new Set(
      matchups.flatMap((matchup) => [matchup.companyAId, matchup.companyBId]),
    ),
  ];
  if (companyIds.length > 0) {
    await db.from("company_ratings").upsert(
      companyIds.map((companyId) => {
        const tier =
          matchups.find(
            (matchup) =>
              matchup.companyAId === companyId ||
              matchup.companyBId === companyId,
          )?.tier ?? "pit";
        return {
          season_id: seasonId,
          company_id: companyId,
          tier,
          elo: 1500,
        };
      }),
      { onConflict: "season_id,company_id", ignoreDuplicates: true },
    );
  }

  if (matchups.length > 0) {
    const { error: insertError } = await db.from("battles").insert(
      matchups.map((matchup) => ({
        season_id: seasonId,
        card_id: card.id,
        card_slot: matchup.slot,
        tier: matchup.tier,
        company_a_id: matchup.companyAId,
        company_b_id: matchup.companyBId,
        status: "open",
        visitor_id: null,
        expires_at: card.grace_ends_at,
        votes_a: 0,
        votes_b: 0,
      })),
    );
    if (insertError && !/duplicate|unique/i.test(insertError.message ?? "")) {
      throw new Error(insertError.message);
    }
  }

  return card as DbCard;
}

async function loadCardByHourKey(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  hourKey: string,
): Promise<DbCard | null> {
  const { data } = await db
    .from("cards")
    .select("id, hour_key, starts_at, ends_at, grace_ends_at, status")
    .eq("hour_key", hourKey)
    .maybeSingle();
  return (data as DbCard | null) ?? null;
}

async function loadCardBattles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  cardId: string,
): Promise<DbBattle[]> {
  const { data } = await db
    .from("battles")
    .select("*")
    .eq("card_id", cardId)
    .order("card_slot", { ascending: true });
  return (data ?? []) as DbBattle[];
}

async function loadVotedBattleIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  battles: DbBattle[],
  visitorId: string,
): Promise<string[]> {
  if (battles.length === 0) return [];
  const { data } = await db
    .from("votes")
    .select("battle_id")
    .eq("visitor_id", visitorId)
    .in(
      "battle_id",
      battles.map((battle) => battle.id),
    );
  return ((data ?? []) as Array<{ battle_id: string }>).map(
    (row) => row.battle_id,
  );
}

async function markDbCardOpened(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  cardId: string,
  visitorId: string,
) {
  await db
    .from("visitor_card_opens")
    .upsert(
      { visitor_id: visitorId, card_id: cardId },
      { onConflict: "visitor_id,card_id", ignoreDuplicates: true },
    );
}

async function visitorOpenedDbCard(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  cardId: string,
  visitorId: string,
): Promise<boolean> {
  const { data } = await db
    .from("visitor_card_opens")
    .select("card_id")
    .eq("card_id", cardId)
    .eq("visitor_id", visitorId)
    .maybeSingle();
  return Boolean(data);
}

async function resolveExpiredDbCards(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
) {
  const { data: due } = await db
    .from("cards")
    .select("id")
    .eq("status", "open")
    .lte("grace_ends_at", new Date().toISOString());
  for (const row of due ?? []) {
    const { error } = await db.rpc("resolve_card", {
      p_card_id: row.id,
      p_k: ELO_K,
    });
    if (error && !/already|resolved/i.test(error.message ?? "")) {
      throw new Error(error.message);
    }
  }
}

async function hydrateDbCardSession(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  card: DbCard,
  pools: Record<Tier, BattleCompany[]>,
  visitorId: string,
  servingGrace: boolean,
): Promise<CardSessionPayload> {
  const battles = await loadCardBattles(db, card.id);
  if (battles.length === 0) {
    throw new Error("no_eligible_companies");
  }

  const companyIds = [
    ...new Set(
      battles.flatMap((battle) => [battle.company_a_id, battle.company_b_id]),
    ),
  ];
  const { data: companies } = await db
    .from("companies")
    .select("id, name, pitch, website_url, logo_path, tier")
    .in("id", companyIds);
  const companyMap = new Map<string, BattleCompany>(
    ((companies ?? []) as BattleCompany[]).map((row) => [row.id, row]),
  );

  const { data: ratings } = await db
    .from("company_ratings")
    .select("company_id, elo, wins, losses")
    .eq("season_id", battles[0]!.season_id)
    .in("company_id", companyIds);
  const statsById = new Map(
    (
      (ratings ?? []) as Array<{
        company_id: string;
        elo: number;
        wins: number;
        losses: number;
      }>
    ).map((row) => [row.company_id, row]),
  );

  const { data: myVotes } = await db
    .from("votes")
    .select("battle_id, points_a, points_b, winner_id")
    .eq("visitor_id", visitorId)
    .in(
      "battle_id",
      battles.map((battle) => battle.id),
    );
  const voteByBattle = new Map(
    (
      (myVotes ?? []) as Array<{
        battle_id: string;
        points_a: number;
        points_b: number;
        winner_id: string;
      }>
    ).map((row) => [row.battle_id, row]),
  );

  const withStats = (company: BattleCompany): BattleCompany => {
    const stats = statsById.get(company.id);
    return {
      ...company,
      elo: stats?.elo,
      wins: stats?.wins,
      losses: stats?.losses,
    };
  };

  const matchups: CardMatchupPayload[] = battles.map((battle) => {
    const pooled = pools[battle.tier] ?? [];
    const companyA =
      pooled.find((c) => c.id === battle.company_a_id) ??
      companyMap.get(battle.company_a_id)!;
    const companyB =
      pooled.find((c) => c.id === battle.company_b_id) ??
      companyMap.get(battle.company_b_id)!;
    const mine = voteByBattle.get(battle.id);
    return {
      battle: toBattleBody(battle),
      companies: [withStats(companyA), withStats(companyB)],
      hasVoted: Boolean(mine),
      myPointsA: mine?.points_a ?? null,
      myPointsB: mine?.points_b ?? null,
      myWinnerId: mine?.winner_id ?? null,
    };
  });

  const votesUsed = voteByBattle.size;
  return {
    sessionComplete: isCardComplete(votesUsed, battles.length),
    servingGrace,
    card: cardMetaFrom(card, battles.length, votesUsed),
    matchups,
  };
}

export async function getBattleById(
  battleId: string,
  visitorId: string,
): Promise<CardSessionPayload> {
  return getCardSession(visitorId).then((session) => {
    if (session.matchups.some((row) => row.battle.id === battleId)) {
      return session;
    }
    throw new Error("battle_not_found");
  });
}

function quotaFromCardState(
  card: {
    ends_at: string;
    grace_ends_at: string;
    hour_key: string;
  },
  votesUsed: number,
  matchupCount: number,
  servingGrace: boolean,
): Pick<
  VoteResult,
  | "votesUsed"
  | "votesRemaining"
  | "sessionComplete"
  | "servingGrace"
  | "nextCardAt"
  | "graceEndsAt"
  | "phase"
> {
  return {
    votesUsed,
    votesRemaining: votesRemaining(votesUsed, matchupCount),
    sessionComplete: isCardComplete(votesUsed, matchupCount),
    servingGrace,
    nextCardAt: card.ends_at,
    graceEndsAt: card.grace_ends_at,
    phase: getCardPhase(card.ends_at, card.grace_ends_at),
  };
}

function servingGraceFor(cardHourKey: string): boolean {
  return cardHourKey !== getCardHour(new Date()).hourKey;
}

export async function allocateVote(params: {
  battleId: string;
  pointsA: number;
  pointsB: number;
  visitorId: string;
  ipHash?: string | null;
}): Promise<VoteResult> {
  const adminClient = await tryGetAdminClient();
  if (isDemoMode() || !adminClient) {
    const existing = demoGetBattle(params.battleId);
    if (existing?.card_id) {
      const used = demoVisitorVotedBattleIds(
        existing.card_id,
        params.visitorId,
      ).length;
      const matchupCount = demoBattlesForCard(existing.card_id).length;
      if (isCardComplete(used, matchupCount)) {
        throw new Error("rate_limited");
      }
    }
    const result = demoAllocateVote(params);
    const battle = demoGetBattle(params.battleId);
    const card = battle?.card_id ? demoGetCard(battle.card_id) : undefined;
    const matchupCount = battle?.card_id
      ? demoBattlesForCard(battle.card_id).length
      : 1;
    const votesUsed = battle?.card_id
      ? demoVisitorVotedBattleIds(battle.card_id, params.visitorId).length
      : 1;
    if (!card) {
      throw new Error("card_closed");
    }
    return {
      ...result,
      ...quotaFromCardState(
        card,
        votesUsed,
        matchupCount,
        servingGraceFor(card.hour_key),
      ),
    };
  }

  const admin = adminClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  await resolveExpiredDbCards(db);

  const { data, error } = await db.rpc("allocate_vote", {
    p_battle_id: params.battleId,
    p_points_a: params.pointsA,
    p_points_b: params.pointsB,
    p_visitor_id: params.visitorId,
    p_ip_hash: params.ipHash ?? null,
  });

  if (error) {
    throw new Error(error.message || "vote_failed");
  }

  const { data: battleRow } = await db
    .from("battles")
    .select("card_id")
    .eq("id", params.battleId)
    .maybeSingle();
  const cardId = battleRow?.card_id as string | undefined;
  const { data: card } = cardId
    ? await db
        .from("cards")
        .select("hour_key, ends_at, grace_ends_at")
        .eq("id", cardId)
        .maybeSingle()
    : { data: null };
  const cardBattles = cardId ? await loadCardBattles(db, cardId) : [];
  const votedIds = cardId
    ? await loadVotedBattleIds(db, cardBattles, params.visitorId)
    : [];

  return {
    status: data.status as BattleStatus,
    votesA: data.votesA,
    votesB: data.votesB,
    voteBudget: data.voteBudget,
    myPointsA: data.myPointsA ?? params.pointsA,
    myPointsB: data.myPointsB ?? params.pointsB,
    myWinnerId: data.myWinnerId,
    ...quotaFromCardState(
      card ?? {
        hour_key: "0",
        ends_at: new Date().toISOString(),
        grace_ends_at: new Date().toISOString(),
      },
      votedIds.length,
      cardBattles.length,
      card ? servingGraceFor(card.hour_key) : false,
    ),
  };
}

function historyCompany(
  company: { id: string; name: string; logo_path: string | null } | undefined,
  id: string,
): CardHistoryCompany {
  return {
    id,
    name: company?.name ?? "Unknown",
    logo_path: company?.logo_path ?? null,
  };
}

export async function listCardHistory(): Promise<CardHistoryItem[]> {
  const adminClient = await tryGetAdminClient();
  if (isDemoMode() || !adminClient) {
    demoResolveExpiredCards();
    const store = getDemoStore();
    return demoListCards().map((card) => ({
      id: card.id,
      hourKey: card.hour_key,
      startsAt: card.starts_at,
      endsAt: card.ends_at,
      matchups: demoBattlesForCard(card.id).map((battle) => ({
        id: battle.id,
        slot: battle.card_slot ?? 0,
        tier: battle.tier,
        companyA: historyCompany(
          store.companies.get(battle.company_a_id),
          battle.company_a_id,
        ),
        companyB: historyCompany(
          store.companies.get(battle.company_b_id),
          battle.company_b_id,
        ),
        pointsA: battle.votes_a,
        pointsB: battle.votes_b,
        winnerId: battle.winner_id,
      })),
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = adminClient as any;
  await resolveExpiredDbCards(db);

  const { data: cards, error } = await db
    .from("cards")
    .select("id, hour_key, starts_at, ends_at, grace_ends_at, status")
    .eq("status", "resolved")
    .order("starts_at", { ascending: false })
    .limit(48);
  if (error) throw new Error(error.message);

  const list = (cards ?? []) as DbCard[];
  const items: CardHistoryItem[] = [];
  for (const card of list) {
    const battles = await loadCardBattles(db, card.id);
    if (battles.length === 0) continue;
    const ids = [
      ...new Set(
        battles.flatMap((battle) => [battle.company_a_id, battle.company_b_id]),
      ),
    ];
    const { data: companies } = await db
      .from("companies")
      .select("id, name, logo_path")
      .in("id", ids);
    const map = new Map(
      (
        (companies ?? []) as Array<{
          id: string;
          name: string;
          logo_path: string | null;
        }>
      ).map((row) => [row.id, row]),
    );
    items.push({
      id: card.id,
      hourKey: card.hour_key,
      startsAt: card.starts_at,
      endsAt: card.ends_at,
      matchups: battles.map((battle) => ({
        id: battle.id,
        slot: battle.card_slot ?? 0,
        tier: battle.tier,
        companyA: historyCompany(
          map.get(battle.company_a_id),
          battle.company_a_id,
        ),
        companyB: historyCompany(
          map.get(battle.company_b_id),
          battle.company_b_id,
        ),
        pointsA: battle.votes_a ?? 0,
        pointsB: battle.votes_b ?? 0,
        winnerId: battle.winner_id ?? null,
      })),
    });
  }
  return items;
}

export async function resolveExpiredCards(): Promise<number> {
  const adminClient = await tryGetAdminClient();
  if (isDemoMode() || !adminClient) {
    const before = demoListCards().length;
    demoResolveExpiredCards();
    return demoListCards().length - before;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = adminClient as any;
  const { data: due } = await db
    .from("cards")
    .select("id")
    .eq("status", "open")
    .lte("grace_ends_at", new Date().toISOString());
  const rows = due ?? [];
  await resolveExpiredDbCards(db);
  return rows.length;
}
