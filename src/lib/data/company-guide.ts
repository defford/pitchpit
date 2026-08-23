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
    title: "Pick a pool",
    body: "Choose Lightweights, Middleweights, or Heavyweights. Your name lands in that pool as soon as you submit.",
  },
  {
    n: "03",
    title: "Fight for rank",
    body: "Until 6 lightweights, 4 middleweights, and 2 heavyweights list, visitors play exhibitions — vote as many same-pool matchups as you want. After that, they see six matchups an hour. Companies that have not battled yet get the next shot; rating moves when the hour closes.",
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
      "On the homepage, submit your website and pitch and pick a pool. There is no login. The logo is pulled from the website. You land on the card right away.",
  },
  {
    id: "pools",
    question: "What are Heavyweights, Middleweights, and Lightweights?",
    answer: poolAnswer(),
  },
  {
    id: "fights",
    question: "How do fights work?",
    answer:
      "The Pitch Pit is the open floor. Until 6 lightweights, 4 middleweights, and 2 heavyweights list, visitors vote exhibitions endlessly — each bout pairs the least-fought names with similar Elo, in that pool’s style (Pit 1, Undercard 3, Main Event 7). After that roster fills, visitors get a full card: 3 Pit, 2 Undercard, and 1 Main Event. They preview, then vote one matchup at a time. Pairings prefer companies that have not battled yet, then the fewest fights, and a company only appears once per card. If the hour ends mid-card you get 10 minutes of grace to finish. Then the floor totals lock and Elo moves.",
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
      "Every night at midnight, America/New_York. Ratings return to the session start value. Your listing stays on the card; the scoreboard is a new card.",
  },
  {
    id: "switch",
    question: "Can I switch pools after I submit?",
    answer:
      "Yes. Submit the same website again with a different pool. Your listing moves to the pool you pick.",
  },
  {
    id: "vote",
    question: "Who can vote?",
    answer:
      "Anyone on the site. Voters stay anonymous. You do not need an account to enter The Pitch Pit. During exhibitions you vote as many matchups as you want. After the roster fills, each visitor previews the hourly card, then votes one fight at a time (1 / 3 / 7 points by pool), then waits for the next card.",
  },
];

export function poolCardShareLabel(tier: Tier): string {
  const n = TIERS[tier].cardMatchups;
  return `${n} FIGHTS / CARD`;
}

function poolAnswer(): string {
  const pit = TIERS.pit;
  const under = TIERS.undercard;
  const main = TIERS.main_event;
  return (
    `Three pools on the card: ${pit.boardLabel} (up to ${pit.displayLimit} names, ${pit.cardMatchups} fights per card), ` +
    `${under.boardLabel} (up to ${under.displayLimit}, ${under.cardMatchups} fights), and ` +
    `${main.boardLabel} (up to ${main.displayLimit}, ${main.cardMatchups} fight). ` +
    `Pick the pool that fits your pitch.`
  );
}
