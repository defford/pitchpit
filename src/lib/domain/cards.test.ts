import { describe, expect, it } from "vitest";

import { CARD_SLOT_ORDER, MATCHUPS_PER_CARD } from "@/config/tiers";

import {
  buildCardMatchups,
  buildExhibitionMatchup,
  buildHourlyMatchups,
  canFillFullCard,
  getCardHour,
  getCardPhase,
  getVoteBudget,
  isCardComplete,
  isValidAllocation,
  needsExhibitionCard,
  pickLeastFoughtPairs,
  pickRandomPair,
  votesRemaining,
  type CardFighter,
} from "./cards";

describe("getCardHour", () => {
  it("buckets instants into a 60-minute window plus 10-minute grace", () => {
    const hour = getCardHour(new Date("2026-08-22T13:37:00.000Z"));
    expect(hour.startsAt.toISOString()).toBe("2026-08-22T13:00:00.000Z");
    expect(hour.endsAt.toISOString()).toBe("2026-08-22T14:00:00.000Z");
    expect(hour.graceEndsAt.toISOString()).toBe("2026-08-22T14:10:00.000Z");
  });

  it("rolls at the hour boundary", () => {
    const before = getCardHour(new Date("2026-08-22T13:59:59.999Z"));
    const after = getCardHour(new Date("2026-08-22T14:00:00.000Z"));
    expect(before.hourKey).not.toBe(after.hourKey);
  });
});

describe("getCardPhase", () => {
  const ends = "2026-08-22T14:00:00.000Z";
  const grace = "2026-08-22T14:10:00.000Z";

  it("is open before the hour ends", () => {
    expect(
      getCardPhase(ends, grace, new Date("2026-08-22T13:59:00.000Z")),
    ).toBe("open");
  });

  it("is grace for ten minutes after the hour", () => {
    expect(
      getCardPhase(ends, grace, new Date("2026-08-22T14:05:00.000Z")),
    ).toBe("grace");
  });

  it("is closed after grace", () => {
    expect(
      getCardPhase(ends, grace, new Date("2026-08-22T14:10:00.000Z")),
    ).toBe("closed");
  });
});

describe("vote budgets", () => {
  it("gives pit 1, undercard 3, and main event 7", () => {
    expect(getVoteBudget("pit")).toBe(1);
    expect(getVoteBudget("undercard")).toBe(3);
    expect(getVoteBudget("main_event")).toBe(7);
  });

  it("accepts splits that spend the whole budget", () => {
    expect(isValidAllocation(1, 0, 1)).toBe(true);
    expect(isValidAllocation(2, 1, 3)).toBe(true);
    expect(isValidAllocation(0, 3, 3)).toBe(true);
    expect(isValidAllocation(4, 3, 7)).toBe(true);
    expect(isValidAllocation(1, 1, 3)).toBe(false);
    expect(isValidAllocation(-1, 4, 3)).toBe(false);
  });
});

describe("votesRemaining / isCardComplete", () => {
  it("tracks six matchups", () => {
    expect(MATCHUPS_PER_CARD).toBe(6);
    expect(votesRemaining(0, 6)).toBe(6);
    expect(votesRemaining(4, 6)).toBe(2);
    expect(isCardComplete(6, 6)).toBe(true);
  });
});

describe("pickLeastFoughtPairs", () => {
  it("pairs unfought companies first without repeats", () => {
    const fighters: CardFighter[] = [
      { id: "d", fightCount: 4 },
      { id: "a", fightCount: 0 },
      { id: "c", fightCount: 2 },
      { id: "b", fightCount: 0 },
      { id: "e", fightCount: 1 },
      { id: "f", fightCount: 1 },
    ];
    expect(pickLeastFoughtPairs(fighters, 3)).toEqual([
      ["a", "b"],
      ["e", "f"],
      ["c", "d"],
    ]);
  });
});

describe("buildCardMatchups", () => {
  it("lays out 3 pit, 2 undercard, and 1 main event with 12 unique companies", () => {
    expect(CARD_SLOT_ORDER).toEqual([
      "pit",
      "pit",
      "pit",
      "undercard",
      "undercard",
      "main_event",
    ]);
    const matchups = buildCardMatchups({
      pit: ids("p", 6),
      undercard: ids("u", 4),
      main_event: ids("m", 2),
    });
    expect(matchups.map((row) => row.tier)).toEqual(CARD_SLOT_ORDER);
    expect(
      new Set(matchups.flatMap((row) => [row.companyAId, row.companyBId])).size,
    ).toBe(12);
  });
});

describe("exhibition matchups", () => {
  it("stays in exhibitions until 6 lightweights, 4 middleweights, and 2 heavyweights list", () => {
    expect(
      needsExhibitionCard({
        pit: ids("p", 2),
        undercard: ids("u", 1),
        main_event: ids("m", 1),
      }),
    ).toBe(true);
    expect(
      needsExhibitionCard({
        pit: ids("p", 12),
        undercard: [],
        main_event: [],
      }),
    ).toBe(true);
    expect(
      canFillFullCard({ pit: 6, undercard: 4, main_event: 1 }),
    ).toBe(false);
    expect(
      needsExhibitionCard({
        pit: ids("p", 6),
        undercard: ids("u", 4),
        main_event: ids("m", 2),
      }),
    ).toBe(false);
  });

  it("picks the same pair for the same seed", () => {
    const fighters = ids("c", 5);
    expect(pickRandomPair(fighters, "hour-100")).toEqual(
      pickRandomPair(fighters, "hour-100"),
    );
  });

  it("pairs two companies from mixed pools as a single pit bout", () => {
    const matchups = buildExhibitionMatchup(
      {
        pit: ids("p", 1),
        undercard: ids("u", 1),
        main_event: [],
      },
      "hour-1",
    );
    expect(matchups).toHaveLength(1);
    expect(matchups[0]!.tier).toBe("pit");
    expect(matchups[0]!.slot).toBe(0);
    expect(new Set([matchups[0]!.companyAId, matchups[0]!.companyBId])).toEqual(
      new Set(["p0", "u0"]),
    );
  });

  it("uses an exhibition plan when any pool is short of its roster", () => {
    const plan = buildHourlyMatchups(
      {
        pit: ids("p", 2),
        undercard: ids("u", 1),
        main_event: ids("m", 1),
      },
      "hour-7",
    );
    expect(plan.kind).toBe("exhibition");
    expect(plan.matchups).toHaveLength(1);
  });

  it("uses the full card once 6 / 4 / 2 are listed", () => {
    const plan = buildHourlyMatchups(
      {
        pit: ids("p", 6),
        undercard: ids("u", 4),
        main_event: ids("m", 2),
      },
      "hour-7",
    );
    expect(plan.kind).toBe("full");
    expect(plan.matchups.map((row) => row.tier)).toEqual(CARD_SLOT_ORDER);
  });
});

function ids(prefix: string, count: number): CardFighter[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    fightCount: 0,
  }));
}
