import type { BillingMode } from "@/config/tiers";

const DAY_MS = 24 * 60 * 60 * 1000;

export type PlacementWindow = {
  startsAt: Date;
  endsAt: Date;
  status: "active";
};

export type PlacementLike = {
  startsAt: Date | string;
  endsAt: Date | string;
  status: string;
};

/**
 * Maps a successful Checkout to an initial placement window.
 * - one_day: exactly 24h from now
 * - daily_renew: also ends 24h from now; invoice.paid webhooks extend endsAt
 */
export function mapCheckoutToPlacement({
  billingMode,
  now,
}: {
  billingMode: BillingMode;
  now: Date;
}): PlacementWindow {
  const startsAt = new Date(now.getTime());
  const endsAt = new Date(now.getTime() + DAY_MS);

  switch (billingMode) {
    case "one_day":
    case "daily_renew":
      return { startsAt, endsAt, status: "active" };
    default: {
      const _exhaustive: never = billingMode;
      return _exhaustive;
    }
  }
}

export function isPlacementActive(
  placement: PlacementLike,
  now: Date,
): boolean {
  if (placement.status !== "active") {
    return false;
  }

  const startsAt = toDate(placement.startsAt);
  const endsAt = toDate(placement.endsAt);

  return (
    startsAt.getTime() <= now.getTime() && now.getTime() < endsAt.getTime()
  );
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
