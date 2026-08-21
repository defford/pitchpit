import { ELO_K, getTierConfig, type Tier } from "@/config/tiers";
import {
  demoActiveCompaniesByTier,
  demoCastVote,
  demoEnsureSeason,
  demoGetBattle,
  demoSoftRateLimited,
  getDemoStore,
  type DemoBattle,
  type DemoCompany,
} from "@/lib/data/demo-store";
import { ensureCurrentSeason } from "@/lib/data/seasons";
import { isDemoMode, tryGetAdminClient } from "@/lib/demo-mode";
import {
  getVotesToWin,
  pickRandomPair,
  selectWeightedTier,
} from "@/lib/domain";

const VOTE_RATE_LIMIT = 120;

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

export type BattlePayload = {
  battle: {
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
  companies: [BattleCompany, BattleCompany];
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
};

function battleTtlMs(tier: Tier): number {
  return getTierConfig(tier).battleTtlMinutes * 60 * 1000;
}

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

function demoVisitorPick(
  battleId: string,
  visitorId: string,
): string | null {
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

function findJoinableDemoBattle(
  tier: Tier,
  visitorId: string,
): DemoBattle | null {
  const store = getDemoStore();
  const now = Date.now();
  const open = [...store.battles.values()]
    .filter(
      (b) =>
        b.status === "open" &&
        b.tier === tier &&
        new Date(b.expires_at).getTime() > now,
    )
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

  for (const battle of open) {
    if (demoVisitorPick(battle.id, visitorId) == null) {
      return battle;
    }
  }
  return null;
}

function createDemoBattleInTier(
  visitorId: string,
  tier: Tier,
): BattlePayload {
  const season = demoEnsureSeason();
  const pool = demoActiveCompaniesByTier(tier);
  if (pool.length < 2) {
    throw new Error("no_eligible_companies");
  }
  const [aId, bId] = pickRandomPair(
    pool.map((c) => c.id),
    Math.random,
  );
  const store = getDemoStore();
  const battle: DemoBattle = {
    id: crypto.randomUUID(),
    season_id: season.id,
    tier,
    company_a_id: aId,
    company_b_id: bId,
    status: "open",
    visitor_id: null,
    expires_at: new Date(Date.now() + battleTtlMs(tier)).toISOString(),
    created_at: new Date().toISOString(),
    votes_a: 0,
    votes_b: 0,
    winner_id: null,
    loser_id: null,
    winner_elo_before: null,
    loser_elo_before: null,
    winner_elo_after: null,
    loser_elo_after: null,
  };
  store.battles.set(battle.id, battle);
  return demoPayloadFromBattle(battle, visitorId);
}

async function getOrCreateDemoBattle(visitorId: string): Promise<BattlePayload> {
  demoEnsureSeason();
  const available: Tier[] = (
    ["pit", "undercard", "main_event"] as Tier[]
  ).filter((tier) => demoActiveCompaniesByTier(tier).length >= 2);
  if (available.length === 0) {
    throw new Error("no_eligible_companies");
  }

  const tier = selectWeightedTier(Math.random(), available);
  const joinable = findJoinableDemoBattle(tier, visitorId);
  if (joinable) {
    return demoPayloadFromBattle(joinable, visitorId);
  }
  return createDemoBattleInTier(visitorId, tier);
}

export async function getOrCreateBattle(
  visitorId: string,
): Promise<BattlePayload> {
  const adminClient = await tryGetAdminClient();
  if (isDemoMode() || !adminClient) {
    return getOrCreateDemoBattle(visitorId);
  }

  const season = await ensureCurrentSeason();
  const admin = adminClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
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

  const available = (Object.keys(byTier) as Tier[]).filter(
    (tier) => byTier[tier].length >= 2,
  );
  if (available.length === 0) {
    throw new Error("no_eligible_companies");
  }

  const tier = selectWeightedTier(Math.random(), available);

  const { data: openBattles } = await db
    .from("battles")
    .select("*")
    .eq("status", "open")
    .eq("tier", tier)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(20);

  for (const candidate of openBattles ?? []) {
    const { data: existingVote } = await db
      .from("votes")
      .select("id")
      .eq("battle_id", candidate.id)
      .eq("visitor_id", visitorId)
      .maybeSingle();
    if (!existingVote) {
      return hydrateBattlePayload(db, candidate, byTier[tier], visitorId);
    }
  }

  const pool = byTier[tier];
  const [aId, bId] = pickRandomPair(
    pool.map((c) => c.id),
    Math.random,
  );
  const companyA = pool.find((c) => c.id === aId)!;
  const companyB = pool.find((c) => c.id === bId)!;

  await db.from("company_ratings").upsert(
    [
      {
        season_id: season.id,
        company_id: aId,
        tier,
        elo: 1500,
      },
      {
        season_id: season.id,
        company_id: bId,
        tier,
        elo: 1500,
      },
    ],
    { onConflict: "season_id,company_id", ignoreDuplicates: true },
  );

  const { data: battle, error: battleError } = await db
    .from("battles")
    .insert({
      season_id: season.id,
      tier,
      company_a_id: aId,
      company_b_id: bId,
      status: "open",
      visitor_id: null,
      expires_at: new Date(Date.now() + battleTtlMs(tier)).toISOString(),
      votes_a: 0,
      votes_b: 0,
    })
    .select("*")
    .single();

  if (battleError) throw new Error(battleError.message);

  return hydrateBattlePayload(db, battle, [companyA, companyB], visitorId);
}

/** @deprecated Use getOrCreateBattle */
export async function createBattle(visitorId: string): Promise<BattlePayload> {
  return getOrCreateBattle(visitorId);
}

async function hydrateBattlePayload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  battle: {
    id: string;
    season_id: string;
    tier: Tier;
    company_a_id: string;
    company_b_id: string;
    status: BattleStatus;
    expires_at: string;
    votes_a?: number;
    votes_b?: number;
    winner_id?: string | null;
    loser_id?: string | null;
    winner_elo_before?: number | null;
    loser_elo_before?: number | null;
    winner_elo_after?: number | null;
    loser_elo_after?: number | null;
  },
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

export async function getBattleById(
  battleId: string,
  visitorId: string,
): Promise<BattlePayload> {
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
    return demoPayloadFromBattle(battle, visitorId);
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

  return hydrateBattlePayload(db, battle, [], visitorId);
}

export async function castVote(params: {
  battleId: string;
  winnerId: string;
  visitorId: string;
  ipHash?: string | null;
}): Promise<VoteResult> {
  const adminClient = await tryGetAdminClient();
  if (isDemoMode() || !adminClient) {
    if (demoSoftRateLimited(params.visitorId, VOTE_RATE_LIMIT)) {
      throw new Error("rate_limited");
    }
    return demoCastVote(params);
  }

  const admin = adminClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("visitor_id", params.visitorId)
    .gte("created_at", since);

  if ((count ?? 0) >= VOTE_RATE_LIMIT) {
    throw new Error("rate_limited");
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
  };
}
