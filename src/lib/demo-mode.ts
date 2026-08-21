/**
 * Demo mode runs without live Supabase/Stripe secrets.
 * Enabled explicitly via DEMO_MODE=true, or automatically when the
 * service role key is missing (local UI / build without secrets).
 */
export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.DEMO_MODE === "false") return false;
  return !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export async function tryGetAdminClient() {
  if (isDemoMode()) {
    return null;
  }
  try {
    const { getAdminClient } = await import("@/lib/supabase/admin");
    return getAdminClient();
  } catch {
    return null;
  }
}
