import { NextResponse } from "next/server";

import { startPublicListing } from "@/lib/data/listings";
import { getPoolQuotes } from "@/lib/data/occupancy";
import { publicListingSchema } from "@/lib/validation";

export async function GET() {
  try {
    const pools = await getPoolQuotes();
    return NextResponse.json({ pools });
  } catch (error) {
    const message = error instanceof Error ? error.message : "pricing_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const parsed = publicListingSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await startPublicListing(parsed.data);
    return NextResponse.json({
      ok: true,
      url: result.url,
      demo: result.demo,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "listing_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
