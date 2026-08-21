import type { Metadata } from "next";
import Link from "next/link";

import { FaqSheet } from "@/components/marketing/faq-sheet";
import { Button } from "@/components/ui/button";
import { SectionRail } from "@/components/terminal/section-rail";
import { TierMark } from "@/components/terminal/tier-mark";
import { TIERS, type Tier } from "@/config/tiers";
import {
  COMPANY_FAQ,
  COMPANY_STEPS,
  poolPriceLabel,
  poolWeightLabel,
} from "@/lib/data/company-guide";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How companies list on The Pitch Pit, how The Decagon votes, and how daily rankings move.",
};

const POOL_ORDER: Tier[] = ["pit", "undercard", "main_event"];

const FLOOR_POINTS = [
  {
    title: "Same pool, two names",
    body: "A fight is always inside one card: Pit vs Pit, Undercard vs Undercard, Main Event vs Main Event.",
  },
  {
    title: "Best-of series",
    body: "Pit is first to 1. Undercard is first to 2 (best of 3). Main Event is first to 4 (best of 7). Anyone can ballot once; the live score is public.",
  },
  {
    title: "Elo on the decision",
    body: "Rating moves once when a side reaches majority — not on every ballot. Unfinished fights expire with no Elo change.",
  },
];

export default function HowItWorksPage() {
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
            Bring a pitch. Land on the live rankings. Visitors vote in The
            Decagon. Shared fights build a live tally; rank moves when a series
            is decided, then the session closes on the clock.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">List your company</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/decagon">Watch a fight</Link>
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-10">
          <section aria-labelledby="enter-title">
            <SectionRail
              kicker="ENTRY / FIVE STEPS"
              title="GET ON THE CARD"
              titleId="enter-title"
            />
            <ol className="mt-4 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
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
              kicker="PLACEMENT / DAILY"
              title="THE POOLS"
              titleId="pools-title"
            />
            <div className="mt-4 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
              {POOL_ORDER.map((tier) => {
                const config = TIERS[tier];
                return (
                  <article key={tier} className="bg-card px-5 py-5">
                    <TierMark tier={tier} size="md" />
                    <p className="font-display mt-4 text-4xl tracking-[0.04em] text-foreground">
                      {poolPriceLabel(tier)}
                      <span className="ml-1 font-data text-sm tracking-[0.12em] text-muted-foreground">
                        /DAY
                      </span>
                    </p>
                    <dl className="mt-4 space-y-2 font-data text-[10px] tracking-[0.14em] text-silver">
                      <div className="flex justify-between gap-4 border-b border-border pb-2">
                        <dt className="text-muted-foreground">NAMES ON CARD</dt>
                        <dd>{config.displayLimit}</dd>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-border pb-2">
                        <dt className="text-muted-foreground">DECAGON SHARE</dt>
                        <dd>{poolWeightLabel(tier)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">BILLING</dt>
                        <dd>PASS OR RENEW</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              One-day pass lasts 24 hours. Daily renew charges each day until
              you cancel in the customer portal.
            </p>
          </section>

          <section aria-labelledby="floor-title">
            <SectionRail
              kicker="THE DECAGON / ELO"
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
                Sign in, submit, wait for approval, then buy a daily placement.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/login">Join the card</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
