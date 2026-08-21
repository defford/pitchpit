import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { SEASON_TIMEZONE } from "@/config/tiers";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calendar-day season key in America/New_York (e.g. "2026-08-20").
 */
export function getSeasonKey(date: Date): string {
  return formatInTimeZone(date, SEASON_TIMEZONE, "yyyy-MM-dd");
}

/**
 * Inclusive start / exclusive end bounds for the ET calendar day containing `date`.
 * End is the next ET midnight (handles 23h/25h DST days correctly).
 */
export function getSeasonBounds(date: Date): {
  startsAt: Date;
  endsAt: Date;
} {
  const key = getSeasonKey(date);
  const startsAt = fromZonedTime(`${key}T00:00:00`, SEASON_TIMEZONE);
  // Noon + 24h is always the following calendar day, even across DST.
  const noon = fromZonedTime(`${key}T12:00:00`, SEASON_TIMEZONE);
  const nextKey = formatInTimeZone(
    new Date(noon.getTime() + DAY_MS),
    SEASON_TIMEZONE,
    "yyyy-MM-dd",
  );
  const endsAt = fromZonedTime(`${nextKey}T00:00:00`, SEASON_TIMEZONE);

  return { startsAt, endsAt };
}

export function getMsUntilSeasonEnd(date: Date): number {
  const { endsAt } = getSeasonBounds(date);
  return Math.max(0, endsAt.getTime() - date.getTime());
}

/**
 * UTC hours when Eastern midnight can fall (EDT = 4, EST = 5).
 * Cron should run at both to stay DST-safe.
 */
export function utcHoursForEasternMidnight(): number[] {
  return [4, 5];
}
