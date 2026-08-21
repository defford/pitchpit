import { getBattleWeights, type Tier } from "@/config/tiers";

/**
 * Picks a tier by battle weight among available tiers (already filtered to
 * pools with enough companies). Weights are renormalized to sum to 1.
 */
export function selectWeightedTier(
  random01: number,
  availableTiers: Tier[],
): Tier {
  if (availableTiers.length === 0) {
    throw new Error("selectWeightedTier requires at least one available tier");
  }

  if (availableTiers.length === 1) {
    return availableTiers[0]!;
  }

  const weights = getBattleWeights();
  const total = availableTiers.reduce((sum, tier) => sum + weights[tier], 0);

  if (total <= 0) {
    throw new Error("selectWeightedTier: available tier weights sum to zero");
  }

  const clamped = Math.min(Math.max(random01, 0), 1 - Number.EPSILON);
  let cursor = 0;

  for (const tier of availableTiers) {
    cursor += weights[tier] / total;
    if (clamped < cursor) {
      return tier;
    }
  }

  return availableTiers[availableTiers.length - 1]!;
}

/**
 * Uniformly samples two distinct company ids.
 */
export function pickRandomPair(
  ids: string[],
  random: () => number,
): [string, string] {
  if (ids.length < 2) {
    throw new Error("pickRandomPair requires at least two ids");
  }

  const i = Math.floor(random() * ids.length);
  let j = Math.floor(random() * (ids.length - 1));
  if (j >= i) {
    j += 1;
  }

  return [ids[i]!, ids[j]!];
}
