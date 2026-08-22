import { ELO_K, VOTES_PER_HOUR, type Tier } from "@/config/tiers";
import {
  demoActiveCompaniesByTier,
  demoBattlesForCard,
  demoCardByHourKey,
  demoCastVote,
  demoEnsureSeason,
  demoFightCounts,
  demoGetBattle,
  demoGetCard,
  demoSoftRateLimited,
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
  getVotesToWin,
  isCardComplete,
  selectCardBattle,
  votesRemaining,
  type CardFighter,
  type CardMeta,
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
  tier: Tier;
  seasonId: string;
  expiresAt: string;
  companyAId: string;
  companyBId: string;
  status: BattleStatus;
  votesA: number;
  votesB: number;
  votesToWin: number;
  winnerId?: string | null;
  loserId?: string | null;
  winnerEloBefore?: number | null;
  loserEloBefore?: number | null;
  winnerEloAfter?: number | null;
  loserEloAfter?: number | null;
};

export type BattlePayload = {
  battle: BattleBody;
  companies: [BattleCompany, BattleCompany];
  hasVoted: boolean;
  myWinnerId: string | null;
};

export type CardSessionPayload = {
  sessionComplete: boolean;
  card: CardMeta;
  battle: BattleBody | null;
  companies: [BattleCompany, BattleCompany] | null;
  hasVoted: boolean;
  myWinnerId: string | null;
};

export type VoteResult = {
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
  votesUsed: number;
  votesRemaining: number;
  sessionComplete: boolean;
  nextCardAt: string | null;
};

