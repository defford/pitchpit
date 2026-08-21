import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { isDemoMode } from "@/lib/demo-mode";
import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

const DEMO_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo-owner@pitchpit.local",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date(0).toISOString(),
} as User;

export async function requireUser(): Promise<User> {
  if (isDemoMode()) return DEMO_USER;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin(): Promise<{
  user: User;
  profile: Profile;
}> {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  return { user, profile };
}

export async function ensureProfile(user: User): Promise<Profile> {
  if (isDemoMode()) {
    return {
      id: user.id,
      email: user.email ?? "demo@pitchpit.local",
      role: "admin",
      stripe_customer_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email ?? "",
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to ensure profile");
  }

  return data;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (isDemoMode()) {
    return {
      id: DEMO_USER.id,
      email: DEMO_USER.email!,
      role: "admin",
      stripe_customer_id: null,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
