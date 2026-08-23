import { getDemoStore, type DemoCompany } from "@/lib/data/demo-store";
import {
  reviewCompany,
  upsertPublicListing,
  type CompanyInput,
  type CompanyRow,
} from "@/lib/data/companies";
import { ensureCurrentSeason } from "@/lib/data/seasons";
import { openEndedPlacementWindow } from "@/lib/domain/payments";
import { isDemoMode, tryGetAdminClient } from "@/lib/demo-mode";
import { displayNameFromWebsite } from "@/lib/logos";
import { getAppUrl } from "@/lib/stripe";
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

export async function startPublicListing(
  data: PublicListingInput,
): Promise<{ url: string; company: CompanyRow; demo: boolean }> {
  const input = listingInputFromPublic(data);
  const company = await upsertPublicListing(input);
  const activated = await activateListing(company);
  const demo = isDemoMode();

  return {
    url: `${getAppUrl()}/?listed=${demo ? "demo" : "success"}#list`,
    company: activated,
    demo,
  };
}

/** Approve a company and give it an open-ended active placement. */
export async function activateListing(
  company: CompanyRow,
): Promise<CompanyRow> {
  const approved =
    company.status === "approved"
      ? company
      : await reviewCompany(company.id, "approve");

  const window = openEndedPlacementWindow(new Date());
  const admin = await tryGetAdminClient();

  if (isDemoMode() || !admin) {
    await activateDemoPlacement(approved, window.startsAt, window.endsAt);
  } else {
    await activateLivePlacement(admin, approved, window.startsAt, window.endsAt);
  }

  await ensureCurrentSeason();
  return approved;
}

async function activateDemoPlacement(
  company: CompanyRow,
  startsAt: Date,
  endsAt: Date,
) {
  const store = getDemoStore();
  const demo = store.companies.get(company.id) as DemoCompany | undefined;
  if (!demo) return;

  const existingKey = [...store.placements.entries()].find(
    ([, placement]) =>
      placement.company_id === company.id && placement.status === "active",
  )?.[0];
  const key = existingKey ?? `public-${company.id}`;
  const existing = store.placements.get(key);

  store.placements.set(key, {
    id: existing?.id ?? crypto.randomUUID(),
    company_id: company.id,
    tier: company.tier,
    billing_mode: "one_day",
    status: "active",
    starts_at: existing?.starts_at ?? startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    stripe_checkout_session_id: existing?.stripe_checkout_session_id ?? null,
    stripe_subscription_id: existing?.stripe_subscription_id ?? null,
    created_at: existing?.created_at ?? new Date().toISOString(),
  });
}

async function activateLivePlacement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  company: CompanyRow,
  startsAt: Date,
  endsAt: Date,
) {
  const nowIso = new Date().toISOString();
  const { data: existing, error: findError } = await admin
    .from("placements")
    .select("id, starts_at")
    .eq("company_id", company.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  if (existing?.id) {
    const { error } = await admin
      .from("placements")
      .update({
        tier: company.tier,
        billing_mode: "one_day",
        status: "active",
        ends_at: endsAt.toISOString(),
        updated_at: nowIso,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin.from("placements").insert({
    company_id: company.id,
    tier: company.tier,
    billing_mode: "one_day",
    status: "active",
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    stripe_checkout_session_id: null,
    stripe_subscription_id: null,
    stripe_payment_intent_id: null,
    updated_at: nowIso,
  });
  if (error) throw new Error(error.message);
}
