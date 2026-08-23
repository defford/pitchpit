"use client";

import { CompanyIdentity } from "@/components/company-mark";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TierMark } from "@/components/terminal/tier-mark";
import type { CardHistoryItem } from "@/lib/data/battles";
import { formatCardWindow } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CardHistoryList({ cards }: { cards: CardHistoryItem[] }) {
  if (cards.length === 0) {
    return (
      <p className="text-sm text-silver">
        No closed cards yet. Come back after the first hour locks.
      </p>
    );
  }

  return (
    <Accordion type="single" collapsible className="border border-border">
      {cards.map((card) => (
        <AccordionItem
          key={card.id}
          value={card.id}
          className="border-border px-4"
        >
          <AccordionTrigger className="font-display text-left text-base tracking-[0.08em] hover:no-underline">
            <span className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <span>{formatCardWindow(card.startsAt, card.endsAt)}</span>
              <span className="font-data text-[10px] tracking-[0.16em] text-muted-foreground">
                {card.matchups.length} FIGHTS
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2 pb-3">
              {card.matchups.map((fight) => {
                const aWon = fight.winnerId === fight.companyA.id;
                const bWon = fight.winnerId === fight.companyB.id;
                return (
                  <li
                    key={fight.id}
                    className="flex flex-col gap-2 border border-border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <TierMark tier={fight.tier} size="sm" />
                    <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                      <CompanyIdentity
                        name={fight.companyA.name}
                        logoUrl={fight.companyA.logoUrl}
                        websiteUrl={fight.companyA.websiteUrl}
                        companyId={fight.companyA.id}
                        clickCount={fight.companyA.clickCount}
                        size="sm"
                        nameClassName={cn(
                          "font-display text-sm tracking-[0.04em]",
                          aWon && "text-signal",
                        )}
                      />
                      <p className="font-data text-sm text-signal">
                        {fight.pointsA}–{fight.pointsB}
                      </p>
                      <CompanyIdentity
                        name={fight.companyB.name}
                        logoUrl={fight.companyB.logoUrl}
                        websiteUrl={fight.companyB.websiteUrl}
                        companyId={fight.companyB.id}
                        clickCount={fight.companyB.clickCount}
                        align="right"
                        size="sm"
                        className="justify-end"
                        nameClassName={cn(
                          "font-display text-sm tracking-[0.04em]",
                          bWon && "text-signal",
                        )}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