export type CardSessionOptions = {
  afterBattleId?: string | null;
  skip?: boolean;
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

function demoVisitorPick(battleId: string, visitorId: string): string | null {
  const store = getDemoStore();
  for (const vote of store.votes.values()) {
    if (vote.battle_id === battleId && vote.visitor_id === visitorId) {
      return vote.winner_id;
    }
  }
  return null;
}

function demoPayloadFromBattle(
  battle: DemoBattle,
  visitorId: string,
): BattlePayload {
  const store = getDemoStore();
  const companyA = store.companies.get(battle.company_a_id)!;
  const companyB = store.companies.get(battle.company_b_id)!;
  const myWinnerId = demoVisitorPick(battle.id, visitorId);
  return {
    battle: {
      id: battle.id,
      tier: battle.tier,
      seasonId: battle.season_id,
      expiresAt: battle.expires_at,
      companyAId: battle.company_a_id,
      companyBId: battle.company_b_id,
      status: battle.status,
      votesA: battle.votes_a,
      votesB: battle.votes_b,
      votesToWin: getVotesToWin(battle.tier),
      winnerId: battle.winner_id,
      loserId: battle.loser_id,
      winnerEloBefore: battle.winner_elo_before,
      loserEloBefore: battle.loser_elo_before,
      winnerEloAfter: battle.winner_elo_after,
      loserEloAfter: battle.loser_elo_after,
    },
    companies: [
      toBattleCompany(companyA, battle.season_id),
      toBattleCompany(companyB, battle.season_id),
    ],
    hasVoted: myWinnerId != null,
    myWinnerId,
  };
}

function cardMetaFrom(
  card: { id: string; hour_key: string; starts_at: string; ends_at: string },
  slot: number,
  matchupCount: number,
  votesUsed: number,
): CardMeta {
  return {
    id: card.id,
    hourKey: card.hour_key,
    startsAt: card.starts_at,
    endsAt: card.ends_at,
    slot,
    matchupCount,
    votesUsed,
    votesRemaining: votesRemaining(votesUsed, matchupCount),
  };
}

function sessionFromPayload(
  card: CardMeta,
  payload: BattlePayload | null,
  sessionComplete: boolean,
): CardSessionPayload {
  return {
    sessionComplete,
    card,
    battle: payload?.battle ?? null,
    companies: payload?.companies ?? null,
    hasVoted: payload?.hasVoted ?? false,
    myWinnerId: payload?.myWinnerId ?? null,
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

function ensureDemoCard(): DemoCard {
  const season = demoEnsureSeason();
  const hour = getCardHour(new Date());
  const existing = demoCardByHourKey(hour.hourKey);
  if (existing) return existing;

  const store = getDemoStore();
  const card: DemoCard = {
    id: crypto.randomUUID(),
    season_id: season.id,
    hour_key: hour.hourKey,
    starts_at: hour.startsAt.toISOString(),
    ends_at: hour.endsAt.toISOString(),
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
      expires_at: card.ends_at,
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

function demoCardSession(
  visitorId: string,
  options: CardSessionOptions,
): CardSessionPayload {
  const card = ensureDemoCard();
  const battles = demoBattlesForCard(card.id);
  if (battles.length === 0) {
    throw new Error("no_eligible_companies");
  }
  const votedIds = demoVisitorVotedBattleIds(card.id, visitorId);
  const chosen = selectCardBattle(
    battles.map((battle) => ({
      id: battle.id,
      slot: battle.card_slot ?? 0,
    })),
    votedIds,
    options,
  );
  const complete =
    chosen == null || isCardComplete(votedIds.length, battles.length);
  const meta = cardMetaFrom(
    card,
    chosen ? chosen.slot + 1 : battles.length,
    battles.length,
    votedIds.length,
  );
  if (complete || !chosen) {
    return sessionFromPayload(meta, null, true);
  }
  const battle = battles.find((row) => row.id === chosen.id)!;
  return sessionFromPayload(
    meta,
    demoPayloadFromBattle(battle, visitorId),
    false,
  );
}

export async function getCardSession(
  visitorId: string,
  options: CardSessionOptions = {},
): Promise<CardSessionPayload> {
  const adminClient = await tryGetAdminClient();
  if (isDemoMode() || !adminClient) {
    return demoCardSession(visitorId, options);
  }

  const season = await ensureCurrentSeason();
  const admin = adminClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const hour = getCardHour(new Date());

  const pools = await loadActivePools(db);
  const available = (Object.keys(pools) as Tier[]).filter(
    (tier) => pools[tier].length >= 2,
  );
  if (available.length === 0) {
    throw new Error("no_eligible_companies");
  }

  const card = await ensureDbCard(db, season.id, hour, pools);
  const battles = await loadCardBattles(db, card.id);
  if (battles.length === 0) {
    throw new Error("no_eligible_companies");
  }

  const votedIds = await loadVotedBattleIds(db, battles, visitorId);
  const chosen = selectCardBattle(
    battles.map((battle) => ({
      id: battle.id,
      slot: battle.card_slot ?? 0,
    })),
    votedIds,
    options,
  );
  const complete =
    chosen == null || isCardComplete(votedIds.length, battles.length);
  const meta = cardMetaFrom(
    card,
    chosen ? chosen.slot + 1 : battles.length,
    battles.length,
    votedIds.length,
  );
  if (complete || !chosen) {
    return sessionFromPayload(meta, null, true);
  }

  const battle = battles.find((row) => row.id === chosen.id)!;
  const payload = await hydrateBattlePayload(
    db,
    battle,
    pools[battle.tier as Tier] ?? [],
    visitorId,
  );
  return sessionFromPayload(meta, payload, false);
}

type DbCard = {
  id: string;
  hour_key: string;
  starts_at: string;
  ends_at: string;
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
    },
    { onConflict: "hour_key", ignoreDuplicates: true },
  );

  const { data: card, error } = await db
    .from("cards")
    .select("id, hour_key, starts_at, ends_at")
    .eq("hour_key", hour.hourKey)
    .single();

  if (error || !card) throw new Error(error?.message ?? "card_failed");

  const existing = await loadCardBattles(db, card.id);
  if (existing.length > 0) return card;

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
        expires_at: card.ends_at,
        votes_a: 0,
        votes_b: 0,
      })),
    );
    if (insertError && !/duplicate|unique/i.test(insertError.message ?? "")) {
      throw new Error(insertError.message);
    }
  }

  return card;
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

