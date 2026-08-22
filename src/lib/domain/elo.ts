/**
 * Standard Elo expected score for ratingA against ratingB.
 * P(A beats B) = 1 / (1 + 10^((Rb - Ra) / 400))
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Updates Elo after a decisive match. Returns rounded integer ratings.
 */
export function updateElo(
  winnerRating: number,
  loserRating: number,
  k = 32,
): { winner: number; loser: number } {
  const expectedWinner = expectedScore(winnerRating, loserRating);
  const expectedLoser = expectedScore(loserRating, winnerRating);

  return {
    winner: Math.round(winnerRating + k * (1 - expectedWinner)),
    loser: Math.round(loserRating + k * (0 - expectedLoser)),
  };
}

/**
 * Updates both ratings from A's share of the points (0..1).
 * A 7–0 sweep is a full win; a 4–3 split moves Elo less.
 */
export function updateEloFromShare(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  k = 32,
): { ratingA: number; ratingB: number } {
  const clamped = Math.min(1, Math.max(0, scoreA));
  const expectedA = expectedScore(ratingA, ratingB);
  return {
    ratingA: Math.round(ratingA + k * (clamped - expectedA)),
    ratingB: Math.round(ratingB + k * (1 - clamped - (1 - expectedA))),
  };
}
