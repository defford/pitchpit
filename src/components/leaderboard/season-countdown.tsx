"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type SeasonCountdownProps = {
  endsAt: string | Date;
  className?: string;
  kicker?: string;
  endedLabel?: string;
};

type Remaining = {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

function getRemaining(endsAt: Date, now: Date): Remaining {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds, expired: false };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function SeasonCountdown({
  endsAt,
  className,
  kicker = "SESSION",
  endedLabel = "RESET",
}: SeasonCountdownProps) {
  const endsAtMs =
    typeof endsAt === "string" ? new Date(endsAt).getTime() : endsAt.getTime();
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    const end = new Date(endsAtMs);
    const tick = () => setRemaining(getRemaining(end, new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAtMs]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 border border-border bg-card px-3 py-1.5",
        className,
      )}
      role="timer"
      aria-live="polite"
      aria-label={
        !remaining
          ? `${kicker} countdown loading`
          : remaining.expired
            ? `${kicker} ended`
            : `${kicker} ends in ${remaining.hours} hours ${remaining.minutes} minutes ${remaining.seconds} seconds`
      }
    >
      <span className="font-data text-[10px] tracking-[0.16em] text-muted-foreground">
        {kicker}
      </span>
      {!remaining ? (
        <span className="font-data text-sm text-muted-foreground">
          --:--:--
        </span>
      ) : remaining.expired ? (
        <span className="font-display text-lg tracking-wider text-down">
          {endedLabel}
        </span>
      ) : (
        <span className="font-data text-sm text-signal sm:text-base">
          {pad(remaining.hours)}:{pad(remaining.minutes)}:
          {pad(remaining.seconds)}
        </span>
      )}
    </div>
  );
}
