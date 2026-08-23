import { describe, expect, it } from "vitest";

import { DISPLAY_LIMITS, INTRO_PRICE_CENTS, TIERS } from "@/config/tiers";

import {
  listingPriceCents,
  occupiedListingCount,
  quotePool,
  quotePools,
} from "./pricing";

describe("listingPriceCents", () => {
  it("charges the intro rate while a pool still has open slots", () => {
    expect(listingPriceCents(0, 10, 2000)).toBe(INTRO_PRICE_CENTS);
    expect(listingPriceCents(9, 10, 500)).toBe(INTRO_PRICE_CENTS);
  });

  it("returns list price once the pool is full", () => {
    expect(listingPriceCents(10, 10, 2000)).toBe(2000);
    expect(listingPriceCents(11, 10, 500)).toBe(500);
  });

  it("never undercuts a pool whose list price is already the intro rate", () => {
    expect(listingPriceCents(0, 50, 100)).toBe(100);
    expect(listingPriceCents(50, 50, 100)).toBe(100);
  });
});

describe("quotePool", () => {
  it("marks undercard and main event as intro until they fill", () => {
    const open = quotePool("main_event", 0);
    expect(open.intro).toBe(true);
    expect(open.priceCents).toBe(INTRO_PRICE_CENTS);
    expect(open.fullPriceCents).toBe(TIERS.main_event.priceCents);
    expect(open.capacity).toBe(DISPLAY_LIMITS.main_event);

    const full = quotePool("main_event", DISPLAY_LIMITS.main_event);
    expect(full.intro).toBe(false);
    expect(full.priceCents).toBe(TIERS.main_event.priceCents);
  });

  it("does not flag pit as intro because list price is already $1", () => {
    const quote = quotePool("pit", 1);
    expect(quote.intro).toBe(false);
    expect(quote.priceCents).toBe(TIERS.pit.priceCents);
  });
});

describe("quotePools", () => {
  it("quotes each pool from its own occupancy", () => {
    const quotes = quotePools({
      pit: 1,
      undercard: DISPLAY_LIMITS.undercard,
      main_event: 3,
    });
    expect(quotes.pit.priceCents).toBe(100);
    expect(quotes.undercard.intro).toBe(false);
    expect(quotes.undercard.priceCents).toBe(TIERS.undercard.priceCents);
    expect(quotes.main_event.intro).toBe(true);
    expect(quotes.main_event.priceCents).toBe(INTRO_PRICE_CENTS);
  });

  it("sums occupancy across pools", () => {
    const quotes = quotePools({ pit: 1, undercard: 2, main_event: 3 });
    expect(occupiedListingCount(quotes)).toBe(6);
  });
});
