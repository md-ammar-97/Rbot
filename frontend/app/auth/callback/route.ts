import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url    = new URL(request.url);
  const origin = url.origin;
  const code   = url.searchParams.get("code");
  const error  = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  // Use a NextResponse.next() as a cookie sink — supabase setAll writes
  // session cookies here; we copy them to the final redirect response.
  const cookieSink = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cs) =>
          cs.forEach(({ name, value, options }) =>
            cookieSink.cookies.set(name, value, options as Parameters<typeof cookieSink.cookies.set>[2])
          ),
      },
    }
  );

  const { data, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.session) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", data.session.user.id)
    .single();

  const redirectTo = profile?.onboarding_complete ? "/dashboard" : "/onboarding";
  const finalResponse = NextResponse.redirect(new URL(redirectTo, origin));

  // Copy session cookies from the sink to the redirect response
  cookieSink.cookies.getAll().forEach((c) =>
    finalResponse.cookies.set(c.name, c.value, {
      httpOnly: c.httpOnly,
      secure:   c.secure,
      sameSite: c.sameSite as "lax" | "strict" | "none" | undefined,
      maxAge:   c.maxAge,
      path:     c.path,
      domain:   c.domain,
    })
  );

  return finalResponse;
}
