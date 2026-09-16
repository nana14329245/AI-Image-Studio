import { getSupabaseConfig } from "@/lib/supabase/config";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that don't require a signed-in user.
// /reset-password is intentionally absent: the recovery link signs the user in
// through /auth/callback first, so it is reached with a session.
const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/auth", "/api/webhooks"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  const settings = getSupabaseConfig();
  const pathname = request.nextUrl.pathname;
  // The setup page never creates a client; protected routes stay closed.
  if (pathname === "/setup") return NextResponse.next({ request });
  if (!settings) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Service configuration is incomplete. Open /setup.", code: "SUPABASE_NOT_CONFIGURED" },
        { status: 503 }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    url.search = "";
    return NextResponse.redirect(url);
  }
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    settings.url,
    settings.key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: this call refreshes the auth token and must not be removed.
  const {
    data: { user },
  } = await supabase.auth.getUser();


  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every path except static assets and image optimization files.
     * Keep this list in sync with what Next.js serves from /public.
     *
     * The metadata routes are excluded because they are read by crawlers and by
     * the link-preview scrapers behind LINE and Facebook, which carry no session:
     * left in, they were answered with a 307 to /login and no preview rendered.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)",
  ],
};
