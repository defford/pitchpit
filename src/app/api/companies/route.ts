import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-api";
import {
  createCompanyForOwner,
  listCompaniesForOwner,
} from "@/lib/data/companies";
import { companyCreateSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  try {
    const companies = await listCompaniesForOwner(auth.user.id);
    return NextResponse.json({ companies });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const parsed = companyCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const company = await createCompanyForOwner(auth.user.id, {
      name: parsed.data.name,
      pitch: parsed.data.pitch,
      website_url: parsed.data.website_url,
      tier: parsed.data.tier,
      billingMode: parsed.data.billingMode,
    });
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
