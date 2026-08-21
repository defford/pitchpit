import { NextResponse, type NextRequest } from "next/server";

import { isDemoMode } from "@/lib/demo-mode";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminLogin = pathname === "/admin/login";
  const isProtected =
    pathname.startsWith("/dashboard") ||
    (pathname.startsWith("/admin") && !isAdminLogin);

  // Demo / missing Supabase: skip auth refresh.
  // Protected pages remain reachable in demo so UI can be exercised offline.
  if (isDemoMode() || !isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const { updateSession } = await import("@/lib/supabase/middleware");
  const { response, user } = await updateSession(request);

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = pathname.startsWith("/admin")
      ? "/admin/login"
      : "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
