import { TIERS, type Tier } from "@/config/tiers";

export type CompanyStep = {
  n: string;
  title: string;
  body: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const COMPANY_STEPS: CompanyStep[] = [
  {
    n: "01",
    title: "Sign in",
    body: "Use a magic link on Join. That email becomes the owner login for your listing and billing.",
  },
  {
    n: "02",
    title: "Submit a pitch",
    body: "Name, website, and a short pitch. Pick a pool and whether you want a one-day pass or daily renew.",
  },
  {
    n: "03",
    title: "Wait for approval",
    body: "An admin reviews the listing first. Rejected submissions are never charged. You can revise and resubmit.",
  },
  {
    n: "04",
    title: "Buy a placement",
    body: "Once approved, pay for the pool. A one-day pass lasts 24 hours. Daily renew keeps you in until you cancel.",
  },
  {
    n: "05",
    title: "Fight for rank",
    body: "Your name lands on the live card. Visitors see six matchups an hour in The Pitch Pit. Companies that have not battled yet get the next shot; rating moves when the hour closes.",
  },
];

export const COMPANY_FAQ: FaqItem[] = [
  {
    id: "what",
    question: "What is The Pitch Pit?",
    answer:
      "A live ranking exchange for companies. Visitors split points on a shared hourly card of six matchups. Rankings update when the card closes. The scoreboard resets at the end of each Eastern-time session.",
  },
  {
    id: "list",
    question: "How do I get my company listed?",
    answer:
      "Sign in with a magic link, submit your name, website, and pitch, then wait for approval. Checkout only opens after an admin approves the listing.",
  },
  {
    id: "pools",
    question: "What are the three pools, and what do they cost?",
    answer: poolCostAnswer(),
  },
  {
    id: "billing",
    question: "What’s the difference between a one-day pass and daily renew?",
    answer:
      "A one-day pass is a single 24-hour placement. Daily renew bills each day and extends the placement until you cancel in the Stripe customer portal from your dashboard.",
  },
  {
    id: "approval",
    question: "Will I be charged if my listing is rejected?",
    answer:
      "No. Approval is required before checkout. Rejected submissions are never charged. You can update the listing and submit it again.",
  },
  {
    id: "fights",
    question: "How do fights work?",
    answer:
      "The Pitch Pit is the open floor. Each hour visitors get one full card: 3 Pit, 2 Undercard, and 1 Main Event. Pairings prefer companies that have not battled yet, then the fewest fights, and a company only appears once per card. Pit is 1 point, Undercard 3, Main Event 7 — split however you want. If the hour ends mid-card you get 10 minutes of grace to finish. Then the floor totals lock and Elo moves.",
  },
  {
    id: "rank",
    question: "How do rankings actually move?",
    answer:
      "When a card closes (hour plus a 10-minute grace), each fight counts as one Elo match (K=32) from the winner’s share of the points. A 7–0 sweep moves more than a 4–3. Same-pool fights only. Rankings do not move on each ballot.",
  },
  {
    id: "reset",
    question: "When does a season reset?",
    answer:
      "Every night at midnight, America/New_York. Ratings return to the session start value. A paid placement can still be active the next day; the scoreboard is a new card.",
  },
  {
    id: "switch",
    question: "Can I switch pools after I submit?",
    answer:
      "Yes. Update the listing on your dashboard and resubmit for review. Checkout uses the pool you choose when you pay.",
  },
  {
    id: "vote",
    question: "Who can vote?",
    answer:
      "Anyone on the site. Voters stay anonymous. You do not need an account to enter The Pitch Pit. Each visitor sees the full hourly card, votes each fight once (1 / 3 / 7 points by pool), then waits for the next card.",
  },
];

export function poolPriceLabel(tier: Tier): string {
  const cents = TIERS[tier].priceCents;
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function poolCardShareLabel(tier: Tier): string {
  const n = TIERS[tier].cardMatchups;
  return `${n} FIGHT${n === 1 ? "" : "S"} / CARD`;
}

function poolCostAnswer(): string {
  const pit = TIERS.pit;
  const under = TIERS.undercard;
  const main = TIERS.main_event;
  return `${pit.label} is ${poolPriceLabel("pit")}/day (${pit.displayLimit} names, ${poolCardShareLabel("pit")}). ${under.label} is ${poolPriceLabel("undercard")}/day (${under.displayLimit} names, ${poolCardShareLabel("undercard")}). ${main.label} is ${poolPriceLabel("main_event")}/day (${main.displayLimit} names, ${poolCardShareLabel("main_event")}).`;
}
