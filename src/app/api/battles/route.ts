import { NextResponse } from "next/server";

import { createBattle } from "@/lib/data/battles";
import { getOrCreateVisitorId } from "@/lib/visitor";

export async function POST() {
  try {
    const visitorId = await getOrCreateVisitorId();
    const payload = await createBattle(visitorId);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "battle_failed";
    const status = message === "no_eligible_companies" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
