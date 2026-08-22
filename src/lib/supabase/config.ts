export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function authCallbackUrl(request: Request, next: string) {
  const origin =
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(request.url).origin;
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
