import { NextResponse } from "next/server";
import { z } from "zod";

import { allocateVote } from "@/lib/data/battles";
import { getSeasonKey } from "@/lib/domain/seasons";
import { getOrCreateVisitorId, hashIpForDay } from "@/lib/visitor";

const bodySchema = z.object({
  battleId: z.string().uuid(),
  pointsA: z.number().int().nonnegative(),
  pointsB: z.number().int().nonnegative(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const visitorId = await getOrCreateVisitorId();
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "0.0.0.0";
    const ipHash = await hashIpForDay(ip, getSeasonKey(new Date()));

    const result = await allocateVote({
      battleId: parsed.data.battleId,
      pointsA: parsed.data.pointsA,
      pointsB: parsed.data.pointsB,
      visitorId,
      ipHash,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "vote_failed";
    const status =
      message === "rate_limited"
        ? 429
        : message.includes("battle_") ||
            message.includes("invalid_") ||
            message.includes("already_") ||
            message.includes("card_") ||
            message.includes("visitor_")
          ? 409
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
