import { NextResponse } from "next/server";

import { listCardHistory } from "@/lib/data/battles";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cards = await listCardHistory();
    return NextResponse.json({ cards });
  } catch (error) {
    const message = error instanceof Error ? error.message : "history_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
