/**
 * Standard Elo expected score for ratingA against ratingB.
 * P(A beats B) = 1 / (1 + 10^((Rb - Ra) / 400))
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Updates Elo ratings after a decisive match. Returns rounded integer ratings.
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
