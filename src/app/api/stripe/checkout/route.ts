import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/auth-api";
import { getCompanyById } from "@/lib/data/companies";
import { isDemoMode } from "@/lib/demo-mode";
import {
  CHECKOUT_INTEGRATION_ID,
  getAppUrl,
  getPriceId,
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
    const priceId = getPriceId(company.tier, parsed.data.billingMode);
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", auth.user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.user.email ?? profile?.email ?? undefined,
        metadata: { userId: auth.user.id },
      });
      customerId = customer.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", auth.user.id);
    }

    const mode =
      parsed.data.billingMode === "daily_renew" ? "subscription" : "payment";

    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${getAppUrl()}/dashboard?checkout=success`,
      cancel_url: `${getAppUrl()}/dashboard?checkout=cancel`,
      integration_identifier: CHECKOUT_INTEGRATION_ID,
      metadata: {
        companyId: company.id,
        tier: company.tier,
        billingMode: parsed.data.billingMode,
        userId: auth.user.id,
      },
      subscription_data:
        mode === "subscription"
          ? {
              metadata: {
                companyId: company.id,
                tier: company.tier,
                billingMode: parsed.data.billingMode,
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
