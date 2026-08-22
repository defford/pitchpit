import { describe, expect, it } from "vitest";

import { CARD_SLOT_ORDER, VOTES_PER_HOUR } from "@/config/tiers";

import {
  buildCardMatchups,
  getCardHour,
  isCardComplete,
  pickLeastFoughtPairs,
  selectCardBattle,
  votesRemaining,
  type CardFighter,
} from "./cards";

describe("getCardHour", () => {
  it("buckets instants into exact 60-minute UTC windows", () => {
    const hour = getCardHour(new Date("2026-08-22T13:37:00.000Z"));
    expect(hour.startsAt.toISOString()).toBe("2026-08-22T13:00:00.000Z");
    expect(hour.endsAt.toISOString()).toBe("2026-08-22T14:00:00.000Z");
    expect(hour.hourKey).toBe(
      String(Date.parse("2026-08-22T13:00:00.000Z") / 3_600_000),
    );
  });

  it("rolls at the hour boundary", () => {
    const before = getCardHour(new Date("2026-08-22T13:59:59.999Z"));
    const after = getCardHour(new Date("2026-08-22T14:00:00.000Z"));
    expect(before.hourKey).not.toBe(after.hourKey);
    expect(after.startsAt.toISOString()).toBe("2026-08-22T14:00:00.000Z");
  });
});

describe("votesRemaining / isCardComplete", () => {
  it("caps at six votes per hour", () => {
    expect(VOTES_PER_HOUR).toBe(6);
    expect(votesRemaining(0, 6)).toBe(6);
    expect(votesRemaining(4, 6)).toBe(2);
    expect(votesRemaining(6, 6)).toBe(0);
    expect(isCardComplete(6, 6)).toBe(true);
  });

  it("completes early when the card has fewer matchups", () => {
    expect(votesRemaining(4, 4)).toBe(0);
    expect(isCardComplete(4, 4)).toBe(true);
    expect(isCardComplete(3, 4)).toBe(false);
  });
});

describe("pickLeastFoughtPairs", () => {
  it("returns nothing when a pair cannot be formed", () => {
    expect(pickLeastFoughtPairs([], 3)).toEqual([]);
    expect(pickLeastFoughtPairs([{ id: "a", fightCount: 0 }], 1)).toEqual([]);
    expect(
      pickLeastFoughtPairs(
        [
          { id: "a", fightCount: 0 },
          { id: "b", fightCount: 1 },
        ],
        0,
      ),
    ).toEqual([]);
  });

  it("pairs the lowest fight counts without repeating a company", () => {
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

  it("stops when the pool runs out of unused companies", () => {
    const fighters: CardFighter[] = [
      { id: "a", fightCount: 0 },
      { id: "b", fightCount: 0 },
      { id: "c", fightCount: 0 },
    ];
    expect(pickLeastFoughtPairs(fighters, 3)).toEqual([["a", "b"]]);
  });
});

describe("buildCardMatchups", () => {
  it("lays out 3 pit, 2 undercard, and 1 main event", () => {
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
    expect(matchups.map((row) => row.slot)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(
      new Set(matchups.flatMap((row) => [row.companyAId, row.companyBId])).size,
    ).toBe(12);
  });

  it("skips a slot when a pool cannot field a pair", () => {
    const matchups = buildCardMatchups({
      pit: ids("p", 4),
      undercard: ids("u", 2),
      main_event: ids("m", 1),
    });
    expect(matchups.map((row) => row.tier)).toEqual([
      "pit",
      "pit",
      "undercard",
    ]);
  });
});

describe("selectCardBattle", () => {
  const battles = [
    { id: "b0", slot: 0 },
    { id: "b1", slot: 1 },
    { id: "b2", slot: 2 },
  ];

  it("returns the first unvoted fight", () => {
    expect(selectCardBattle(battles, [])).toEqual({ id: "b0", slot: 0 });
    expect(selectCardBattle(battles, ["b0"])).toEqual({ id: "b1", slot: 1 });
  });

  it("advances past a just-voted fight", () => {
    expect(selectCardBattle(battles, ["b0"], { afterBattleId: "b0" })).toEqual({
      id: "b1",
      slot: 1,
    });
  });

  it("skips an unvoted fight and wraps to earlier unvoted slots", () => {
    expect(
      selectCardBattle(battles, [], { afterBattleId: "b0", skip: true }),
    ).toEqual({ id: "b1", slot: 1 });
    expect(
      selectCardBattle(battles, ["b1"], { afterBattleId: "b2", skip: true }),
    ).toEqual({ id: "b0", slot: 0 });
  });

  it("returns null when every fight is voted", () => {
    expect(selectCardBattle(battles, ["b0", "b1", "b2"])).toBeNull();
  });
});

function ids(prefix: string, count: number): CardFighter[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    fightCount: 0,
  }));
}
