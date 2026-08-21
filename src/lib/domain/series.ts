import { getTierConfig, type Tier } from "@/config/tiers";

/**
 * Best-of series length for a Decagon fight (pit 1, undercard 3, main 7).
 */
export function getSeriesLength(tier: Tier): number {
  return getTierConfig(tier).seriesLength;
}

/**
 * Votes needed to win a series (first to majority): ceil(length / 2).
 */
export function getVotesToWin(tier: Tier): number {
  return Math.ceil(getSeriesLength(tier) / 2);
}

/**
 * True when either side has reached votes-to-win for the tier.
 */
export function isSeriesDecided(
  votesA: number,
  votesB: number,
  tier: Tier,
): boolean {
  const need = getVotesToWin(tier);
  return votesA >= need || votesB >= need;
}

/**
 * Series winner company side, or null if still open.
 * Assumes votesA is company A's tally and votesB is company B's.
 */
export function seriesWinnerSide(
  votesA: number,
  votesB: number,
  tier: Tier,
): "a" | "b" | null {
  if (!isSeriesDecided(votesA, votesB, tier)) return null;
  if (votesA > votesB) return "a";
  if (votesB > votesA) return "b";
  return null;
}
