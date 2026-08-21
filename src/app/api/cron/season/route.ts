import { NextResponse } from "next/server";

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
    return NextResponse.json({
      ok: true,
      seasonKey: season.season_key,
      seasonId: season.id,
      expiredOneDayPlacements: expired,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "cron_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
