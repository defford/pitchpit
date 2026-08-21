export type Tier = "pit" | "undercard" | "main_event";
export type BillingMode = "one_day" | "daily_renew";
export type TierIntensity = "plain" | "bold" | "loud";

export type TierConfig = {
  tier: Tier;
  priceCents: number;
  displayLimit: number;
  battleWeight: number;
  label: string;
  intensity: TierIntensity;
};

export const INITIAL_ELO = 1500;
export const ELO_K = 32;
export const SEASON_TIMEZONE = "America/New_York";

export const TIERS = {
  pit: {
    tier: "pit",
    priceCents: 100,
    displayLimit: 50,
    battleWeight: 0.65,
    label: "THE PIT",
    intensity: "plain",
  },
  undercard: {
    tier: "undercard",
    priceCents: 500,
    displayLimit: 10,
    battleWeight: 0.25,
    label: "THE UNDERCARD",
    intensity: "bold",
  },
  main_event: {
    tier: "main_event",
    priceCents: 2000,
    displayLimit: 10,
    battleWeight: 0.1,
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

export function getBattleWeights(): Record<Tier, number> {
  return {
    pit: TIERS.pit.battleWeight,
    undercard: TIERS.undercard.battleWeight,
    main_event: TIERS.main_event.battleWeight,
  };
}
