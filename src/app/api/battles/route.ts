import { NextResponse } from "next/server";

import { getCardSession } from "@/lib/data/battles";
import { getOrCreateVisitorId } from "@/lib/visitor";

export async function POST() {
  try {
    const visitorId = await getOrCreateVisitorId();
    const payload = await getCardSession(visitorId);
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

export async function GET() {
  return POST();
}
