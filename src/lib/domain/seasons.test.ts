import { describe, expect, it } from "vitest";

import {
  getMsUntilSeasonEnd,
  getSeasonBounds,
  getSeasonKey,
  utcHoursForEasternMidnight,
} from "./seasons";

describe("getSeasonKey", () => {
  it("formats the America/New_York calendar day", () => {
    // 2026-08-20 15:00 UTC = 11:00 EDT
    expect(getSeasonKey(new Date("2026-08-20T15:00:00.000Z"))).toBe(
      "2026-08-20",
    );
  });

  it("rolls at Eastern midnight, not UTC midnight", () => {
    // 2026-08-20 03:30 UTC = 2026-08-19 23:30 EDT
    expect(getSeasonKey(new Date("2026-08-20T03:30:00.000Z"))).toBe(
      "2026-08-19",
    );
    // 2026-08-20 04:00 UTC = 2026-08-20 00:00 EDT
    expect(getSeasonKey(new Date("2026-08-20T04:00:00.000Z"))).toBe(
      "2026-08-20",
    );
  });
});

describe("getSeasonBounds", () => {
  it("returns ET midnight start and next-day midnight end (EDT)", () => {
    const { startsAt, endsAt } = getSeasonBounds(
      new Date("2026-08-20T15:00:00.000Z"),
    );
    expect(startsAt.toISOString()).toBe("2026-08-20T04:00:00.000Z");
    expect(endsAt.toISOString()).toBe("2026-08-21T04:00:00.000Z");
  });

  it("handles EST (winter) midnight at 05:00 UTC", () => {
    const { startsAt, endsAt } = getSeasonBounds(
      new Date("2026-01-15T18:00:00.000Z"),
    );
    expect(startsAt.toISOString()).toBe("2026-01-15T05:00:00.000Z");
    expect(endsAt.toISOString()).toBe("2026-01-16T05:00:00.000Z");
  });

  it("spans 23 hours across the spring-forward DST transition", () => {
    // US DST starts 2026-03-08 02:00 local → clocks jump to 03:00
    const { startsAt, endsAt } = getSeasonBounds(
      new Date("2026-03-08T12:00:00.000Z"),
    );
    expect(startsAt.toISOString()).toBe("2026-03-08T05:00:00.000Z"); // EST
    expect(endsAt.toISOString()).toBe("2026-03-09T04:00:00.000Z"); // EDT
    expect(endsAt.getTime() - startsAt.getTime()).toBe(23 * 60 * 60 * 1000);
  });
});

describe("getMsUntilSeasonEnd", () => {
  it("returns remaining milliseconds until Eastern midnight", () => {
    const now = new Date("2026-08-20T04:00:00.000Z");
    expect(getMsUntilSeasonEnd(now)).toBe(24 * 60 * 60 * 1000);
  });

  it("never returns negative values", () => {
    // Exactly at end boundary of 2026-08-20 season → next season key
    const atBoundary = new Date("2026-08-21T04:00:00.000Z");
    expect(getMsUntilSeasonEnd(atBoundary)).toBe(24 * 60 * 60 * 1000);
  });
});

describe("utcHoursForEasternMidnight", () => {
  it("lists both EST and EDT UTC hours", () => {
    expect(utcHoursForEasternMidnight()).toEqual([4, 5]);
  });
});
