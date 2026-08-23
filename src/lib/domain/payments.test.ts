import { describe, expect, it } from "vitest";

import {
  isPlacementActive,
  mapCheckoutToPlacement,
  openEndedPlacementWindow,
  OPEN_ENDED_PLACEMENT_ENDS_AT,
} from "./payments";

describe("mapCheckoutToPlacement", () => {
  const now = new Date("2026-08-20T12:00:00.000Z");

  it("sets a one_day window of exactly 24 hours", () => {
    const placement = mapCheckoutToPlacement({
      billingMode: "one_day",
      now,
    });

    expect(placement.status).toBe("active");
    expect(placement.startsAt.toISOString()).toBe(now.toISOString());
    expect(placement.endsAt.toISOString()).toBe("2026-08-21T12:00:00.000Z");
    expect(placement.endsAt.getTime() - placement.startsAt.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
  });

  it("sets daily_renew to an initial 24h window (extended by invoice.paid)", () => {
    const placement = mapCheckoutToPlacement({
      billingMode: "daily_renew",
      now,
    });

    expect(placement.status).toBe("active");
    expect(placement.endsAt.getTime() - placement.startsAt.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
  });
});

describe("isPlacementActive", () => {
  const startsAt = new Date("2026-08-20T12:00:00.000Z");
  const endsAt = new Date("2026-08-21T12:00:00.000Z");

  it("is active within [startsAt, endsAt)", () => {
    expect(
      isPlacementActive({ startsAt, endsAt, status: "active" }, startsAt),
    ).toBe(true);
    expect(
      isPlacementActive(
        { startsAt, endsAt, status: "active" },
        new Date("2026-08-21T11:59:59.999Z"),
      ),
    ).toBe(true);
  });

  it("is inactive at or after endsAt", () => {
    expect(
      isPlacementActive({ startsAt, endsAt, status: "active" }, endsAt),
    ).toBe(false);
  });

  it("is inactive before startsAt", () => {
    expect(
      isPlacementActive(
        { startsAt, endsAt, status: "active" },
        new Date("2026-08-20T11:59:59.999Z"),
      ),
    ).toBe(false);
  });

  it("requires status active", () => {
    expect(
      isPlacementActive({ startsAt, endsAt, status: "expired" }, startsAt),
    ).toBe(false);
    expect(
      isPlacementActive({ startsAt, endsAt, status: "canceled" }, startsAt),
    ).toBe(false);
  });

  it("accepts ISO string timestamps", () => {
    expect(
      isPlacementActive(
        {
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          status: "active",
        },
        new Date("2026-08-20T18:00:00.000Z"),
      ),
    ).toBe(true);
  });
});


describe("openEndedPlacementWindow", () => {
  it("starts now and ends at the open-ended sentinel", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");
    const placement = openEndedPlacementWindow(now);
    expect(placement.status).toBe("active");
    expect(placement.startsAt.toISOString()).toBe(now.toISOString());
    expect(placement.endsAt.toISOString()).toBe(
      OPEN_ENDED_PLACEMENT_ENDS_AT.toISOString(),
    );
  });
});
