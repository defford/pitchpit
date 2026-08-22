export type Tier = "pit" | "undercard" | "main_event";
export type BillingMode = "one_day" | "daily_renew";
export type TierIntensity = "plain" | "bold" | "loud";

export type TierConfig = {
  tier: Tier;
  priceCents: number;
  displayLimit: number;
  /** How many same-pool matchups appear on each hourly visitor card. */
  cardMatchups: number;
  /**
   * Points a visitor distributes on a fight in this pool:
   * Pit 1, Undercard 3, Main Event 7.
   */
  seriesLength: number;
  /** Hourly card section name. */
  label: string;
  /** Homepage ranking / listing pool name. */
  boardLabel: string;
  intensity: TierIntensity;
};

export const INITIAL_ELO = 1500;
export const ELO_K = 32;
export const SEASON_TIMEZONE = "America/New_York";
/** Matchups on each hourly card. */
export const MATCHUPS_PER_CARD = 6;
/** Extra minutes to finish a card after the hour closes. */
export const CARD_GRACE_MINUTES = 10;

export const TIERS = {
  pit: {
    tier: "pit",
    priceCents: 100,
    displayLimit: 50,
    cardMatchups: 3,
    seriesLength: 1,
    label: "THE PIT",
    boardLabel: "LIGHTWEIGHTS",
    intensity: "plain",
  },
  undercard: {
    tier: "undercard",
    priceCents: 500,
    displayLimit: 10,
    cardMatchups: 2,
    seriesLength: 3,
    label: "THE UNDERCARD",
    boardLabel: "MIDDLEWEIGHTS",
    intensity: "bold",
  },
  main_event: {
    tier: "main_event",
    priceCents: 2000,
    displayLimit: 10,
    cardMatchups: 1,
    seriesLength: 7,
    label: "THE MAIN EVENT",
    boardLabel: "HEAVYWEIGHTS",
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
