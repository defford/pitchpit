import type { Tier } from "@/config/tiers";
import type { Intensity } from "@/lib/data/demo";

export type BattleCompany = {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  pitch: string;
  elo: number;
  tier: Tier;
  intensity: Intensity;
  wins?: number;
  losses?: number;
  rank?: number;
};

export type BattleStatus = "open" | "resolved" | "expired";

export type BattlePayload = {
  id: string;
  tier: Tier;
  companyA: BattleCompany;
  companyB: BattleCompany;
  status: BattleStatus;
  votesA: number;
  votesB: number;
  votesToWin: number;
  hasVoted: boolean;
  myWinnerId: string | null;
  winnerId?: string | null;
  loserId?: string | null;
  winnerEloBefore?: number | null;
  loserEloBefore?: number | null;
  winnerEloAfter?: number | null;
  loserEloAfter?: number | null;
};

export type VoteOutcome = {
  winner: BattleCompany;
  loser: BattleCompany;
  winnerEloBefore: number;
  winnerEloAfter: number;
  loserEloBefore: number;
  loserEloAfter: number;
  votesA: number;
  votesB: number;
};
