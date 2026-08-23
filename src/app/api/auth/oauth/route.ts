import { NextResponse } from "next/server";

import { authCallbackUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { oauthLoginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Auth is not configured." },
      { status: 503 },
    );
  }

  const parsed = oauthLoginSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose Google or X to continue." },
      { status: 400 },
    );
  }

  const redirectTo = authCallbackUrl(request, parsed.data.next);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: parsed.data.provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      return NextResponse.json(
        { error: oauthStartError(error, parsed.data.provider) },
        { status: 400 },
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Could not start social sign in.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function oauthStartError(
  error: { message?: string } | null,
  provider: "google" | "x",
) {
  const raw = error?.message?.trim() ?? "";
  let text = raw;
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { msg?: string; message?: string };
      text = parsed.msg || parsed.message || raw;
    } catch {
      text = raw;
    }
  }

  if (
    /provider is not enabled/i.test(text) ||
    /unsupported provider/i.test(text)
  ) {
    const label = provider === "x" ? "X" : "Google";
    return `${label} sign-in is not enabled on this project yet.`;
  }

  return text || "Could not start social sign in.";
}
