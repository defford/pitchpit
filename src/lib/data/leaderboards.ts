import type { Tier } from "@/config/tiers";
import { DISPLAY_LIMITS, TIERS } from "@/config/tiers";
import type { LeaderboardCompany, LeaderboardsPayload } from "@/lib/data/demo";
import { getDemoLeaderboards } from "@/lib/data/demo";
import { isDemoMode, tryGetAdminClient } from "@/lib/demo-mode";
import { getSeasonBounds } from "@/lib/domain/seasons";
import { ensureCurrentSeason } from "@/lib/data/seasons";

export type { LeaderboardCompany, LeaderboardsPayload };

function emptyLeaderboards(seasonEndsAt: string): LeaderboardsPayload {
  return {
    mainEvent: [],
    undercard: [],
    pit: [],
    seasonEndsAt,
  };
}

function mapRow(
  row: {
    company_id: string;
    elo: number;
    tier: Tier;
    companies: {
      id: string;
      name: string;
      pitch: string;
      website_url: string;
      logo_path: string | null;
      status: string;
    } | null;
    wins?: number;
    losses?: number;
  },
  rank: number,
): LeaderboardCompany | null {
  const company = row.companies;
  if (!company || company.status !== "approved") return null;

  const logoUrl = company.logo_path
    ? company.logo_path.startsWith("http")
      ? company.logo_path
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${company.logo_path}`
    : null;

  return {
    id: company.id,
    name: company.name,
    logoUrl,
    websiteUrl: company.website_url,
    pitch: company.pitch,
    elo: row.elo,
    rank,
    tier: row.tier,
    intensity: TIERS[row.tier].intensity,
    wins: row.wins,
    losses: row.losses,
  };
}

/**
 * Active placements joined with current-season ratings, sliced to display limits.
 * Falls back to empty boards (callers may swap in demo seeds) when DB is unavailable.
 */
export async function getLeaderboards(): Promise<LeaderboardsPayload> {
  const seasonEndsAt = getSeasonBounds(new Date()).endsAt.toISOString();

  const adminClient = await tryGetAdminClient();
  if (isDemoMode() || !adminClient) {
    // Prefer empty for production-shaped fallback; public UI can still call getDemoLeaderboards.
    return emptyLeaderboards(seasonEndsAt);
  }

  try {
    const season = await ensureCurrentSeason();
    const admin = adminClient;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any;
    const nowIso = new Date().toISOString();

    const { data: placements, error: placementError } = await db
      .from("placements")
      .select("company_id, tier")
      .eq("status", "active")
      .gt("ends_at", nowIso);

    if (placementError) {
      return emptyLeaderboards(season.ends_at);
    }

    const activeIds = [
      ...new Set(
        (placements ?? []).map((p: { company_id: string }) => p.company_id),
      ),
    ] as string[];

    if (activeIds.length === 0) {
      return emptyLeaderboards(season.ends_at);
    }

    const { data: ratings, error: ratingsError } = await db
      .from("company_ratings")
      .select(
        "company_id, elo, tier, wins, losses, companies!inner(id, name, pitch, website_url, logo_path, status)",
      )
      .eq("season_id", season.id)
      .in("company_id", activeIds)
      .order("elo", { ascending: false });

    if (ratingsError || !ratings) {
      return emptyLeaderboards(season.ends_at);
    }

    const byTier: Record<Tier, LeaderboardCompany[]> = {
      main_event: [],
      undercard: [],
      pit: [],
    };

    for (const raw of ratings) {
      const company = Array.isArray(raw.companies)
        ? raw.companies[0]
        : raw.companies;
      const mapped = mapRow(
        {
          company_id: raw.company_id,
          elo: raw.elo ?? raw.rating ?? INITIAL_ELO_FALLBACK,
          tier: raw.tier,
          wins: raw.wins,
          losses: raw.losses,
          companies: company,
        },
        0,
      );
      if (!mapped) continue;
      byTier[mapped.tier].push(mapped);
    }

    const slice = (tier: Tier): LeaderboardCompany[] =>
      byTier[tier]
        .slice(0, DISPLAY_LIMITS[tier])
        .map((row, index) => ({ ...row, rank: index + 1 }));

    return {
      mainEvent: slice("main_event"),
      undercard: slice("undercard"),
      pit: slice("pit"),
      seasonEndsAt: season.ends_at,
    };
  } catch {
    return emptyLeaderboards(getDemoLeaderboards().seasonEndsAt);
  }
}

const INITIAL_ELO_FALLBACK = 1500;
