/**
 * Seeds house listings (approved companies + long-lived placements + season ratings).
 * Usage: npm run seed:house
 *
 * Idempotent: re-runs upsert house rows and skip hosts already claimed by real owners.
 */
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

import { INITIAL_ELO } from "../src/config/tiers";
import {
  faviconLogoUrl,
  HOUSE_CATALOG,
  HOUSE_OWNER_EMAIL,
  HOUSE_OWNER_ID,
  normalizeWebsiteHost,
} from "../src/lib/data/house-catalog";
import { getSeasonBounds, getSeasonKey } from "../src/lib/domain/seasons";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.",
  );
  process.exit(1);
}

// Node < 22 has no global WebSocket; supabase-js realtime needs one at construct time.
const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
});

const PLACEMENT_YEARS = 2;

async function ensureHouseUser(): Promise<void> {
  const { data: byId } = await admin.auth.admin.getUserById(HOUSE_OWNER_ID);

  if (byId?.user) {
    console.log(`House auth user already present (${HOUSE_OWNER_ID})`);
  } else {
    const { error: createError } = await admin.auth.admin.createUser({
      id: HOUSE_OWNER_ID,
      email: HOUSE_OWNER_EMAIL,
      email_confirm: true,
      user_metadata: { house: true },
    });
    if (createError) {
      if (createError.message.toLowerCase().includes("already")) {
        console.log(
          `House auth user exists (create conflict); continuing with ${HOUSE_OWNER_ID}`,
        );
      } else {
        throw new Error(createError.message);
      }
    } else {
      console.log(`Created house auth user ${HOUSE_OWNER_EMAIL}`);
    }
  }

  const now = new Date().toISOString();
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: HOUSE_OWNER_ID,
      email: HOUSE_OWNER_EMAIL,
      role: "owner",
      updated_at: now,
    },
    { onConflict: "id" },
  );
  if (profileError) throw new Error(profileError.message);
}

async function loadOccupiedHosts(): Promise<Set<string>> {
  const { data, error } = await admin
    .from("companies")
    .select("owner_id, website_url, status")
    .eq("status", "approved")
    .neq("owner_id", HOUSE_OWNER_ID);

  if (error) throw new Error(error.message);

  const hosts = new Set<string>();
  for (const row of data ?? []) {
    hosts.add(normalizeWebsiteHost(row.website_url));
  }
  return hosts;
}

async function findHouseCompany(
  websiteUrl: string,
): Promise<{ id: string } | null> {
  const { data, error } = await admin
    .from("companies")
    .select("id")
    .eq("owner_id", HOUSE_OWNER_ID)
    .eq("website_url", websiteUrl)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function ensureSeason(): Promise<{ id: string; season_key: string }> {
  const now = new Date();
  const seasonKey = getSeasonKey(now);
  const { startsAt, endsAt } = getSeasonBounds(now);

  const { data: existing, error: existingError } = await admin
    .from("seasons")
    .select("id, season_key")
    .eq("season_key", seasonKey)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) return existing;

  const { data: created, error: createError } = await admin
    .from("seasons")
    .insert({
      season_key: seasonKey,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select("id, season_key")
    .single();

  if (createError) {
    const { data: raced, error: raceError } = await admin
      .from("seasons")
      .select("id, season_key")
      .eq("season_key", seasonKey)
      .single();
    if (raceError || !raced) throw new Error(createError.message);
    return raced;
  }

  return created;
}

async function upsertActivePlacement(
  companyId: string,
  tier: string,
): Promise<void> {
  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setFullYear(endsAt.getFullYear() + PLACEMENT_YEARS);

  const { data: existing, error: findError } = await admin
    .from("placements")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();

  if (findError) throw new Error(findError.message);

  if (existing) {
    const { error } = await admin
      .from("placements")
      .update({
        tier,
        billing_mode: "daily_renew",
        status: "active",
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin.from("placements").insert({
    company_id: companyId,
    tier,
    billing_mode: "daily_renew",
    status: "active",
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
  });
  if (error) throw new Error(error.message);
}

async function main() {
  console.log(`Seeding ${HOUSE_CATALOG.length} house listings…`);
  await ensureHouseUser();

  const occupied = await loadOccupiedHosts();
  const season = await ensureSeason();
  console.log(`Season ${season.season_key} (${season.id})`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of HOUSE_CATALOG) {
    const host = normalizeWebsiteHost(entry.website_url);
    if (occupied.has(host)) {
      console.log(
        `  skip ${entry.name} — host ${host} claimed by a real listing`,
      );
      skipped += 1;
      continue;
    }

    const logoPath = faviconLogoUrl(entry.website_url);
    const existing = await findHouseCompany(entry.website_url);
    let companyId: string;

    if (existing) {
      const { data, error } = await admin
        .from("companies")
        .update({
          name: entry.name,
          pitch: entry.pitch,
          tier: entry.tier,
          logo_path: logoPath,
          preferred_billing_mode: "daily_renew",
          status: "approved",
          review_notes: "house seed",
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      companyId = data.id;
      updated += 1;
    } else {
      const { data, error } = await admin
        .from("companies")
        .insert({
          owner_id: HOUSE_OWNER_ID,
          name: entry.name,
          pitch: entry.pitch,
          website_url: entry.website_url,
          logo_path: logoPath,
          tier: entry.tier,
          preferred_billing_mode: "daily_renew",
          status: "approved",
          review_notes: "house seed",
          reviewed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      companyId = data.id;
      created += 1;
    }

    await upsertActivePlacement(companyId, entry.tier);

    const { error: ratingError } = await admin.from("company_ratings").upsert(
      {
        season_id: season.id,
        company_id: companyId,
        tier: entry.tier,
        elo: INITIAL_ELO,
        wins: 0,
        losses: 0,
      },
      {
        onConflict: "season_id,company_id",
        ignoreDuplicates: true,
      },
    );
    if (ratingError) throw new Error(ratingError.message);

    console.log(`  ok ${entry.name} (${entry.tier})`);
  }

  console.log(
    `\nDone. created=${created} updated=${updated} skipped=${skipped}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
