import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiAdmin } from "@/lib/auth-api";
import { reviewCompany } from "@/lib/data/companies";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z
  .object({
    action: z.enum(["approve", "reject", "suspend"]).optional(),
    status: z.enum(["approved", "rejected", "suspended"]).optional(),
    review_notes: z.string().trim().max(1000).optional(),
    reviewNote: z.string().trim().max(1000).optional(),
  })
  .refine((value) => Boolean(value.action || value.status), {
    message: "action or status required",
  });

function toAction(
  action?: "approve" | "reject" | "suspend",
  status?: "approved" | "rejected" | "suspended",
): "approve" | "reject" | "suspend" {
  if (action) return action;
  if (status === "approved") return "approve";
  if (status === "rejected") return "reject";
  return "suspend";
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireApiAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const company = await reviewCompany(
      id,
      toAction(parsed.data.action, parsed.data.status),
      parsed.data.review_notes ?? parsed.data.reviewNote,
      auth.user.id,
    );
    return NextResponse.json({ company });
  } catch (error) {
    const message = error instanceof Error ? error.message : "review_failed";
    const status = message === "company_not_found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
