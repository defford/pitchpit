import { describe, expect, it } from "vitest";

import { expectedScore, updateElo, updateEloFromShare } from "./elo";

describe("expectedScore", () => {
  it("returns 0.5 for equal ratings", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5);
  });

  it("favors the higher-rated player", () => {
    const high = expectedScore(1600, 1400);
    const low = expectedScore(1400, 1600);
    expect(high).toBeGreaterThan(0.5);
    expect(low).toBeLessThan(0.5);
    expect(high + low).toBeCloseTo(1);
  });
});

describe("updateElo", () => {
  it("awards points to the winner and deducts from the loser", () => {
    const { winner, loser } = updateElo(1500, 1500, 32);
    expect(winner).toBe(1516);
    expect(loser).toBe(1484);
  });

  it("moves ratings less when the favorite wins", () => {
    const upset = updateElo(1400, 1600, 32);
    const expected = updateElo(1600, 1400, 32);

    expect(upset.winner - 1400).toBeGreaterThan(expected.winner - 1600);
    expect(1600 - upset.loser).toBeGreaterThan(1400 - expected.loser);
  });

  it("returns integers", () => {
    const result = updateElo(1500, 1510);
    expect(Number.isInteger(result.winner)).toBe(true);
    expect(Number.isInteger(result.loser)).toBe(true);
  });

  it("defaults k to 32", () => {
    expect(updateElo(1500, 1500)).toEqual(updateElo(1500, 1500, 32));
  });
});

describe("updateEloFromShare", () => {
  it("matches a decisive updateElo when the share is a sweep", () => {
    const share = updateEloFromShare(1500, 1500, 1, 32);
    const decisive = updateElo(1500, 1500, 32);
    expect(share.ratingA).toBe(decisive.winner);
    expect(share.ratingB).toBe(decisive.loser);
  });

  it("moves less on a close 4–3 split than on a 7–0 sweep", () => {
    const close = updateEloFromShare(1500, 1500, 4 / 7, 32);
    const sweep = updateEloFromShare(1500, 1500, 1, 32);
    expect(Math.abs(close.ratingA - 1500)).toBeLessThan(
      Math.abs(sweep.ratingA - 1500),
    );
  });
});
