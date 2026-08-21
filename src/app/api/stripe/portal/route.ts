import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-api";
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "no_customer" }, { status: 404 });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getAppUrl()}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "portal_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
