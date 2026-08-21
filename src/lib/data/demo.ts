import { getTierConfig, type Tier, type TierIntensity } from "@/config/tiers";
import { getSeasonBounds } from "@/lib/domain/seasons";

export type Intensity = TierIntensity;
export type LeaderboardTier = Tier;

export type LeaderboardCompany = {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  pitch: string;
  elo: number;
  rank: number;
  tier: LeaderboardTier;
  intensity: Intensity;
  wins?: number;
  losses?: number;
  rankDelta?: number;
};

export type LeaderboardsPayload = {
  mainEvent: LeaderboardCompany[];
  undercard: LeaderboardCompany[];
  pit: LeaderboardCompany[];
  seasonEndsAt: string;
};

const MAIN_EVENT_NAMES = [
  "Gary",
  "OmniAI",
  "Apex Signal",
  "Goldline Labs",
  "Pulse Foundry",
  "Crown Circuit",
  "Volt Harbor",
  "Ember Stack",
  "Ridge Capital",
  "Halo Metrics",
];

const UNDERCARD_NAMES = [
  "Silverline Soft",
  "Northwind Ops",
  "Parcel Grid",
  "Blueprint AI",
  "Canvas Crew",
  "Relay Desk",
  "Orbit Payroll",
  "Fieldnote",
  "Quarry Cloud",
  "Sable Analytics",
];

const PIT_NAMES = [
  "Tiny Ticket",
  "Mugshot Coffee",
  "Lane Logistics",
  "Pixel Pantry",
  "Drift Tools",
  "Cobalt Cards",
  "Nest Notes",
  "Fathom Forms",
  "Spark Hire",
  "Willow Wallet",
  "Brick Batch",
  "Cedar CRM",
  "Dusty Data",
  "Hollow Host",
  "Maple Maps",
  "Pebble Pay",
  "Rustic Route",
  "Slate Studio",
  "Tide Tasks",
  "Urban Util",
  "Velvet Vault",
  "Wick Widgets",
  "Yonder Yield",
  "Zinc Zone",
  "Arrow Apps",
  "Beacon Bits",
  "Copper Cloud",
  "Delta Draft",
  "Echo Engine",
  "Frost Frame",
  "Grain Grid",
  "Harbor Hub",
  "Ivory Inbox",
  "Jade Jobs",
  "Keen Keys",
  "Lumen Link",
  "Moss Metrics",
  "Nimbus Nest",
  "Onyx Ops",
  "Pine Pack",
  "Quartz Queue",
  "Raven Route",
  "Summit Sync",
  "Torch Track",
  "Umbra UI",
  "Vapor View",
  "Wisp Wire",
  "Xeric XR",
  "Yellow Yard",
  "Zephyr Zip",
];

const PITCHES: Record<string, string> = {
  Gary: "I am Gary.",
  OmniAI: "The operating system for work.",
};

const DEMO_DELTAS = [0, 1, -1, 2, -2, 0, 3, -1, 4, -3];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function company(
  name: string,
  tier: LeaderboardTier,
  rank: number,
  elo: number,
): LeaderboardCompany {
  const slug = slugify(name);
  const { intensity } = getTierConfig(tier);
  return {
    id: `demo-${tier}-${rank}`,
    name,
    logoUrl: null,
    websiteUrl: `https://example.com/${slug}`,
    pitch:
      PITCHES[name] ?? `${name} pitches hard in the ${tier.replace("_", " ")}.`,
    elo,
    rank,
    tier,
    intensity,
    wins: Math.max(0, 14 - rank),
    losses: Math.max(0, Math.floor(rank / 2)),
    rankDelta: DEMO_DELTAS[(rank - 1) % DEMO_DELTAS.length],
  };
}

export function getDemoLeaderboards(now = new Date()): LeaderboardsPayload {
  const mainEvent = MAIN_EVENT_NAMES.map((name, i) =>
    company(name, "main_event", i + 1, 2100 - i * 18),
  );
  const undercard = UNDERCARD_NAMES.map((name, i) =>
    company(name, "undercard", i + 1, 1750 - i * 12),
  );
  const pit = PIT_NAMES.map((name, i) =>
    company(name, "pit", i + 1, 1500 - i * 4),
  );

  return {
    mainEvent,
    undercard,
    pit,
    seasonEndsAt: getSeasonBounds(now).endsAt.toISOString(),
  };
}
