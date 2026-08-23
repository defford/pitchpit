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
import { canFillFullCard, getSeasonBounds } from "@/lib/domain";
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
  const warmup = quotes
    ? !canFillFullCard({
        pit: quotes.pit.occupied,
        undercard: quotes.undercard.occupied,
        main_event: quotes.main_event.occupied,
      })
    : true;

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
            className={cn(
              "mt-8 w-full scroll-mt-24",
              warmup &&
                "border border-signal/40 bg-signal/10 px-4 py-5 sm:px-5",
            )}
          >
            {warmup ? (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="font-data text-[10px] tracking-[0.2em] text-signal">
                    OPENING SEASON / EXHIBITIONS
                  </p>
                  <h2
                    id="list-title"
                    className="font-display mt-1 text-2xl tracking-[0.06em] text-foreground sm:text-3xl"
                  >
                    EXHIBITIONS UNTIL THE CARD FILLS
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-silver">
                    We need 6 lightweights, 4 middleweights, and 2
                    heavyweights. Then hourly cards start — 6 fights across 3
                    pools. Pick a pool and list. Until then, play
                    exhibitions.
                  </p>
                </div>
                <div className="border border-border bg-card px-4 py-5 sm:px-5">
                  {listed ? <ListingStatus listed={listed} /> : null}
                  <ListingForm quotes={quotes ?? undefined} warmup />
                </div>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
                <div>
                  <p className="font-data text-[10px] tracking-[0.2em] text-muted-foreground">
                    OPEN ENTRY
                  </p>
                  <h2
                    id="list-title"
                    className="font-display mt-1 text-3xl leading-none tracking-[0.06em] text-signal sm:text-4xl"
                  >
                    GET ON THE CARD
                  </h2>
                  <p className="mt-3 max-w-md text-sm text-silver">
                    Drop your link and a short pitch. Pick a pool. You&apos;re
                    on the card — no account needed.
                  </p>
                </div>
                <div className="border border-border bg-card px-4 py-5 sm:px-5">
                  {listed ? <ListingStatus listed={listed} /> : null}
                  <ListingForm quotes={quotes ?? undefined} />
                </div>
              </div>
            )}
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
                  {warmup ? "EXHIBITION FLOOR" : "OPEN FLOOR"}
                </p>
                <p className="font-display text-2xl tracking-[0.06em] text-foreground sm:text-3xl">
                  {warmup ? "PLAY AN EXHIBITION" : "ENTER THE PITCH PIT"}
                </p>
                <p className="mt-1 max-w-md text-sm text-silver">
                  {warmup
                    ? "Random matchups until 6 lightweights, 4 middleweights, and 2 heavyweights fill the card."
                    : "Six votes an hour. Least-fought names get the next shot."}
                </p>
              </div>
              <Button asChild size="lg">
                <Link href="/the-pitch-pit">
                  {warmup ? "Play an exhibition" : "Enter The Pitch Pit"}
                </Link>
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
                  Pools, voting, and how rank actually moves.
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
        ? "You're in. Your name joins this hour's pool — jump into The Pitch Pit and fight."
        : "Listing didn't finish. Your pitch may still be saved — submit again when you're ready."}
    </p>
  );
}
