import {
  getStripe,
  readUsableStripeCustomerId,
  resolveOrCreateStripeCustomerId,
  retrieveStripeCustomer,
} from "@/lib/stripe";
import type { createClient } from "@/lib/supabase/server";

type AppSupabase = Awaited<ReturnType<typeof createClient>>;

export async function ensureStripeCustomer(params: {
  supabase: AppSupabase;
  userId: string;
  email?: string | null;
}): Promise<string> {
  const { supabase, userId, email } = params;
  const stripe = getStripe();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const { id, created } = await resolveOrCreateStripeCustomerId({
    storedId: profile?.stripe_customer_id,
    retrieve: retrieveStripeCustomer,
    create: () =>
      stripe.customers.create({
        email: email ?? profile?.email ?? undefined,
        metadata: { userId },
      }),
  });

  if (created || id !== profile?.stripe_customer_id) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: id })
      .eq("id", userId);

    if (updateError) throw new Error(updateError.message);
  }

  return id;
}

export async function getUsableStripeCustomerId(params: {
  supabase: AppSupabase;
  userId: string;
}): Promise<string | null> {
  const { supabase, userId } = params;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const storedId = profile?.stripe_customer_id;
  const usable = await readUsableStripeCustomerId(
    storedId,
    retrieveStripeCustomer,
  );

  if (!usable && storedId) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: null })
      .eq("id", userId)
      .eq("stripe_customer_id", storedId);

    if (updateError) throw new Error(updateError.message);
  }

  return usable;
}
