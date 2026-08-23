import type { Tier } from "@/config/tiers";
import type { Intensity } from "@/lib/data/demo";
import type { CardKind, CardMeta, CardPhase } from "@/lib/domain/cards";

export type { CardKind, CardMeta, CardPhase };

export type BattleCompany = {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  clickCount?: number;
  pitch: string;
  elo: number;
  tier: Tier;
  intensity: Intensity;
  wins?: number;
  losses?: number;
  rank?: number;
};

export type BattleStatus = "open" | "resolved" | "expired";

export type CardMatchup = {
  id: string;
  slot: number;
  tier: Tier;
  companyA: BattleCompany;
  companyB: BattleCompany;
  status: BattleStatus;
  pointsA: number;
  pointsB: number;
  voteBudget: number;
  hasVoted: boolean;
  myPointsA: number | null;
  myPointsB: number | null;
  myWinnerId: string | null;
  winnerId?: string | null;
  loserId?: string | null;
};

export type CardSession = {
  sessionComplete: boolean;
  servingGrace: boolean;
  kind: CardKind;
  card: CardMeta;
  matchups: CardMatchup[];
};
