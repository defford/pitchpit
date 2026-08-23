import { getDemoStore, type DemoCompany } from "@/lib/data/demo-store";
import {
  reviewCompany,
  upsertPublicListing,
  type CompanyInput,
  type CompanyRow,
} from "@/lib/data/companies";
import { getPoolQuotes } from "@/lib/data/occupancy";
import { mapCheckoutToPlacement } from "@/lib/domain/payments";
import { isDemoMode } from "@/lib/demo-mode";
import { displayNameFromWebsite } from "@/lib/logos";
import {
  checkoutLineItem,
  getAppUrl,
  getStripe,
  PUBLIC_CHECKOUT_INTEGRATION_ID,
} from "@/lib/stripe";
import type { PublicListingInput } from "@/lib/validation";

export function listingInputFromPublic(data: PublicListingInput): CompanyInput {
  const name =
    data.name && data.name.trim().length >= 2
      ? data.name.trim()
      : displayNameFromWebsite(data.website_url);

  return {
    name,
    pitch: data.pitch,
    website_url: data.website_url,
    tier: data.tier,
    billingMode: "one_day",
  };
}

export async function startPublicListingCheckout(
  data: PublicListingInput,
): Promise<{ url: string; company: CompanyRow; demo: boolean }> {
  const input = listingInputFromPublic(data);
  const company = await upsertPublicListing(input);

  if (isDemoMode()) {
    await activateDemoListing(company);
    return {
      url: `${getAppUrl()}/?listed=demo#list`,
      company,
      demo: true,
    };
  }

  const stripe = getStripe();
  const quote = (await getPoolQuotes())[company.tier];

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      checkoutLineItem({
        tier: company.tier,
        billingMode: "one_day",
        unitAmount: quote.priceCents,
      }),
    ],
    customer_creation: "always",
    managed_payments: { enabled: false },
    success_url: `${getAppUrl()}/?listed=success#list`,
    cancel_url: `${getAppUrl()}/?listed=cancel#list`,
    integration_identifier: PUBLIC_CHECKOUT_INTEGRATION_ID,
    metadata: {
      companyId: company.id,
      tier: company.tier,
      billingMode: "one_day",
      source: "public_listing",
      priceCents: String(quote.priceCents),
      intro: quote.intro ? "1" : "0",
    },
  });

  if (!session.url) {
    throw new Error("checkout_url_missing");
  }

  return { url: session.url, company, demo: false };
}

async function activateDemoListing(company: CompanyRow) {
  const approved = await reviewCompany(company.id, "approve");
  const store = getDemoStore();
  const demo = store.companies.get(approved.id) as DemoCompany | undefined;
  if (!demo) return;

  const window = mapCheckoutToPlacement({
    billingMode: "one_day",
    now: new Date(),
  });
  store.placements.set(`public-${approved.id}`, {
    id: crypto.randomUUID(),
    company_id: approved.id,
    tier: approved.tier,
    billing_mode: "one_day",
    status: "active",
    starts_at: window.startsAt.toISOString(),
    ends_at: window.endsAt.toISOString(),
    stripe_checkout_session_id: null,
    stripe_subscription_id: null,
    created_at: new Date().toISOString(),
  });
}
