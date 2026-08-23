import { NextResponse } from "next/server";
import type Stripe from "stripe";

import type { BillingMode, Tier } from "@/config/tiers";
import { getCompanyById, reviewCompany } from "@/lib/data/companies";
import { ensureCurrentSeason } from "@/lib/data/seasons";
import { mapCheckoutToPlacement } from "@/lib/domain/payments";
import { isDemoMode, tryGetAdminClient } from "@/lib/demo-mode";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function alreadyProcessed(eventId: string): Promise<boolean> {
  const admin = await tryGetAdminClient();
  if (!admin) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data } = await db
    .from("stripe_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  return !!data;
}

async function markProcessed(event: Stripe.Event) {
  const admin = await tryGetAdminClient();
  if (!admin) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  await db.from("stripe_events").upsert({
    id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
    processed_at: new Date().toISOString(),
  });
}

async function activateFromCheckout(session: Stripe.Checkout.Session) {
  const admin = await tryGetAdminClient();
  if (!admin) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const companyId = session.metadata?.companyId;
  const tier = session.metadata?.tier as Tier | undefined;
  const billingMode = session.metadata?.billingMode as BillingMode | undefined;
  if (!companyId || !tier || !billingMode) return;

  const existing = await getCompanyById(companyId);
  if (!existing) return;
  if (existing.status !== "approved") {
    await reviewCompany(companyId, "approve");
  }

  const window = mapCheckoutToPlacement({ billingMode, now: new Date() });
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? null);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  await db.from("placements").upsert(
    {
      company_id: companyId,
      tier,
      billing_mode: billingMode,
      status: "active",
      starts_at: window.startsAt.toISOString(),
      ends_at: window.endsAt.toISOString(),
      stripe_checkout_session_id: session.id,
      stripe_subscription_id: subscriptionId,
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_checkout_session_id" },
  );

  await ensureCurrentSeason();
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

async function extendSubscriptionPlacement(invoice: Stripe.Invoice) {
  const admin = await tryGetAdminClient();
  if (!admin) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const { data: placement } = await db
    .from("placements")
    .select("*")
    .eq("stripe_subscription_id", subscriptionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date();
  const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (placement) {
    await db
      .from("placements")
      .update({
        status: "active",
        ends_at: endsAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", placement.id);
    return;
  }

  // Fallback via subscription metadata if first invoice arrives before checkout row
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const companyId = subscription.metadata?.companyId;
  const tier = subscription.metadata?.tier as Tier | undefined;
  const billingMode =
    (subscription.metadata?.billingMode as BillingMode) || "daily_renew";
  if (!companyId || !tier) return;

  await db.from("placements").insert({
    company_id: companyId,
    tier,
    billing_mode: billingMode,
    status: "active",
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    stripe_subscription_id: subscriptionId,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const admin = await tryGetAdminClient();
  if (!admin) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  await db
    .from("placements")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("status", "active");
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const admin = await tryGetAdminClient();
  if (!admin) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  if (subscription.status === "active" || subscription.status === "trialing") {
    const periodEnd = subscription.items.data[0]?.current_period_end;
    if (periodEnd) {
      await db
        .from("placements")
        .update({
          status: "active",
          ends_at: new Date(periodEnd * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
    }
    return;
  }

  if (
    subscription.status === "canceled" ||
    subscription.status === "unpaid" ||
    subscription.status === "incomplete_expired"
  ) {
    await db
      .from("placements")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id)
      .eq("status", "active");
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const admin = await tryGetAdminClient();
  if (!admin) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  await db
    .from("placements")
    .update({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId)
    .eq("status", "active");
}

export async function POST(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json({ received: true, demo: true });
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "invalid_signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (await alreadyProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "unpaid") {
          await activateFromCheckout(session);
        }
        break;
      }
      case "invoice.paid":
        await extendSubscriptionPlacement(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }

    await markProcessed(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "webhook_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