async function hydrateBattlePayload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  battle: DbBattle,
  pool: BattleCompany[],
  visitorId: string,
): Promise<BattlePayload> {
  let companyA = pool.find((c) => c.id === battle.company_a_id);
  let companyB = pool.find((c) => c.id === battle.company_b_id);

  if (!companyA || !companyB) {
    const { data: companies } = await db
      .from("companies")
      .select("id, name, pitch, website_url, logo_path, tier")
      .in("id", [battle.company_a_id, battle.company_b_id]);
    const list = (companies ?? []) as BattleCompany[];
    companyA = list.find((c) => c.id === battle.company_a_id)!;
    companyB = list.find((c) => c.id === battle.company_b_id)!;
  }

  const { data: ratings } = await db
    .from("company_ratings")
    .select("company_id, elo, wins, losses")
    .eq("season_id", battle.season_id)
    .in("company_id", [battle.company_a_id, battle.company_b_id]);

  const statsById = new Map<
    string,
    { company_id: string; elo: number; wins: number; losses: number }
  >(
    (
      (ratings ?? []) as Array<{
        company_id: string;
        elo: number;
        wins: number;
        losses: number;
      }>
    ).map((row) => [row.company_id, row]),
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

  const { data: myVote } = await db
    .from("votes")
    .select("winner_id")
    .eq("battle_id", battle.id)
    .eq("visitor_id", visitorId)
    .maybeSingle();

  return {
    battle: {
      id: battle.id,
      tier: battle.tier,
      seasonId: battle.season_id,
      expiresAt: battle.expires_at,
      companyAId: battle.company_a_id,
      companyBId: battle.company_b_id,
      status: battle.status,
      votesA: battle.votes_a ?? 0,
      votesB: battle.votes_b ?? 0,
      votesToWin: getVotesToWin(battle.tier),
      winnerId: battle.winner_id ?? null,
      loserId: battle.loser_id ?? null,
      winnerEloBefore: battle.winner_elo_before ?? null,
      loserEloBefore: battle.loser_elo_before ?? null,
      winnerEloAfter: battle.winner_elo_after ?? null,
      loserEloAfter: battle.loser_elo_after ?? null,
    },
    companies: [withStats(companyA), withStats(companyB)],
    hasVoted: !!myVote,
    myWinnerId: myVote?.winner_id ?? null,
  };
}

function quotaFromCard(
  votesUsed: number,
  matchupCount: number,
  nextCardAt: string | null,
): Pick<
  VoteResult,
  "votesUsed" | "votesRemaining" | "sessionComplete" | "nextCardAt"
> {
  return {
    votesUsed,
    votesRemaining: votesRemaining(votesUsed, matchupCount),
    sessionComplete: isCardComplete(votesUsed, matchupCount),
    nextCardAt,
  };
}

async function voteQuotaForBattle(
  battleId: string,
  visitorId: string,
): Promise<
  Pick<
    VoteResult,
    "votesUsed" | "votesRemaining" | "sessionComplete" | "nextCardAt"
  >
> {
  const adminClient = await tryGetAdminClient();
  if (isDemoMode() || !adminClient) {
    const battle = demoGetBattle(battleId);
    if (!battle?.card_id) {
      return quotaFromCard(1, VOTES_PER_HOUR, null);
    }
    const card = demoGetCard(battle.card_id);
    const matchupCount = demoBattlesForCard(battle.card_id).length;
    const votesUsed = demoVisitorVotedBattleIds(
      battle.card_id,
      visitorId,
    ).length;
    return quotaFromCard(votesUsed, matchupCount, card?.ends_at ?? null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = adminClient as any;
  const { data: battle } = await db
    .from("battles")
    .select("card_id")
    .eq("id", battleId)
    .maybeSingle();

  if (!battle?.card_id) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("visitor_id", visitorId)
      .gte("created_at", since);
    return quotaFromCard(count ?? 0, VOTES_PER_HOUR, null);
  }

  const { data: card } = await db
    .from("cards")
    .select("ends_at")
    .eq("id", battle.card_id)
    .maybeSingle();
  const cardBattles = await loadCardBattles(db, battle.card_id);
  const votedIds = await loadVotedBattleIds(db, cardBattles, visitorId);
  return quotaFromCard(
    votedIds.length,
    cardBattles.length,
    card?.ends_at ?? null,
  );
}

function fallbackCardMeta(
  battle: {
    id: string;
    created_at?: string;
    expires_at: string;
  },
  votesUsed: number,
): CardMeta {
  return cardMetaFrom(
    {
      id: battle.id,
      hour_key: "0",
      starts_at: battle.created_at ?? battle.expires_at,
      ends_at: battle.expires_at,
    },
    1,
    1,
    votesUsed,
  );
}

export async function getBattleById(
  battleId: string,
  visitorId: string,
): Promise<CardSessionPayload> {
  const adminClient = await tryGetAdminClient();
  if (isDemoMode() || !adminClient) {
    const battle = demoGetBattle(battleId);
    if (!battle) throw new Error("battle_not_found");
    if (
      battle.status === "open" &&
      new Date(battle.expires_at).getTime() < Date.now()
    ) {
      battle.status = "expired";
    }
    const payload = demoPayloadFromBattle(battle, visitorId);
    if (!battle.card_id) {
      return sessionFromPayload(
        fallbackCardMeta(battle, payload.hasVoted ? 1 : 0),
        payload,
        false,
      );
    }
    const card = demoGetCard(battle.card_id);
    const cardBattles = demoBattlesForCard(battle.card_id);
    const votesUsed = demoVisitorVotedBattleIds(
      battle.card_id,
      visitorId,
    ).length;
    return sessionFromPayload(
      cardMetaFrom(
        card ?? {
          id: battle.card_id,
          hour_key: "0",
          starts_at: battle.created_at,
          ends_at: battle.expires_at,
        },
        (battle.card_slot ?? 0) + 1,
        cardBattles.length,
        votesUsed,
      ),
      payload,
      false,
    );
  }

  const admin = adminClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: battle, error } = await db
    .from("battles")
    .select("*")
    .eq("id", battleId)
    .single();

  if (error || !battle) throw new Error("battle_not_found");

  if (battle.status === "open" && new Date(battle.expires_at) < new Date()) {
    await db.from("battles").update({ status: "expired" }).eq("id", battleId);
    battle.status = "expired";
  }

  const payload = await hydrateBattlePayload(db, battle, [], visitorId);
  if (!battle.card_id) {
    return sessionFromPayload(
      fallbackCardMeta(battle, payload.hasVoted ? 1 : 0),
      payload,
      false,
    );
  }

  const { data: card } = await db
    .from("cards")
    .select("id, hour_key, starts_at, ends_at")
    .eq("id", battle.card_id)
    .maybeSingle();
  const cardBattles = await loadCardBattles(db, battle.card_id);
  const votedIds = await loadVotedBattleIds(db, cardBattles, visitorId);
  return sessionFromPayload(
    cardMetaFrom(
      card ?? {
        id: battle.card_id,
        hour_key: "0",
        starts_at: battle.created_at,
        ends_at: battle.expires_at,
      },
      (battle.card_slot ?? 0) + 1,
      cardBattles.length,
      votedIds.length,
    ),
    payload,
    false,
  );
}

export async function castVote(params: {
  battleId: string;
  winnerId: string;
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
    } else if (demoSoftRateLimited(params.visitorId, VOTES_PER_HOUR)) {
      throw new Error("rate_limited");
    }
    const result = demoCastVote(params);
    const quota = await voteQuotaForBattle(params.battleId, params.visitorId);
    return { ...result, ...quota };
  }

  const admin = adminClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: target } = await db
    .from("battles")
    .select("card_id")
    .eq("id", params.battleId)
    .maybeSingle();

  if (target?.card_id) {
    const cardBattles = await loadCardBattles(db, target.card_id);
    const votedIds = await loadVotedBattleIds(
      db,
      cardBattles,
      params.visitorId,
    );
    if (isCardComplete(votedIds.length, cardBattles.length)) {
      throw new Error("rate_limited");
    }
  } else {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("visitor_id", params.visitorId)
      .gte("created_at", since);
    if ((count ?? 0) >= VOTES_PER_HOUR) {
      throw new Error("rate_limited");
    }
  }

  const { data, error } = await db.rpc("cast_vote", {
    p_battle_id: params.battleId,
    p_winner_id: params.winnerId,
    p_visitor_id: params.visitorId,
    p_ip_hash: params.ipHash ?? null,
    p_k: ELO_K,
  });

  if (error) {
    throw new Error(error.message || "vote_failed");
  }

  const quota = await voteQuotaForBattle(params.battleId, params.visitorId);

  return {
    status: data.status as BattleStatus,
    votesA: data.votesA,
    votesB: data.votesB,
    votesToWin: data.votesToWin,
    myWinnerId: data.myWinnerId ?? params.winnerId,
    winnerId: data.winnerId ?? null,
    loserId: data.loserId ?? null,
    winnerEloBefore: data.winnerEloBefore ?? undefined,
    loserEloBefore: data.loserEloBefore ?? undefined,
    winnerEloAfter: data.winnerEloAfter ?? undefined,
    loserEloAfter: data.loserEloAfter ?? undefined,
    ...quota,
  };
}
