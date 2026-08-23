import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-api";
import { getUsableStripeCustomerId } from "@/lib/data/stripe-customers";
import { isDemoMode } from "@/lib/demo-mode";
import { getAppUrl, getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (isDemoMode()) {
    return NextResponse.json({
      demo: true,
      url: `${getAppUrl()}/dashboard?portal=demo`,
    });
  }

  try {
    const supabase = await createClient();
    const customerId = await getUsableStripeCustomerId({
      supabase,
      userId: auth.user.id,
    });

    if (!customerId) {
      return NextResponse.json({ error: "no_customer" }, { status: 404 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppUrl()}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "portal_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
