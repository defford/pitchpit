import { NextResponse } from "next/server";
import { z } from "zod";

import { getCardSession } from "@/lib/data/battles";
import { getOrCreateVisitorId } from "@/lib/visitor";

const bodySchema = z
  .object({
    afterBattleId: z.string().uuid().optional(),
    skip: z.boolean().optional(),
  })
  .optional();

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const visitorId = await getOrCreateVisitorId();
    const payload = await getCardSession(visitorId, {
      afterBattleId: parsed.data?.afterBattleId,
      skip: parsed.data?.skip,
    });
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "battle_failed";
    const status =
      message === "no_eligible_companies" || message === "card_complete"
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
