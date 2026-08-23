/**
 * Retires house (placeholder) listings so only real submissions stay on the card.
 * Usage: npm run retire:house
 */
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

import {
  HOUSE_OWNER_EMAIL,
  HOUSE_OWNER_ID,
} from "../src/lib/data/house-catalog";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before retiring house listings.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
});

async function main() {
  const now = new Date().toISOString();

  const { data: houseCompanies, error: loadError } = await admin
    .from("companies")
    .select("id, name, status")
    .eq("owner_id", HOUSE_OWNER_ID)
    .neq("status", "suspended");

  if (loadError) throw new Error(loadError.message);

  const ids = (houseCompanies ?? []).map((row) => row.id);
  console.log(
    `Retiring ${ids.length} house listings for ${HOUSE_OWNER_EMAIL}…`,
  );

  if (ids.length === 0) {
    console.log("Nothing to retire.");
    return;
  }

  const { error: expireError } = await admin
    .from("placements")
    .update({ status: "expired", updated_at: now })
    .in("company_id", ids)
    .eq("status", "active");
  if (expireError) throw new Error(expireError.message);

  const { error: suspendError } = await admin
    .from("companies")
    .update({
      status: "suspended",
      review_notes: "Retired house seed",
      updated_at: now,
    })
    .in("id", ids);
  if (suspendError) throw new Error(suspendError.message);

  for (const row of houseCompanies ?? []) {
    console.log(`  retired ${row.name}`);
  }

  console.log("Done. Real submissions are unchanged.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
