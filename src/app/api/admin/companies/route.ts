import { NextResponse } from "next/server";

import { requireApiAdmin } from "@/lib/auth-api";
import { listAllCompanies } from "@/lib/data/companies";

export async function GET() {
  const auth = await requireApiAdmin();
  if ("error" in auth) return auth.error;

  try {
    const companies = await listAllCompanies();
    return NextResponse.json({ companies });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
