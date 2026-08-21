import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { MainEventCard } from "@/components/leaderboard/main-event-card";
import { PitList } from "@/components/leaderboard/pit-list";
import { SeasonCountdown } from "@/components/leaderboard/season-countdown";
import { MarketTicker } from "@/components/terminal/ticker";
import { getDemoLeaderboards } from "@/lib/data/demo";
import { getLeaderboards } from "@/lib/data/leaderboards";
import { buildTickerItems } from "@/lib/ticker";

export default async function HomePage() {
  const loaded = await getLeaderboards().catch(() => null);

  const empty =
    !loaded ||
    (loaded.mainEvent.length === 0 &&
      loaded.undercard.length === 0 &&
      loaded.pit.length === 0);

  const boards = empty ? getDemoLeaderboards() : loaded;
  const tickerItems = buildTickerItems(boards);

  return (
    <main className="flex-1">
      <MarketTicker items={tickerItems} />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col items-center border-b border-border pb-6 sm:mb-8">
          <div className="grid w-full grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-6 lg:gap-8">
            <p className="font-display text-center text-xl tracking-[0.08em] text-silver md:text-right md:text-2xl lg:text-3xl">
              Bring your pitch.
            </p>
            <BrandLogo size="hero" preload />
            <p className="font-display text-center text-xl tracking-[0.08em] text-silver md:text-left md:text-2xl lg:text-3xl">
              Fight for first.
            </p>
          </div>
          <div className="mt-5 flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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

          <div className="flex flex-col items-start justify-between gap-4 border border-border bg-card px-5 py-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-data text-[10px] tracking-[0.18em] text-muted-foreground">
                OPEN FLOOR
              </p>
              <p className="font-display text-2xl tracking-[0.06em] text-foreground sm:text-3xl">
                ENTER THE DECAGON
              </p>
              <p className="mt-1 max-w-md text-sm text-silver">
                Two names. One vote. Rankings move immediately.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/decagon">Enter the Decagon</Link>
            </Button>
          </div>

          <PitList companies={boards.pit} />
        </div>
      </div>
    </main>
  );
}
