import type { BillingMode, Tier } from "@/config/tiers";
import {
  getDemoStore,
  incrementDemoCompanyClick,
  type DemoCompany,
} from "@/lib/data/demo-store";
import {
  HOUSE_OWNER_ID,
  isHouseOwnerId,
  normalizeWebsiteHost,
} from "@/lib/data/house-catalog";
import { isDemoMode, tryGetAdminClient } from "@/lib/demo-mode";
import { logoPathForWebsite } from "@/lib/logos";

export type CompanyInput = {
  name: string;
  pitch: string;
  website_url: string;
  tier: Tier;
  billingMode?: BillingMode;
  logo_path?: string | null;
};

export type CompanyRow = {
  id: string;
  owner_id: string;
  name: string;
  pitch: string;
  website_url: string;
  logo_path: string | null;
  click_count: number;
  tier: Tier;
  preferred_billing_mode: BillingMode;
  status: string;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

function fromDemo(company: DemoCompany): CompanyRow {
  return {
    id: company.id,
    owner_id: company.owner_id,
    name: company.name,
    pitch: company.pitch,
    website_url: company.website_url,
    logo_path: company.logo_path,
    click_count: company.click_count ?? 0,
    tier: company.tier,
    preferred_billing_mode: company.preferred_billing_mode,
    status: company.status,
    review_notes: company.review_notes,
    created_at: company.created_at,
    updated_at: company.updated_at,
  };
}

export async function listCompaniesForOwner(
  ownerId: string,
): Promise<CompanyRow[]> {
  const admin = await tryGetAdminClient();
  if (isDemoMode() || !admin) {
    return [...getDemoStore().companies.values()]
      .filter((c) => c.owner_id === ownerId)
      .map(fromDemo);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data, error } = await db
    .from("companies")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeCompany);
}

export async function listAllCompanies(): Promise<CompanyRow[]> {
  const admin = await tryGetAdminClient();
  if (isDemoMode() || !admin) {
    return [...getDemoStore().companies.values()].map(fromDemo);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data, error } = await db
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeCompany);
}

export async function getCompanyById(id: string): Promise<CompanyRow | null> {
  const admin = await tryGetAdminClient();
  if (isDemoMode() || !admin) {
    const company = getDemoStore().companies.get(id);
    return company ? fromDemo(company) : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data, error } = await db
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizeCompany(data) : null;
}

