import type { BillingMode, Tier } from "@/config/tiers";
import { getDemoStore, type DemoCompany } from "@/lib/data/demo-store";
import { isDemoMode, tryGetAdminClient } from "@/lib/demo-mode";

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
      logo_path: input.logo_path ?? null,
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
      logo_path: input.logo_path ?? null,
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
    if (input.logo_path !== undefined) existing.logo_path = input.logo_path;
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
  if (input.logo_path !== undefined) patch.logo_path = input.logo_path;

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
  return normalizeCompany(data);
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
    tier: row.tier,
    preferred_billing_mode:
      row.preferred_billing_mode ?? row.billing_mode ?? "one_day",
    status: row.status,
    review_notes: row.review_notes ?? row.review_note ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
