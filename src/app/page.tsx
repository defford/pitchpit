import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";
import { ListingForm } from "@/components/marketing/listing-form";
import { Button } from "@/components/ui/button";
import { MainEventCard } from "@/components/leaderboard/main-event-card";
import { PitList } from "@/components/leaderboard/pit-list";
import { SeasonCountdown } from "@/components/leaderboard/season-countdown";
import { MarketTicker } from "@/components/terminal/ticker";
import { getDemoLeaderboards } from "@/lib/data/demo";
import { getLeaderboards } from "@/lib/data/leaderboards";
import { getPoolQuotes } from "@/lib/data/occupancy";
import { isDemoMode } from "@/lib/demo-mode";
import { getSeasonBounds } from "@/lib/domain/seasons";
import { buildTickerItems } from "@/lib/ticker";
import { cn } from "@/lib/utils";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ listed?: string }>;
}) {
  const { listed } = await searchParams;
  const [loaded, quotes] = await Promise.all([
    getLeaderboards().catch(() => null),
    getPoolQuotes().catch(() => null),
  ]);

  const empty =
    !loaded ||
    (loaded.mainEvent.length === 0 &&
      loaded.undercard.length === 0 &&
      loaded.pit.length === 0);

  const boards =
    isDemoMode() && empty
      ? getDemoLeaderboards()
      : (loaded ?? {
          mainEvent: [],
          undercard: [],
          pit: [],
          seasonEndsAt: getSeasonBounds(new Date()).endsAt.toISOString(),
        });
  const tickerItems = buildTickerItems(boards);

  return (
    <main className="flex-1">
      <MarketTicker items={tickerItems} />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col items-center border-b border-border pb-6 sm:mb-8">
          <div className="grid w-full grid-cols-1 items-center justify-items-center gap-3 md:grid-cols-[1fr_auto_1fr] md:justify-items-stretch md:gap-6 lg:gap-8">
            <p className="font-display text-center text-xl tracking-[0.08em] text-silver md:text-right md:text-2xl lg:text-3xl">
              Bring your pitch.
            </p>
            <BrandLogo size="hero" preload />
            <p className="font-display text-center text-xl tracking-[0.08em] text-silver md:text-left md:text-2xl lg:text-3xl">
              Fight for first.
            </p>
          </div>

          <section
            id="list"
            aria-labelledby="list-title"
            className="mt-8 w-full scroll-mt-24"
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
              <div>
                <p className="font-data text-[10px] tracking-[0.2em] text-muted-foreground">
                  OPEN ENTRY / NO LOGIN
                </p>
                <h2
                  id="list-title"
                  className="font-display mt-1 text-3xl leading-none tracking-[0.06em] text-signal sm:text-4xl"
                >
                  GET ON THE CARD
                </h2>
                <p className="mt-3 max-w-md text-sm text-silver">
                  Drop your link and a short pitch. Pick a pool. Every pool is
                  $1 a day until that board fills, then it returns to list
                  price. Stripe takes the card — you never make an account.
                </p>
              </div>
              <div className="border border-border bg-card px-4 py-5 sm:px-5">
                {listed ? <ListingStatus listed={listed} /> : null}
                <ListingForm quotes={quotes ?? undefined} />
              </div>
            </div>
          </section>

          <div className="mt-8 flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-data text-[10px] tracking-[0.2em] text-muted-foreground">
                LIVE MARKET / INTERNET RANK
              </p>
              <h1 className="font-display mt-1 text-3xl leading-none tracking-[0.06em] text-signal sm:text-4xl md:text-5xl">
                TODAY&apos;S RANKINGS
              </h1>
            </div>
            <SeasonCountdown endsAt={boards.seasonEndsAt} />
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <MainEventCard
            mainEvent={boards.mainEvent}
            undercard={boards.undercard}
          />

          <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
            <div className="flex flex-col items-start justify-between gap-4 bg-card px-5 py-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-data text-[10px] tracking-[0.18em] text-muted-foreground">
                  OPEN FLOOR
                </p>
                <p className="font-display text-2xl tracking-[0.06em] text-foreground sm:text-3xl">
                  ENTER THE PITCH PIT
                </p>
                <p className="mt-1 max-w-md text-sm text-silver">
                  Six votes an hour. Least-fought names get the next shot.
                </p>
              </div>
              <Button asChild size="lg">
                <Link href="/the-pitch-pit">Enter The Pitch Pit</Link>
              </Button>
            </div>
            <div className="flex flex-col items-start justify-between gap-4 bg-card px-5 py-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-data text-[10px] tracking-[0.18em] text-muted-foreground">
                  FOR COMPANIES
                </p>
                <p className="font-display text-2xl tracking-[0.06em] text-foreground sm:text-3xl">
                  HOW LISTING WORKS
                </p>
                <p className="mt-1 max-w-md text-sm text-silver">
                  Pools, pay, and how rank actually moves.
                </p>
              </div>
              <Button asChild size="lg" variant="outline">
                <Link href="/how-it-works">How it works</Link>
              </Button>
            </div>
          </div>

          <PitList companies={boards.pit} />
        </div>
      </div>
    </main>
  );
}

function ListingStatus({ listed }: { listed: string }) {
  const success = listed === "success" || listed === "demo";
  const cancel = listed === "cancel";
  if (!success && !cancel) return null;

  return (
    <p
      className={cn(
        "mb-4 border-b border-border pb-4 text-sm",
        success ? "text-foreground" : "text-silver",
      )}
    >
      {success
        ? "You're in. Payment landed — your name joins this hour's pool."
        : "Checkout canceled. Your pitch is saved. Hit pay when you're ready."}
    </p>
  );
}
