import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth-api";
import { updateCompanyForOwner } from "@/lib/data/companies";
import { companyUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = companyUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const company = await updateCompanyForOwner(id, auth.user.id, {
      name: parsed.data.name,
      pitch: parsed.data.pitch,
      website_url: parsed.data.website_url,
      tier: parsed.data.tier,
      billingMode: parsed.data.billingMode,
    });
    return NextResponse.json({ company });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    const status = message === "company_not_found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
