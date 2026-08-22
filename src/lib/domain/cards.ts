import {
  CARD_GRACE_MINUTES,
  CARD_SLOT_ORDER,
  MATCHUPS_PER_CARD,
  getTierConfig,
  type Tier,
} from "@/config/tiers";

const HOUR_MS = 60 * 60 * 1000;
export const CARD_GRACE_MS = CARD_GRACE_MINUTES * 60 * 1000;

export type CardHour = {
  hourKey: string;
  startsAt: Date;
  endsAt: Date;
  graceEndsAt: Date;
};

export type CardPhase = "open" | "grace" | "closed";

export type CardFighter = {
  id: string;
  fightCount: number;
};

export type CardMatchup = {
  tier: Tier;
  slot: number;
  companyAId: string;
  companyBId: string;
};

export type CardMeta = {
  id: string;
  hourKey: string;
  startsAt: string;
  endsAt: string;
  graceEndsAt: string;
  phase: CardPhase;
  matchupCount: number;
  votesUsed: number;
  votesRemaining: number;
};

/**
 * UTC hour bucket for the shared Pitch Pit card (exactly 60 minutes),
 * plus a 10-minute grace window after the hour.
 */
export function getCardHour(date: Date): CardHour {
  const index = Math.floor(date.getTime() / HOUR_MS);
  const startsAt = new Date(index * HOUR_MS);
  const endsAt = new Date(startsAt.getTime() + HOUR_MS);
  const graceEndsAt = new Date(endsAt.getTime() + CARD_GRACE_MS);
  return { hourKey: String(index), startsAt, endsAt, graceEndsAt };
}

export function getCardPhase(
  endsAt: Date | string,
  graceEndsAt: Date | string,
  now = new Date(),
): CardPhase {
  const end = typeof endsAt === "string" ? Date.parse(endsAt) : endsAt.getTime();
  const grace =
    typeof graceEndsAt === "string"
      ? Date.parse(graceEndsAt)
      : graceEndsAt.getTime();
  const t = now.getTime();
  if (t < end) return "open";
  if (t < grace) return "grace";
  return "closed";
}

/** Points a visitor distributes on one fight (Pit 1, Undercard 3, Main 7). */
export function getVoteBudget(tier: Tier): number {
  return getTierConfig(tier).seriesLength;
}

export function isValidAllocation(
  pointsA: number,
  pointsB: number,
  budget: number,
): boolean {
  return (
    Number.isInteger(pointsA) &&
    Number.isInteger(pointsB) &&
    pointsA >= 0 &&
    pointsB >= 0 &&
    pointsA + pointsB === budget
  );
}

export function votesRemaining(
  votesUsed: number,
  matchupCount: number,
): number {
  return Math.max(0, Math.min(matchupCount, MATCHUPS_PER_CARD) - votesUsed);
}

export function isCardComplete(
  votesUsed: number,
  matchupCount: number,
): boolean {
  return votesRemaining(votesUsed, matchupCount) === 0;
}

/**
 * Pairs companies with the fewest fights first so everyone gets a shot.
 * Stable when counts tie (sort by id). Never repeats a company.
 */
export function pickLeastFoughtPairs(
  fighters: CardFighter[],
  pairCount: number,
): [string, string][] {
  if (pairCount <= 0 || fighters.length < 2) return [];

  const sorted = [...fighters].sort((a, b) => {
    if (a.fightCount !== b.fightCount) return a.fightCount - b.fightCount;
    return a.id.localeCompare(b.id);
  });

  const pairs: [string, string][] = [];
  const used = new Set<string>();

  for (let i = 0; i < sorted.length && pairs.length < pairCount; i++) {
    const a = sorted[i]!;
    if (used.has(a.id)) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j]!;
      if (used.has(b.id)) continue;
      pairs.push([a.id, b.id]);
      used.add(a.id);
      used.add(b.id);
      break;
    }
  }

  return pairs;
}

/**
 * Builds the hourly card: 3 Pit, 2 Undercard, 1 Main Event, skipping a slot
 * when that pool cannot field a pair. A company appears on at most one fight.
 */
export function buildCardMatchups(
  byTier: Record<Tier, CardFighter[]>,
): CardMatchup[] {
  const needed: Record<Tier, number> = {
    pit: 0,
    undercard: 0,
    main_event: 0,
  };
  for (const tier of CARD_SLOT_ORDER) {
    needed[tier] += 1;
  }

  const pairsByTier: Record<Tier, [string, string][]> = {
    pit: pickLeastFoughtPairs(byTier.pit ?? [], needed.pit),
    undercard: pickLeastFoughtPairs(byTier.undercard ?? [], needed.undercard),
    main_event: pickLeastFoughtPairs(
      byTier.main_event ?? [],
      needed.main_event,
    ),
  };

  const cursor: Record<Tier, number> = {
    pit: 0,
    undercard: 0,
    main_event: 0,
  };
  const matchups: CardMatchup[] = [];

  for (const tier of CARD_SLOT_ORDER) {
    const pair = pairsByTier[tier][cursor[tier]];
    if (!pair) continue;
    cursor[tier] += 1;
    matchups.push({
      tier,
      slot: matchups.length,
      companyAId: pair[0],
      companyBId: pair[1],
    });
  }

  return matchups;
}