export async function createCompanyForOwner(
  ownerId: string,
  input: CompanyInput,
): Promise<CompanyRow> {
  const now = new Date().toISOString();
  const billingMode = input.billingMode ?? "one_day";

  const admin = await tryGetAdminClient();
  if (isDemoMode() || !admin) {
    const store = getDemoStore();
    const company: DemoCompany = {
      id: crypto.randomUUID(),
      owner_id: ownerId,
      name: input.name,
      pitch: input.pitch,
      website_url: input.website_url,
      logo_path: logoPathForWebsite(input.website_url, input.logo_path),
      click_count: 0,
      tier: input.tier,
      preferred_billing_mode: billingMode,
      status: "pending_review",
      review_notes: null,
      created_at: now,
      updated_at: now,
    };
    store.companies.set(company.id, company);
    return fromDemo(company);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data, error } = await db
    .from("companies")
    .insert({
      owner_id: ownerId,
      name: input.name,
      pitch: input.pitch,
      website_url: input.website_url,
      logo_path: logoPathForWebsite(input.website_url, input.logo_path),
      tier: input.tier,
      preferred_billing_mode: billingMode,
      status: "pending_review",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return normalizeCompany(data);
}

export async function updateCompanyForOwner(
  id: string,
  ownerId: string,
  input: Partial<CompanyInput>,
): Promise<CompanyRow> {
  const admin = await tryGetAdminClient();
  if (isDemoMode() || !admin) {
    const store = getDemoStore();
    const existing = store.companies.get(id);
    if (!existing || existing.owner_id !== ownerId) {
      throw new Error("company_not_found");
    }
    if (input.name !== undefined) existing.name = input.name;
    if (input.pitch !== undefined) existing.pitch = input.pitch;
    if (input.website_url !== undefined)
      existing.website_url = input.website_url;
    if (input.tier !== undefined) existing.tier = input.tier;
    if (input.billingMode !== undefined) {
      existing.preferred_billing_mode = input.billingMode;
    }
    if (input.logo_path !== undefined) {
      existing.logo_path = input.logo_path;
    } else if (input.website_url !== undefined) {
      existing.logo_path = logoPathForWebsite(input.website_url);
    }
    existing.status = "pending_review";
    existing.updated_at = new Date().toISOString();
    return fromDemo(existing);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    status: "pending_review",
  };
  if (input.name !== undefined) patch.name = input.name;
  if (input.pitch !== undefined) patch.pitch = input.pitch;
  if (input.website_url !== undefined) patch.website_url = input.website_url;
  if (input.tier !== undefined) patch.tier = input.tier;
  if (input.billingMode !== undefined)
    patch.preferred_billing_mode = input.billingMode;
  if (input.logo_path !== undefined) {
    patch.logo_path = input.logo_path;
  } else if (input.website_url !== undefined) {
    patch.logo_path = logoPathForWebsite(input.website_url);
  }

  const { data, error } = await db
    .from("companies")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return normalizeCompany(data);
}

export async function reviewCompany(
  id: string,
  action: "approve" | "reject" | "suspend",
  reviewNotes?: string,
  reviewedBy?: string,
): Promise<CompanyRow> {
  const status =
    action === "approve"
      ? "approved"
      : action === "reject"
        ? "rejected"
        : "suspended";

  const admin = await tryGetAdminClient();
  if (isDemoMode() || !admin) {
    const store = getDemoStore();
    const existing = store.companies.get(id);
    if (!existing) throw new Error("company_not_found");
    existing.status = status;
    existing.review_notes = reviewNotes ?? null;
    existing.updated_at = new Date().toISOString();
    if (status === "approved" && !isHouseOwnerId(existing.owner_id)) {
      retireDemoHouseForHost(normalizeWebsiteHost(existing.website_url));
    }
    return fromDemo(existing);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data, error } = await db
    .from("companies")
    .update({
      status,
      review_notes: reviewNotes ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const company = normalizeCompany(data);

  if (status === "approved" && !isHouseOwnerId(company.owner_id)) {
    await retireHouseListingsForHost(
      db,
      normalizeWebsiteHost(company.website_url),
    );
  }

  return company;
}

function retireDemoHouseForHost(host: string): void {
  const store = getDemoStore();
  const now = new Date().toISOString();
  for (const company of store.companies.values()) {
    if (!isHouseOwnerId(company.owner_id)) continue;
    if (normalizeWebsiteHost(company.website_url) !== host) continue;
    company.status = "suspended";
    company.review_notes = "Replaced by a real listing";
    company.updated_at = now;
    for (const placement of store.placements.values()) {
      if (
        placement.company_id !== company.id ||
        placement.status !== "active"
      ) {
        continue;
      }
      placement.status = "expired";
    }
  }
}

async function retireHouseListingsForHost(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  host: string,
): Promise<void> {
  const { data: houseCompanies, error } = await db
    .from("companies")
    .select("id, website_url")
    .eq("owner_id", HOUSE_OWNER_ID)
    .in("status", ["approved", "pending_review", "draft"]);

  if (error) throw new Error(error.message);

  const matches = (houseCompanies ?? []).filter(
    (row: { website_url: string }) =>
      normalizeWebsiteHost(row.website_url) === host,
  );
  if (matches.length === 0) return;

  const ids = matches.map((row: { id: string }) => row.id);
  const now = new Date().toISOString();

  const { error: suspendError } = await db
    .from("companies")
    .update({
      status: "suspended",
      review_notes: "Replaced by a real listing",
      updated_at: now,
    })
    .in("id", ids);
  if (suspendError) throw new Error(suspendError.message);

  const { error: expireError } = await db
    .from("placements")
    .update({ status: "expired", updated_at: now })
    .in("company_id", ids)
    .eq("status", "active");
  if (expireError) throw new Error(expireError.message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCompany(row: any): CompanyRow {
  return {
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    pitch: row.pitch,
    website_url: row.website_url,
    logo_path: row.logo_path ?? null,
    click_count: row.click_count ?? 0,
    tier: row.tier,
    preferred_billing_mode:
      row.preferred_billing_mode ?? row.billing_mode ?? "one_day",
    status: row.status,
    review_notes: row.review_notes ?? row.review_note ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const COMPANY_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Atomically increment the public outbound-click counter. */
export async function incrementCompanyClick(
  id: string,
): Promise<number | null> {
  const admin = await tryGetAdminClient();
  if (isDemoMode() || !admin) {
    return incrementDemoCompanyClick(id);
  }
  if (!COMPANY_ID_RE.test(id)) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data, error } = await db.rpc("increment_company_click", {
    p_company_id: id,
  });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : null;
}
