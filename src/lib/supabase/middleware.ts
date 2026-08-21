import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

export type SessionIdentity = {
  id: string;
};

export type UpdateSessionResult = {
  response: NextResponse;
  user: SessionIdentity | null;
};

export async function updateSession(
  request: NextRequest,
): Promise<UpdateSessionResult> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  // Prefer getClaims (JWT verify); fall back to getUser for older clients.
  let user: SessionIdentity | null = null;

  if (typeof supabase.auth.getClaims === "function") {
    const { data } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    if (typeof sub === "string" && sub.length > 0) {
      user = { id: sub };
    }
  } else {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      user = { id: data.user.id };
    }
  }

  return { response: supabaseResponse, user };
}
