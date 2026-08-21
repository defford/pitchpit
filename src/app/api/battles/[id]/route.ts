import { NextResponse } from "next/server";

import { getBattleById } from "@/lib/data/battles";
import { getOrCreateVisitorId } from "@/lib/visitor";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const visitorId = await getOrCreateVisitorId();
    const payload = await getBattleById(id, visitorId);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "battle_failed";
    const status = message === "battle_not_found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
