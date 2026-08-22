import type { Metadata } from "next";
import Link from "next/link";

import { CardHistoryList } from "@/components/pitch-pit/card-history-list";
import { listCardHistory } from "@/lib/data/battles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Card history",
  description: "Point totals from previous Pitch Pit hourly cards.",
};

export default async function CardHistoryPage() {
  const cards = await listCardHistory();

  return (
    <main className="flex-1">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <p className="font-data text-[10px] tracking-[0.2em] text-muted-foreground">
          PRIOR CARDS
        </p>
        <h1 className="font-display mt-1 text-4xl leading-none tracking-[0.04em] text-signal sm:text-5xl">
          CARD HISTORY
        </h1>
        <p className="mt-3 max-w-xl text-sm text-silver">
          Previous hours, with floor point totals for each fight. Open a card to
          see how the pit, undercard, and main event landed.
        </p>
        <p className="mt-3">
          <Link
            href="/the-pitch-pit"
            className="font-data text-[10px] tracking-[0.16em] text-muted-foreground uppercase hover:text-signal"
          >
            Back to the live card
          </Link>
        </p>
        <div className="mt-8">
          <CardHistoryList cards={cards} />
        </div>
      </div>
    </main>
  );
}
