import {
  CARD_GRACE_MINUTES,
  CARD_ROSTER_NEEDED,
  CARD_SLOT_ORDER,
  INITIAL_ELO,
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
  elo?: number;
};

export type CardKind = "full" | "exhibition";

export type CardMatchup = {
  tier: Tier;
  slot: number;
  companyAId: string;
  companyBId: string;
};

export type HourlyMatchupPlan = {
  kind: CardKind;
  matchups: CardMatchup[];
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
  const end =
    typeof endsAt === "string" ? Date.parse(endsAt) : endsAt.getTime();
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
  return Math.max(0, matchupCount - votesUsed);
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

const TIER_ORDER: Tier[] = ["pit", "undercard", "main_event"];

export function listedFighterCount(
  byTier: Record<Tier, { id: string }[]>,
): number {
  const seen = new Set<string>();
  for (const tier of TIER_ORDER) {
    for (const fighter of byTier[tier] ?? []) {
      seen.add(fighter.id);
    }
  }
  return seen.size;
}

export function occupancyFromFighters(
  byTier: Record<Tier, { id: string }[]>,
): Record<Tier, number> {
  return {
    pit: byTier.pit?.length ?? 0,
    undercard: byTier.undercard?.length ?? 0,
    main_event: byTier.main_event?.length ?? 0,
  };
}

/** Real cards start only when every pool has its roster: 6 / 4 / 2. */
export function canFillFullCard(occupied: Record<Tier, number>): boolean {
  return TIER_ORDER.every(
    (tier) => occupied[tier] >= CARD_ROSTER_NEEDED[tier],
  );
}

export function needsExhibitionCard(
  byTier: Record<Tier, { id: string }[]>,
): boolean {
  return !canFillFullCard(occupancyFromFighters(byTier));
}

function uniqueFighters(byTier: Record<Tier, CardFighter[]>): CardFighter[] {
  const seen = new Set<string>();
  const fighters: CardFighter[] = [];
  for (const tier of TIER_ORDER) {
    for (const fighter of byTier[tier] ?? []) {
      if (seen.has(fighter.id)) continue;
      seen.add(fighter.id);
      fighters.push(fighter);
    }
  }
  return fighters;
}

function eloOf(fighter: CardFighter): number {
  return fighter.elo ?? INITIAL_ELO;
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function bestPairInPool(
  fighters: CardFighter[],
  excludeIds: Set<string>,
  excludePairKeys: Set<string>,
): [CardFighter, CardFighter] | null {
  const eligible = fighters.filter((fighter) => !excludeIds.has(fighter.id));
  if (eligible.length < 2) return null;

  let best: [CardFighter, CardFighter] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const left = eligible[i]!;
      const right = eligible[j]!;
      if (excludePairKeys.has(pairKey(left.id, right.id))) continue;
      const score =
        (left.fightCount + right.fightCount) * 1_000_000 +
        Math.abs(eloOf(left) - eloOf(right));
      if (score < bestScore) {
        bestScore = score;
        best = left.id < right.id ? [left, right] : [right, left];
      }
    }
  }

  return best;
}

function matchupFromPair(
  tier: Tier,
  pair: [CardFighter, CardFighter],
): CardMatchup {
  return {
    tier,
    slot: 0,
    companyAId: pair[0].id,
    companyBId: pair[1].id,
  };
}

export type ExhibitionPairOptions = {
  excludeIds?: string[];
  excludePairKeys?: string[];
};

/**
 * Picks one exhibition bout: same-pool when possible, fewest fights first,
 * then the closest Elo. Falls back to a Pit-styled mixed bout.
 */
export function pickExhibitionPair(
  byTier: Record<Tier, CardFighter[]>,
  options: ExhibitionPairOptions = {},
): CardMatchup | null {
  const excludeIds = new Set(options.excludeIds ?? []);
  const excludePairKeys = new Set(options.excludePairKeys ?? []);

  const tryPick = (
    ids: Set<string>,
    keys: Set<string>,
  ): CardMatchup | null => {
    let best: {
      tier: Tier;
      pair: [CardFighter, CardFighter];
      score: number;
    } | null = null;

    for (const tier of TIER_ORDER) {
      const pair = bestPairInPool(byTier[tier] ?? [], ids, keys);
      if (!pair) continue;
      const score =
        (pair[0].fightCount + pair[1].fightCount) * 1_000_000 +
        Math.abs(eloOf(pair[0]) - eloOf(pair[1]));
      if (!best || score < best.score) {
        best = { tier, pair, score };
      }
    }

    if (best) return matchupFromPair(best.tier, best.pair);

    const mixed = bestPairInPool(uniqueFighters(byTier), ids, keys);
    return mixed ? matchupFromPair("pit", mixed) : null;
  };

  return (
    tryPick(excludeIds, excludePairKeys) ??
    tryPick(new Set(), excludePairKeys) ??
    tryPick(new Set(), new Set())
  );
}

/**
 * One exhibition while any pool is short of its roster. Style follows the
 * paired companies' pool (Pit / Undercard / Main Event).
 */
export function buildExhibitionMatchup(
  byTier: Record<Tier, CardFighter[]>,
  options: ExhibitionPairOptions = {},
): CardMatchup[] {
  const pair = pickExhibitionPair(byTier, options);
  return pair ? [pair] : [];
}

export function buildHourlyMatchups(
  byTier: Record<Tier, CardFighter[]>,
): HourlyMatchupPlan {
  if (!needsExhibitionCard(byTier)) {
    return { kind: "full", matchups: buildCardMatchups(byTier) };
  }
  return {
    kind: "exhibition",
    matchups: buildExhibitionMatchup(byTier),
  };
}
