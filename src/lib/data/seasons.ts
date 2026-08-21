import { INITIAL_ELO } from "@/config/tiers";
import { demoEnsureSeason } from "@/lib/data/demo-store";
import { isDemoMode, tryGetAdminClient } from "@/lib/demo-mode";
import { getSeasonBounds, getSeasonKey } from "@/lib/domain/seasons";

export type SeasonRow = {
  id: string;
  season_key: string;
  starts_at: string;
  ends_at: string;
};

/**
 * Idempotently create today's ET season and seed ratings at 1500 for
 * companies with an active paid placement.
 */
export async function ensureCurrentSeason(
  now = new Date(),
): Promise<SeasonRow> {
  const admin = await tryGetAdminClient();
  if (isDemoMode() || !admin) {
    const season = demoEnsureSeason(now);
    return season;
  }
  // Runtime schema matches SQL migration; database.ts may lag other agents.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const seasonKey = getSeasonKey(now);
  const { startsAt, endsAt } = getSeasonBounds(now);

  const { data: existing, error: existingError } = await db
    .from("seasons")
    .select("*")
    .eq("season_key", seasonKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  let season: SeasonRow = existing;
  if (!season) {
    const { data: created, error: createError } = await db
      .from("seasons")
      .insert({
        season_key: seasonKey,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .select("*")
      .single();

    if (createError) {
      // Unique race — fetch again
      const { data: raced, error: raceError } = await db
        .from("seasons")
        .select("*")
        .eq("season_key", seasonKey)
        .single();
      if (raceError || !raced) {
        throw new Error(createError.message);
      }
      season = raced;
    } else {
      season = created;
    }
  }

  const { data: placements, error: placementError } = await db
    .from("placements")
    .select("company_id, tier, companies!inner(id, status, tier)")
    .eq("status", "active")
    .gt("ends_at", now.toISOString());

  if (placementError) {
    throw new Error(placementError.message);
  }

  const rows = (placements ?? [])
    .map(
      (row: {
        company_id: string;
        tier: string;
        companies:
          | { id: string; status: string; tier: string }
          | { id: string; status: string; tier: string }[]
          | null;
      }) => {
        const company = Array.isArray(row.companies)
          ? row.companies[0]
          : row.companies;
        if (!company || company.status !== "approved") return null;
        return {
          company_id: row.company_id,
          tier: row.tier || company.tier,
        };
      },
    )
    .filter(Boolean) as Array<{ company_id: string; tier: string }>;

  if (rows.length > 0) {
    const payload = rows.map((row) => ({
      season_id: season.id,
      company_id: row.company_id,
      tier: row.tier,
      elo: INITIAL_ELO,
      wins: 0,
      losses: 0,
    }));

    const { error: seedError } = await db
      .from("company_ratings")
      .upsert(payload, {
        onConflict: "season_id,company_id",
        ignoreDuplicates: true,
      });

    if (seedError) {
      throw new Error(seedError.message);
    }
  }

  return season;
}

export async function expireOneDayPlacements(
  now = new Date(),
): Promise<number> {
  const admin = await tryGetAdminClient();
  if (isDemoMode() || !admin) {
    const { getDemoStore } = await import("@/lib/data/demo-store");
    const store = getDemoStore();
    let count = 0;
    for (const placement of store.placements.values()) {
      if (
        placement.status === "active" &&
        placement.billing_mode === "one_day" &&
        placement.ends_at &&
        new Date(placement.ends_at).getTime() <= now.getTime()
      ) {
        placement.status = "expired";
        count += 1;
      }
    }
    return count;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data, error } = await db
    .from("placements")
    .update({ status: "expired", updated_at: now.toISOString() })
    .eq("status", "active")
    .eq("billing_mode", "one_day")
    .lte("ends_at", now.toISOString())
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}
