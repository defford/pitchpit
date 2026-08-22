import Stripe from "stripe";

import type { BillingMode, Tier } from "@/config/tiers";

let stripe: Stripe | null = null;

/**
 * Lazy Stripe client — safe to import during `next build` without secrets.
 */
export function getStripe(): Stripe {
  if (stripe) {
    return stripe;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  stripe = new Stripe(key);
  return stripe;
}

/** Dashboard label for hosted Checkout sessions (Payments vs Billing). */
export const CHECKOUT_INTEGRATION_ID = "pitchpit_hosted_k7qm2nwp";

const PRICE_ENV: Record<Tier, Record<BillingMode, string>> = {
  pit: {
    one_day: "STRIPE_PRICE_PIT_ONEDAY",
    daily_renew: "STRIPE_PRICE_PIT_DAILY",
  },
  undercard: {
    one_day: "STRIPE_PRICE_UNDERCARD_ONEDAY",
    daily_renew: "STRIPE_PRICE_UNDERCARD_DAILY",
  },
  main_event: {
    one_day: "STRIPE_PRICE_MAIN_EVENT_ONEDAY",
    daily_renew: "STRIPE_PRICE_MAIN_EVENT_DAILY",
  },
};

export function getPriceId(tier: Tier, billingMode: BillingMode): string {
  const envName = PRICE_ENV[tier][billingMode];
  const priceId = process.env[envName];
  if (!priceId) {
    throw new Error(
      `Missing ${envName} for tier=${tier} billingMode=${billingMode}`,
    );
  }
  return priceId;
}

export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}
