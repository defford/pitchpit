"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { CompanyRow } from "@/components/leaderboard/company-row";
import { SectionRail } from "@/components/terminal/section-rail";
import type { LeaderboardCompany } from "@/lib/data/demo";
import { cn } from "@/lib/utils";

type MainEventCardProps = {
  mainEvent: LeaderboardCompany[];
  undercard: LeaderboardCompany[];
  className?: string;
};

export function MainEventCard({
  mainEvent,
  undercard,
  className,
}: MainEventCardProps) {
  const [showingUndercard, setShowingUndercard] = useState(false);
  const titleId = useId();
  const statusId = useId();

  const companies = showingUndercard ? undercard : mainEvent;
  const title = showingUndercard ? "THE UNDERCARD" : "THE MAIN EVENT";

  return (
    <section
      className={cn("module overflow-visible", className)}
      aria-labelledby={titleId}
    >
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <SectionRail
          kicker={showingUndercard ? "CARD B / LIVE" : "CARD A / LIVE"}
          title={title}
          titleId={titleId}
          aside={
            <div className="flex border border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={!showingUndercard}
                onClick={() => setShowingUndercard(false)}
                className={cn(
                  "rounded-none border-0",
                  !showingUndercard &&
                    "bg-signal text-signal-foreground hover:bg-signal hover:text-signal-foreground",
                )}
              >
                Main Event
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={showingUndercard}
                aria-controls={titleId}
                aria-describedby={statusId}
                onClick={() => setShowingUndercard(true)}
                className={cn(
                  "rounded-none border-0 border-l border-border",
                  showingUndercard &&
                    "bg-signal text-signal-foreground hover:bg-signal hover:text-signal-foreground",
                )}
              >
                Undercard
              </Button>
            </div>
          }
        />
        <p id={statusId} className="sr-only" aria-live="polite">
          Showing {showingUndercard ? "the undercard" : "the main event"}
        </p>
      </div>

      <ol className="isolate flex flex-col overflow-visible">
        {companies.map((company) => (
          <CompanyRow
            key={`${showingUndercard ? "u" : "m"}-${company.id}`}
            company={company}
            intensity={showingUndercard ? "bold" : "loud"}
          />
        ))}
      </ol>
    </section>
  );
}
