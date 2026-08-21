"use client";

import { useId, useState, type AnimationEvent } from "react";

import { CompanyRow } from "@/components/leaderboard/company-row";
import { SectionRail } from "@/components/terminal/section-rail";
import { TIERS } from "@/config/tiers";
import type { LeaderboardCompany } from "@/lib/data/demo";
import { cn } from "@/lib/utils";

type MainEventCardProps = {
  mainEvent: LeaderboardCompany[];
  undercard: LeaderboardCompany[];
  className?: string;
};

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MainEventCard({
  mainEvent,
  undercard,
  className,
}: MainEventCardProps) {
  const [showingUndercard, setShowingUndercard] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [spin, setSpin] = useState(0);
  const titleId = useId();
  const statusId = useId();

  const companies = showingUndercard ? undercard : mainEvent;
  const face = showingUndercard ? TIERS.undercard : TIERS.main_event;
  const other = showingUndercard ? TIERS.main_event : TIERS.undercard;
  const otherCount = showingUndercard ? mainEvent.length : undercard.length;

  function flipCard() {
    if (leaving) return;
    if (reduceMotion()) {
      setShowingUndercard((open) => !open);
      return;
    }
    setLeaving(true);
  }

  function onFlipEnd(event: AnimationEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    if (!event.animationName.includes("rank-flip-out")) return;
    setShowingUndercard((open) => !open);
    setLeaving(false);
    setSpin((n) => n + 1);
  }

  return (
    <div className={cn("relative pb-2", className)}>
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-2 top-4 bottom-0 -z-10 border bg-card",
          showingUndercard ? "border-signal/45" : "border-silver/55",
        )}
      />
      <div className="rank-card-scene">
        <section
          aria-labelledby={titleId}
          onAnimationEnd={onFlipEnd}
          className={cn(
            "module relative overflow-visible",
            showingUndercard && "border-silver/50",
            leaving && "animate-rank-flip-out",
            !leaving && spin > 0 && "animate-rank-flip-in",
          )}
        >
          <div className="px-4 pt-4 sm:px-5 sm:pt-5">
            <SectionRail
              kicker={showingUndercard ? "CARD B / LIVE" : "CARD A / LIVE"}
              title={face.label}
              titleId={titleId}
              aside={
                <span
                  className={cn(
                    "font-data text-[10px] tracking-[0.14em]",
                    showingUndercard ? "text-silver" : "text-muted-foreground",
                  )}
                >
                  BEST OF {face.seriesLength} · {companies.length} LISTED
                </span>
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

          <button
            type="button"
            disabled={leaving}
            aria-pressed={showingUndercard}
            aria-controls={titleId}
            aria-describedby={statusId}
            aria-label={
              showingUndercard
                ? "Flip to the main event"
                : "Flip to the undercard"
            }
            onClick={flipCard}
            className={cn(
              "flex w-full items-center justify-between gap-4 border-t px-4 py-4 text-left transition-colors sm:px-5",
              "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              showingUndercard
                ? "border-signal/40 bg-signal/10 hover:bg-signal/20"
                : "border-silver/45 bg-silver/10 hover:bg-silver/20",
            )}
          >
            <div className="min-w-0">
              <p className="font-data text-[10px] tracking-[0.22em] text-muted-foreground">
                OTHER SIDE OF THE CARD
              </p>
              <p
                className={cn(
                  "font-display mt-1 text-2xl leading-none tracking-[0.08em] sm:text-3xl",
                  showingUndercard ? "text-signal" : "text-silver",
                )}
              >
                {other.label}
              </p>
              <p className="mt-1 font-data text-[10px] tracking-[0.14em] text-muted-foreground">
                {otherCount} NAMES · BEST OF {other.seriesLength}
              </p>
            </div>
            <span
              className={cn(
                "font-display shrink-0 text-sm tracking-[0.16em] sm:text-base",
                showingUndercard ? "text-signal" : "text-silver",
              )}
            >
              FLIP THE CARD
            </span>
          </button>
        </section>
      </div>
    </div>
  );
}
