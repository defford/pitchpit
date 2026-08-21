import { describe, expect, it } from "vitest";

import { pickRandomPair, selectWeightedTier } from "./pairing";

describe("selectWeightedTier", () => {
  it("returns the only available tier", () => {
    expect(selectWeightedTier(0.99, ["pit"])).toBe("pit");
  });

  it("throws when no tiers are available", () => {
    expect(() => selectWeightedTier(0.5, [])).toThrow(/at least one/i);
  });

  it("renormalizes weights among available tiers", () => {
    // pit 0.65 + main_event 0.10 = 0.75 → pit share = 0.65/0.75 ≈ 0.8667
    expect(selectWeightedTier(0, ["pit", "main_event"])).toBe("pit");
    expect(selectWeightedTier(0.86, ["pit", "main_event"])).toBe("pit");
    expect(selectWeightedTier(0.87, ["pit", "main_event"])).toBe("main_event");
  });

  it("covers the full unit interval for all three tiers", () => {
    // pit 0.65, undercard 0.25, main_event 0.10 — use interior points to avoid float edges
    const tiers = ["pit", "undercard", "main_event"] as const;
    expect(selectWeightedTier(0.0, [...tiers])).toBe("pit");
    expect(selectWeightedTier(0.649, [...tiers])).toBe("pit");
    expect(selectWeightedTier(0.651, [...tiers])).toBe("undercard");
    expect(selectWeightedTier(0.899, [...tiers])).toBe("undercard");
    expect(selectWeightedTier(0.901, [...tiers])).toBe("main_event");
  });
});

describe("pickRandomPair", () => {
  it("throws when fewer than two ids are provided", () => {
    expect(() => pickRandomPair([], () => 0)).toThrow(/at least two/i);
    expect(() => pickRandomPair(["only"], () => 0)).toThrow(/at least two/i);
  });

  it("returns two distinct ids", () => {
    const ids = ["a", "b", "c"];
    const sequence = [0.1, 0.5];
    let i = 0;
    const pair = pickRandomPair(ids, () => sequence[i++] ?? 0);
    expect(pair[0]).not.toBe(pair[1]);
    expect(ids).toContain(pair[0]);
    expect(ids).toContain(pair[1]);
  });

  it("is deterministic for a fixed RNG", () => {
    const ids = ["a", "b", "c", "d"];
    const makeRng = () => {
      const values = [0.0, 0.0];
      let i = 0;
      return () => values[i++] ?? 0;
    };

    expect(pickRandomPair(ids, makeRng())).toEqual(["a", "b"]);
  });
});
