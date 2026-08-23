import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/auth-api";
import { getCompanyById } from "@/lib/data/companies";
import { ensureStripeCustomer } from "@/lib/data/stripe-customers";
import { isDemoMode } from "@/lib/demo-mode";
import { getPoolQuotes } from "@/lib/data/occupancy";
import {
  CHECKOUT_INTEGRATION_ID,
  checkoutLineItem,
  getAppUrl,
  getStripe,
} from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  companyId: z.string().uuid(),
  billingMode: z.enum(["one_day", "daily_renew"]),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const company = await getCompanyById(parsed.data.companyId);
  if (!company || company.owner_id !== auth.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (company.status !== "approved") {
    return NextResponse.json(
      { error: "company_not_approved" },
      { status: 409 },
    );
  }

  if (isDemoMode()) {
    return NextResponse.json({
      demo: true,
      url: `${getAppUrl()}/dashboard?checkout=demo`,
    });
  }

  try {
    const stripe = getStripe();
    const quote = (await getPoolQuotes())[company.tier];
    const supabase = await createClient();
    const customerId = await ensureStripeCustomer({
      supabase,
      userId: auth.user.id,
      email: auth.user.email,
    });

    const mode =
      parsed.data.billingMode === "daily_renew" ? "subscription" : "payment";

    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customerId,
      line_items: [
        checkoutLineItem({
          tier: company.tier,
          billingMode: parsed.data.billingMode,
          unitAmount: quote.priceCents,
        }),
      ],
      managed_payments: { enabled: false },
      success_url: `${getAppUrl()}/dashboard?checkout=success`,
      cancel_url: `${getAppUrl()}/dashboard?checkout=cancel`,
      integration_identifier: CHECKOUT_INTEGRATION_ID,
      metadata: {
        companyId: company.id,
        tier: company.tier,
        billingMode: parsed.data.billingMode,
        userId: auth.user.id,
        priceCents: String(quote.priceCents),
        intro: quote.intro ? "1" : "0",
      },
      subscription_data:
        mode === "subscription"
          ? {
              metadata: {
                companyId: company.id,
                tier: company.tier,
                billingMode: parsed.data.billingMode,
                priceCents: String(quote.priceCents),
              },
            }
          : undefined,
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
