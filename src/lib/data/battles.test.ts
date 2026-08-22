import { describe, expect, it } from "vitest";

import { CARD_SLOT_ORDER } from "@/config/tiers";
import { castVote, getCardSession } from "@/lib/data/battles";

describe("hourly card session", () => {
  it("serves 3 pit, 2 undercard, and 1 main event then locks the visitor", async () => {
    const visitorId = crypto.randomUUID();
    const seen = new Set<string>();
    const tiers: string[] = [];

    for (let i = 0; i < 6; i++) {
      const session = await getCardSession(visitorId, {
        afterBattleId: [...seen][seen.size - 1],
      });
      expect(session.sessionComplete).toBe(false);
      expect(session.battle).toBeTruthy();
      expect(session.companies).toBeTruthy();
      expect(session.card.matchupCount).toBe(6);
      expect(session.card.votesRemaining).toBe(6 - i);
      expect(seen.has(session.battle!.id)).toBe(false);
      seen.add(session.battle!.id);
      tiers.push(session.battle!.tier);

      const result = await castVote({
        battleId: session.battle!.id,
        winnerId: session.battle!.companyAId,
        visitorId,
      });
      expect(result.votesUsed).toBe(i + 1);
      expect(result.votesRemaining).toBe(5 - i);
    }

    expect(tiers).toEqual([...CARD_SLOT_ORDER]);

    const done = await getCardSession(visitorId);
    expect(done.sessionComplete).toBe(true);
    expect(done.battle).toBeNull();
    expect(done.card.votesUsed).toBe(6);
    expect(done.card.votesRemaining).toBe(0);

    await expect(
      castVote({
        battleId: [...seen][0]!,
        winnerId: "11111111-1111-4111-8111-111111111301",
        visitorId,
      }),
    ).rejects.toThrow(/rate_limited|already_voted/);
  });

  it("gives a second visitor the same hourly matchups", async () => {
    const first = await getCardSession(crypto.randomUUID());
    const second = await getCardSession(crypto.randomUUID());
    expect(first.card.id).toBe(second.card.id);
    expect(first.battle?.id).toBe(second.battle?.id);
  });
});
