import { NextResponse } from "next/server";

import { incrementCompanyClick } from "@/lib/data/companies";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const clickCount = await incrementCompanyClick(id);
    if (clickCount == null) {
      return NextResponse.json({ error: "company_not_found" }, { status: 404 });
    }
    return NextResponse.json({ clickCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "click_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
