import type { Metadata } from "next";
import Link from "next/link";

import { FaqSheet } from "@/components/marketing/faq-sheet";
import { Button } from "@/components/ui/button";
import { SectionRail } from "@/components/terminal/section-rail";
import { TIERS, type Tier } from "@/config/tiers";
import {
  COMPANY_FAQ,
  COMPANY_STEPS,
  formatPriceCents,
  poolCardShareLabel,
  poolPriceLabel,
} from "@/lib/data/company-guide";
import { getPoolQuotes } from "@/lib/data/occupancy";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How companies list on The Pitch Pit, how the hourly card works, and how daily rankings move.",
};

const POOL_ORDER: Tier[] = ["pit", "undercard", "main_event"];

const FLOOR_POINTS = [
  {
    title: "One card, six fights",
    body: "Each hour opens a full card: 3 Pit, 2 Undercard, and 1 Main Event. You preview the card first, then vote one matchup at a time. Pit is 1 point, Undercard 3, Main Event 7 to split however you want. A 10-minute grace lets you finish if the hour ends mid-card.",
  },
  {
    title: "Unfought names go first",
    body: "Matchups prefer companies that have not battled yet, then whoever has had the fewest fights. A company appears on at most one fight per card.",
  },
  {
    title: "Points, then Elo",
    body: "The points visitors put on a fight are the floor total. When the card closes, the winner’s share of those points moves Elo — a sweep moves more than a 4–3. Rankings update at the hour, not on each ballot.",
  },
];

export default async function HowItWorksPage() {
  const quotes = await getPoolQuotes().catch(() => null);

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-10 border-b border-border pb-8">
          <p className="font-data text-[10px] tracking-[0.2em] text-muted-foreground">
            FOR COMPANIES / LIVE CARD
          </p>
          <h1 className="font-display mt-1 text-4xl leading-none tracking-[0.04em] text-signal sm:text-5xl md:text-6xl">
            HOW THE PIT WORKS
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-silver sm:text-base">
            Bring a pitch. Land on the live rankings. Visitors preview the
            hourly card in The Pitch Pit, vote one fight at a time, and rank
            moves when the hour closes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/#list">List your company</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/the-pitch-pit">See the live card</Link>
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-10">
          <section aria-labelledby="enter-title">
            <SectionRail
              kicker="ENTRY / THREE STEPS"
              title="GET ON THE CARD"
              titleId="enter-title"
            />
            <ol className="mt-4 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {COMPANY_STEPS.map((step) => (
                <li key={step.n} className="bg-card px-4 py-5">
                  <p className="font-data text-[10px] tracking-[0.18em] text-signal">
                    {step.n}
                  </p>
                  <h3 className="font-display mt-2 text-xl tracking-[0.06em] text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-silver">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="pools-title">
            <SectionRail
              kicker="PLACEMENT / PRICE"
              title="THE POOLS"
              titleId="pools-title"
            />
            <div className="mt-4 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
              {POOL_ORDER.map((tier) => {
                const config = TIERS[tier];
                const quote = quotes?.[tier];
                const price = quote
                  ? formatPriceCents(quote.priceCents)
                  : poolPriceLabel(tier);
                return (
                  <article key={tier} className="bg-card px-5 py-5">
                    <p className="font-display text-2xl tracking-[0.06em] text-foreground">
                      {config.boardLabel}
                    </p>
                    <p className="mt-1 font-data text-[10px] tracking-[0.16em] text-muted-foreground">
                      FIGHTS ON {config.label}
                    </p>
                    <p className="font-display mt-4 text-4xl tracking-[0.04em] text-foreground">
                      {price}
                      <span className="ml-1 font-data text-sm tracking-[0.12em] text-muted-foreground">
                        /DAY
                      </span>
                    </p>
                    {quote?.intro ? (
                      <p className="mt-1 font-data text-[10px] tracking-[0.14em] text-signal">
                        FOUNDING RATE · {formatPriceCents(quote.fullPriceCents)}{" "}
                        AFTER {quote.capacity} FILL
                      </p>
                    ) : null}
                    <dl className="mt-4 space-y-2 font-data text-[10px] tracking-[0.14em] text-silver">
                      <div className="flex justify-between gap-4 border-b border-border pb-2">
                        <dt className="text-muted-foreground">NAMES LISTED</dt>
                        <dd>
                          {quote
                            ? `${quote.occupied} / ${config.displayLimit}`
                            : config.displayLimit}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">CARD FIGHTS</dt>
                        <dd>{poolCardShareLabel(tier)}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Every pool is $1/day until that board fills, then it returns to
              list price. Pay once to list.
            </p>
          </section>

          <section aria-labelledby="floor-title">
            <SectionRail
              kicker="THE PITCH PIT / ELO"
              title="HOW RANK MOVES"
              titleId="floor-title"
            />
            <div className="mt-4 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
              {FLOOR_POINTS.map((point) => (
                <article key={point.title} className="bg-card px-5 py-5">
                  <h3 className="font-display text-xl tracking-[0.06em] text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-silver">
                    {point.body}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <FaqSheet items={COMPANY_FAQ} />

          <div className="flex flex-col items-start justify-between gap-4 border border-border bg-card px-5 py-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-data text-[10px] tracking-[0.18em] text-muted-foreground">
                OPEN ENTRY
              </p>
              <p className="font-display text-2xl tracking-[0.06em] text-foreground sm:text-3xl">
                BRING YOUR PITCH
              </p>
              <p className="mt-1 max-w-md text-sm text-silver">
                Submit a link and pitch on the homepage, pick a pool, and pay.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/#list">Join the card</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
