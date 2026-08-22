import { describe, expect, it } from "vitest";

import { CARD_SLOT_ORDER } from "@/config/tiers";
import {
  allocateVote,
  getCardSession,
  listCardHistory,
} from "@/lib/data/battles";
import { getVoteBudget } from "@/lib/domain";

describe("hourly card session", () => {
  it("serves the full six-fight card in pit / undercard / main order", async () => {
    const visitorId = crypto.randomUUID();
    const session = await getCardSession(visitorId);

    expect(session.sessionComplete).toBe(false);
    expect(session.matchups).toHaveLength(6);
    expect(session.card.matchupCount).toBe(6);
    expect(session.card.votesRemaining).toBe(6);
    expect(session.matchups.map((row) => row.battle.tier)).toEqual([
      ...CARD_SLOT_ORDER,
    ]);
    expect(session.matchups.map((row) => row.battle.voteBudget)).toEqual([
      1, 1, 1, 3, 3, 7,
    ]);

    const companyIds = session.matchups.flatMap((row) => [
      row.battle.companyAId,
      row.battle.companyBId,
    ]);
    expect(new Set(companyIds).size).toBe(12);
  });

  it("accepts point splits and locks the visitor after six fights", async () => {
    const visitorId = crypto.randomUUID();
    const session = await getCardSession(visitorId);

    for (const [index, matchup] of session.matchups.entries()) {
      const budget = getVoteBudget(matchup.battle.tier);
      const result = await allocateVote({
        battleId: matchup.battle.id,
        pointsA: budget,
        pointsB: 0,
        visitorId,
      });
      expect(result.myPointsA).toBe(budget);
      expect(result.myPointsB).toBe(0);
      expect(result.votesUsed).toBe(index + 1);
      expect(result.votesRemaining).toBe(5 - index);
      expect(result.status).toBe("open");
    }

    const done = await getCardSession(visitorId);
    expect(done.sessionComplete).toBe(true);
    expect(done.matchups).toHaveLength(6);
    expect(done.matchups.every((row) => row.hasVoted)).toBe(true);
    expect(done.card.votesUsed).toBe(6);

    await expect(
      allocateVote({
        battleId: session.matchups[0]!.battle.id,
        pointsA: 1,
        pointsB: 0,
        visitorId,
      }),
    ).rejects.toThrow(/rate_limited|already_voted/);
  });

  it("rejects an allocation that does not spend the whole budget", async () => {
    const visitorId = crypto.randomUUID();
    const session = await getCardSession(visitorId);
    const undercard = session.matchups.find(
      (row) => row.battle.tier === "undercard",
    )!;

    await expect(
      allocateVote({
        battleId: undercard.battle.id,
        pointsA: 1,
        pointsB: 1,
        visitorId,
      }),
    ).rejects.toThrow("invalid_allocation");
  });

  it("gives a second visitor the same hourly matchups", async () => {
    const first = await getCardSession(crypto.randomUUID());
    const second = await getCardSession(crypto.randomUUID());
    expect(first.card.id).toBe(second.card.id);
    expect(first.matchups.map((row) => row.battle.id)).toEqual(
      second.matchups.map((row) => row.battle.id),
    );
  });

  it("lists prior resolved cards with point totals", async () => {
    const history = await listCardHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]!.matchups.length).toBe(6);
    expect(
      history[0]!.matchups.every(
        (row) => row.pointsA + row.pointsB > 0 && row.companyA.name.length > 0,
      ),
    ).toBe(true);
  });
});
