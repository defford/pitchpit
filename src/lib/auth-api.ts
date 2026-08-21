import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { isDemoMode } from "@/lib/demo-mode";
import type { Profile } from "@/lib/auth";

const DEMO_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo-owner@pitchpit.local",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date(0).toISOString(),
} as User;

const DEMO_ADMIN_PROFILE: Profile = {
  id: DEMO_USER.id,
  email: DEMO_USER.email!,
  role: "admin",
  stripe_customer_id: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

export async function requireApiUser(): Promise<
  { user: User } | { error: NextResponse }
> {
  if (isDemoMode()) {
    return { user: DEMO_USER };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  return { user };
}

export async function requireApiAdmin(): Promise<
  { user: User; profile: Profile } | { error: NextResponse }
> {
  if (isDemoMode()) {
    return { user: DEMO_USER, profile: DEMO_ADMIN_PROFILE };
  }

  const auth = await requireApiUser();
  if ("error" in auth) return auth;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return {
      error: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  return { user: auth.user, profile: profile as Profile };
}
