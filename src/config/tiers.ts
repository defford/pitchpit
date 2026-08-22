export type Tier = "pit" | "undercard" | "main_event";
export type BillingMode = "one_day" | "daily_renew";
export type TierIntensity = "plain" | "bold" | "loud";

export type TierConfig = {
  tier: Tier;
  priceCents: number;
  displayLimit: number;
  /** How many same-pool matchups appear on each hourly visitor card. */
  cardMatchups: number;
  /** Best-of series length for Pitch Pit fights in this tier. */
  seriesLength: number;
  label: string;
  intensity: TierIntensity;
};

export const INITIAL_ELO = 1500;
export const ELO_K = 32;
export const SEASON_TIMEZONE = "America/New_York";
/** Ballots a visitor may cast per hourly card (one per matchup). */
export const VOTES_PER_HOUR = 6;

export const TIERS = {
  pit: {
    tier: "pit",
    priceCents: 100,
    displayLimit: 50,
    cardMatchups: 3,
    seriesLength: 1,
    label: "THE PIT",
    intensity: "plain",
  },
  undercard: {
    tier: "undercard",
    priceCents: 500,
    displayLimit: 10,
    cardMatchups: 2,
    seriesLength: 3,
    label: "THE UNDERCARD",
    intensity: "bold",
  },
  main_event: {
    tier: "main_event",
    priceCents: 2000,
    displayLimit: 10,
    cardMatchups: 1,
    seriesLength: 7,
    label: "THE MAIN EVENT",
    intensity: "loud",
  },
} as const satisfies Record<Tier, TierConfig>;

export const DISPLAY_LIMITS: Record<Tier, number> = {
  pit: TIERS.pit.displayLimit,
  undercard: TIERS.undercard.displayLimit,
  main_event: TIERS.main_event.displayLimit,
};

export function getTierConfig(tier: Tier): TierConfig {
  return TIERS[tier];
}

/** Hourly card order: 3 Pit, 2 Undercard, 1 Main Event. */
export const CARD_SLOT_ORDER: Tier[] = (
  ["pit", "undercard", "main_event"] as const
).flatMap((tier) =>
  Array.from({ length: TIERS[tier].cardMatchups }, () => tier),
);
