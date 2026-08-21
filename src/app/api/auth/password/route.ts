import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { adminPasswordLoginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Auth is not configured." },
      { status: 503 },
    );
  }

  const parsed = adminPasswordLoginSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email and password." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "Sign in failed." },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "This account is not an admin." },
        { status: 403 },
      );
    }

    return NextResponse.json({ ok: true, next: parsed.data.next });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Sign in failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
