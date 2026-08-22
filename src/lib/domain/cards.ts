import { CARD_SLOT_ORDER, VOTES_PER_HOUR, type Tier } from "@/config/tiers";

const HOUR_MS = 60 * 60 * 1000;

export type CardHour = {
  hourKey: string;
  startsAt: Date;
  endsAt: Date;
};

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

export type CardBattleRef = {
  id: string;
  slot: number;
};

export type CardMeta = {
  id: string;
  hourKey: string;
  startsAt: string;
  endsAt: string;
  slot: number;
  matchupCount: number;
  votesUsed: number;
  votesRemaining: number;
};

/**
 * UTC hour bucket for the shared Decagon card (exactly 60 minutes).
 */
export function getCardHour(date: Date): CardHour {
  const index = Math.floor(date.getTime() / HOUR_MS);
  const startsAt = new Date(index * HOUR_MS);
  const endsAt = new Date(startsAt.getTime() + HOUR_MS);
  return { hourKey: String(index), startsAt, endsAt };
}

export function votesRemaining(votesUsed: number, matchupCount: number): number {
  return Math.max(0, Math.min(matchupCount, VOTES_PER_HOUR) - votesUsed);
}

export function isCardComplete(votesUsed: number, matchupCount: number): boolean {
  return votesRemaining(votesUsed, matchupCount) === 0;
}

/**
 * Pairs the least-fought companies in a pool so everyone gets a shot.
 * Stable when counts tie (sort by id). Never repeats a company in the result.
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
 * when that pool cannot field a pair.
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
    main_event: pickLeastFoughtPairs(byTier.main_event ?? [], needed.main_event),
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

/**
 * Next fight on the card for this visitor. `skip` walks past the current
 * unvoted slot; otherwise returns the first unvoted after `afterBattleId`.
 */
export function selectCardBattle(
  battles: CardBattleRef[],
  votedBattleIds: Iterable<string>,
  options: { afterBattleId?: string | null; skip?: boolean } = {},
): CardBattleRef | null {
  const voted = new Set(votedBattleIds);
  const ordered = [...battles].sort((a, b) => a.slot - b.slot);
  const unvoted = ordered.filter((battle) => !voted.has(battle.id));
  if (unvoted.length === 0) return null;

  const afterBattleId = options.afterBattleId ?? null;
  if (!afterBattleId) return unvoted[0] ?? null;

  const afterSlot =
    ordered.find((battle) => battle.id === afterBattleId)?.slot ?? -1;
  const candidates = options.skip
    ? unvoted.filter((battle) => battle.id !== afterBattleId)
    : unvoted;
  if (candidates.length === 0) return unvoted[0] ?? null;

  const later = candidates.filter((battle) => battle.slot > afterSlot);
  return later[0] ?? candidates[0] ?? null;
}
