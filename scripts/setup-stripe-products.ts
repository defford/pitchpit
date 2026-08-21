/**
 * Creates PitchPit Stripe products + prices (test or live depending on key).
 * Usage: STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/setup-stripe-products.ts
 */
import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  console.error("Set STRIPE_SECRET_KEY before running this script.");
  process.exit(1);
}

const stripe = new Stripe(secret);

const tiers = [
  { key: "PIT", name: "PitchPit — The Pit", amount: 100 },
  { key: "UNDERCARD", name: "PitchPit — The Undercard", amount: 500 },
  { key: "MAIN_EVENT", name: "PitchPit — The Main Event", amount: 2000 },
] as const;

async function main() {
  const lines: string[] = [];

  for (const tier of tiers) {
    const product = await stripe.products.create({
      name: tier.name,
      metadata: { app: "pitchpit", tier: tier.key.toLowerCase() },
    });

    const oneDay = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: tier.amount,
      metadata: { billing_mode: "one_day", tier: tier.key.toLowerCase() },
    });

    const daily = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: tier.amount,
      recurring: { interval: "day" },
      metadata: { billing_mode: "daily_renew", tier: tier.key.toLowerCase() },
    });

    lines.push(`STRIPE_PRICE_${tier.key}_ONEDAY=${oneDay.id}`);
    lines.push(`STRIPE_PRICE_${tier.key}_DAILY=${daily.id}`);
    console.log(`Created ${tier.name}`);
  }

  console.log("\nAdd these to .env.local:\n");
  console.log(lines.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
