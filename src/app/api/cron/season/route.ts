import { NextResponse } from "next/server";

import { resolveExpiredCards } from "@/lib/data/battles";
import {
  ensureCurrentSeason,
  expireOneDayPlacements,
} from "@/lib/data/seasons";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const season = await ensureCurrentSeason();
    const expired = await expireOneDayPlacements();
    const resolvedCards = await resolveExpiredCards();
    return NextResponse.json({
      ok: true,
      seasonKey: season.season_key,
      seasonId: season.id,
      expiredOneDayPlacements: expired,
      resolvedCards,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "cron_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
