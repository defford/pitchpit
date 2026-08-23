import {
  DISPLAY_LIMITS,
  INTRO_PRICE_CENTS,
  TIERS,
  type Tier,
} from "@/config/tiers";

export type PoolQuote = {
  tier: Tier;
  occupied: number;
  capacity: number;
  priceCents: number;
  fullPriceCents: number;
  intro: boolean;
};

export function emptyOccupancy(): Record<Tier, number> {
  return { pit: 0, undercard: 0, main_event: 0 };
}

/**
 * $1 while a pool still has open display slots; list price once it is full.
 * A pool whose list price is already $1 stays $1 either way.
 */
export function listingPriceCents(
  occupied: number,
  capacity: number,
  fullPriceCents: number,
): number {
  if (occupied >= capacity) return fullPriceCents;
  return Math.min(INTRO_PRICE_CENTS, fullPriceCents);
}

export function quotePool(tier: Tier, occupied: number): PoolQuote {
  const fullPriceCents = TIERS[tier].priceCents;
  const capacity = DISPLAY_LIMITS[tier];
  const safeOccupied = Math.max(0, occupied);
  const priceCents = listingPriceCents(safeOccupied, capacity, fullPriceCents);
  return {
    tier,
    occupied: safeOccupied,
    capacity,
    priceCents,
    fullPriceCents,
    intro: priceCents < fullPriceCents,
  };
}

export function quotePools(
  occupied: Record<Tier, number>,
): Record<Tier, PoolQuote> {
  return {
    pit: quotePool("pit", occupied.pit),
    undercard: quotePool("undercard", occupied.undercard),
    main_event: quotePool("main_event", occupied.main_event),
  };
}

export function occupiedListingCount(quotes: Record<Tier, PoolQuote>): number {
  return (
    quotes.pit.occupied + quotes.undercard.occupied + quotes.main_event.occupied
  );
}
