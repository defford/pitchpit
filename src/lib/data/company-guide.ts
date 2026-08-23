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
    title: "Submit a pitch",
    body: "Drop your website and a short pitch on the homepage. No account. Pick Lightweights, Middleweights, or Heavyweights.",
  },
  {
    n: "02",
    title: "Pay for the pool",
    body: "Pay once for the pool you picked. Stripe Checkout is the pay link for that tier.",
  },
  {
    n: "03",
    title: "Fight for rank",
    body: "Your name lands on the live card after payment. Visitors see six matchups an hour in The Pitch Pit. Companies that have not battled yet get the next shot; rating moves when the hour closes.",
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
      "On the homepage, submit your website and pitch, pick a pool, and pay. There is no login. The logo is pulled from the website. You land on the card after Stripe confirms payment.",
  },
  {
    id: "pools",
    question: "What are Heavyweights, Middleweights, and Lightweights?",
    answer: poolCostAnswer(),
  },
  {
    id: "approval",
    question: "Will I be charged if I never finish checkout?",
    answer:
      "No. You only pay on Stripe Checkout. Canceling checkout leaves a draft pitch you can submit again. Admins can still suspend a listing after it is live.",
  },
  {
    id: "fights",
    question: "How do fights work?",
    answer:
      "The Pitch Pit is the open floor. Each hour visitors get one full card: 3 Pit, 2 Undercard, and 1 Main Event. They preview the card, then vote one matchup at a time. Pairings prefer companies that have not battled yet, then the fewest fights, and a company only appears once per card. Pit is 1 point, Undercard 3, Main Event 7 — split however you want. If the hour ends mid-card you get 10 minutes of grace to finish. Then the floor totals lock and Elo moves.",
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
      "Yes. Submit the same website again with a different pool and pay for that tier. Checkout uses the pool you choose when you pay.",
  },
  {
    id: "vote",
    question: "Who can vote?",
    answer:
      "Anyone on the site. Voters stay anonymous. You do not need an account to enter The Pitch Pit. Each visitor previews the hourly card, then votes one fight at a time (1 / 3 / 7 points by pool), then waits for the next card.",
  },
];

export function formatPriceCents(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function poolPriceLabel(
  tier: Tier,
  priceCents = TIERS[tier].priceCents,
): string {
  return formatPriceCents(priceCents);
}

export function poolCardShareLabel(tier: Tier): string {
  const n = TIERS[tier].cardMatchups;
  return `${n} FIGHT${n === 1 ? "" : "S"} / CARD`;
}

function poolCostAnswer(): string {
  const pit = TIERS.pit;
  const under = TIERS.undercard;
  const main = TIERS.main_event;
  return `Every pool is $1/day until that pool’s names are filled (${pit.displayLimit} ${pit.boardLabel.toLowerCase()}, ${under.displayLimit} ${under.boardLabel.toLowerCase()}, ${main.displayLimit} ${main.boardLabel.toLowerCase()}). After a pool fills it returns to list price: ${poolPriceLabel("pit")} / ${poolPriceLabel("undercard")} / ${poolPriceLabel("main_event")} a day. ${pit.boardLabel} already lists at $1.`;
}
