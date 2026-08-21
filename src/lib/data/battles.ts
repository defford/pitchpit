import type { Tier } from "@/config/tiers";
import { ELO_K } from "@/config/tiers";
import {
  demoActiveCompaniesByTier,
  demoCastVote,
  demoEnsureSeason,
  demoSoftRateLimited,
  getDemoStore,
  type DemoBattle,
  type DemoCompany,
} from "@/lib/data/demo-store";
import { ensureCurrentSeason } from "@/lib/data/seasons";
import { isDemoMode, tryGetAdminClient } from "@/lib/demo-mode";
import { pickRandomPair, selectWeightedTier } from "@/lib/domain/pairing";

const BATTLE_TTL_MS = 10 * 60 * 1000;
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

export type BattlePayload = {
  battle: {
    id: string;
    tier: Tier;
    seasonId: string;
    expiresAt: string;
    companyAId: string;
    companyBId: string;
  };
  companies: [BattleCompany, BattleCompany];
};

export type VoteResult = {
  winnerId: string;
  loserId: string;
  winnerEloAfter: number;
  loserEloAfter: number;
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

async function createDemoBattle(visitorId: string): Promise<BattlePayload> {
  const season = demoEnsureSeason();
  const available: Tier[] = (
    ["pit", "undercard", "main_event"] as Tier[]
  ).filter((tier) => demoActiveCompaniesByTier(tier).length >= 2);
  if (available.length === 0) {
    throw new Error("no_eligible_companies");
  }

  const tier = selectWeightedTier(Math.random(), available);
  const pool = demoActiveCompaniesByTier(tier);
  const [aId, bId] = pickRandomPair(
    pool.map((c) => c.id),
    Math.random,
  );
  const store = getDemoStore();
  const companyA = store.companies.get(aId)!;
  const companyB = store.companies.get(bId)!;
  const battle: DemoBattle = {
    id: crypto.randomUUID(),
    season_id: season.id,
    tier,
    company_a_id: aId,
    company_b_id: bId,
    status: "open",
    visitor_id: visitorId,
    expires_at: new Date(Date.now() + BATTLE_TTL_MS).toISOString(),
    created_at: new Date().toISOString(),
  };
  store.battles.set(battle.id, battle);

  return {
    battle: {
      id: battle.id,
      tier,
      seasonId: season.id,
      expiresAt: battle.expires_at,
      companyAId: aId,
      companyBId: bId,
    },
    companies: [
      toBattleCompany(companyA, season.id),
      toBattleCompany(companyB, season.id),
    ],
  };
}

export async function createBattle(visitorId: string): Promise<BattlePayload> {
  const adminClient = await tryGetAdminClient();
  if (isDemoMode() || !adminClient) {
    return createDemoBattle(visitorId);
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
  const pool = byTier[tier];
  const [aId, bId] = pickRandomPair(
    pool.map((c) => c.id),
    Math.random,
  );
  const companyA = pool.find((c) => c.id === aId)!;
  const companyB = pool.find((c) => c.id === bId)!;

  // Ensure ratings exist for both
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
      visitor_id: visitorId,
      expires_at: new Date(Date.now() + BATTLE_TTL_MS).toISOString(),
    })
    .select("*")
    .single();

  if (battleError) throw new Error(battleError.message);

  const { data: ratings } = await db
    .from("company_ratings")
    .select("company_id, elo, wins, losses")
    .eq("season_id", season.id)
    .in("company_id", [aId, bId]);

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

  return {
    battle: {
      id: battle.id,
      tier,
      seasonId: season.id,
      expiresAt: battle.expires_at,
      companyAId: aId,
      companyBId: bId,
    },
    companies: [withStats(companyA), withStats(companyB)],
  };
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

  // Soft rate limit: count recent votes by visitor
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
    winnerId: data.winnerId,
    loserId: data.loserId,
    winnerEloAfter: data.winnerEloAfter,
    loserEloAfter: data.loserEloAfter,
  };
}
