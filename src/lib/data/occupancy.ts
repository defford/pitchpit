import type { Tier } from "@/config/tiers";
import { getDemoStore } from "@/lib/data/demo-store";
import { isHouseOwnerId } from "@/lib/data/house-catalog";
import { isDemoMode, tryGetAdminClient } from "@/lib/demo-mode";
import {
  emptyOccupancy,
  quotePools,
  type PoolQuote,
} from "@/lib/domain/pricing";

function bump(
  counts: Record<Tier, number>,
  seen: Set<string>,
  companyId: string,
  tier: Tier,
) {
  const key = `${tier}:${companyId}`;
  if (seen.has(key)) return;
  seen.add(key);
  counts[tier] += 1;
}

function countDemoRealListings(): Record<Tier, number> {
  const store = getDemoStore();
  const counts = emptyOccupancy();
  const seen = new Set<string>();
  const now = Date.now();

  for (const placement of store.placements.values()) {
    if (placement.status !== "active") continue;
    if (!placement.ends_at || Date.parse(placement.ends_at) <= now) continue;
    const company = store.companies.get(placement.company_id);
    if (!company || company.status !== "approved") continue;
    if (isHouseOwnerId(company.owner_id)) continue;
    bump(counts, seen, company.id, placement.tier);
  }

  return counts;
}

export async function countRealListingsByTier(): Promise<Record<Tier, number>> {
  const admin = await tryGetAdminClient();
  if (isDemoMode() || !admin) {
    return countDemoRealListings();
  }

  const counts = emptyOccupancy();
  const seen = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const nowIso = new Date().toISOString();

  const { data, error } = await db
    .from("placements")
    .select("company_id, tier, companies!inner(id, owner_id, status)")
    .eq("status", "active")
    .gt("ends_at", nowIso);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const company = Array.isArray(row.companies)
      ? row.companies[0]
      : row.companies;
    if (!company || company.status !== "approved") continue;
    if (isHouseOwnerId(company.owner_id)) continue;
    const tier = row.tier as Tier;
    if (!(tier in counts)) continue;
    bump(counts, seen, company.id, tier);
  }

  return counts;
}

export async function getPoolQuotes(): Promise<Record<Tier, PoolQuote>> {
  return quotePools(await countRealListingsByTier());
}
