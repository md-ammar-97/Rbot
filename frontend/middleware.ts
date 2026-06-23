import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/gate",
  "/profile",
  "/jobs",
  "/apply",
  "/tracker",
  "/artifacts",
  "/settings",
];

export async function middleware(request: NextRequest) {
  // supabaseResponse starts as a passthrough — setAll will rebuild it when
  // a token refresh occurs, ensuring refreshed cookies reach the browser.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => {
          // Write refreshed tokens onto the request so downstream server code
          // sees them, then rebuild supabaseResponse so they go to the browser.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              options as Parameters<typeof supabaseResponse.cookies.set>[2]
            )
          );
        },
      },
    }
  );

  // getUser() triggers a silent token refresh when the access token is near-expired.
  const { data: { user } } = await supabase.auth.getUser();

  const path        = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  const redirect = (dest: string) => {
    const res = NextResponse.redirect(new URL(dest, request.url));
    // Copy any cookies that setAll wrote (e.g. refreshed access token) so they
    // aren't lost when we return a different response object than supabaseResponse.
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value));
    return res;
  };

  if (isProtected && !user) return redirect("/login");

  // Send logged-in users straight to the dashboard when they hit the public pages.
  if ((path === "/" || path === "/login") && user) return redirect("/dashboard");

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|auth/callback).*)"],
};
