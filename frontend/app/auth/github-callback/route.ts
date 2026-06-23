import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url   = new URL(request.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/settings?error=github_auth_failed`, url.origin)
    );
  }

  // Pass code + state to the settings page; SettingsClient will POST them to the backend
  return NextResponse.redirect(
    new URL(`/settings?github_code=${encodeURIComponent(code)}&github_state=${encodeURIComponent(state ?? "")}`, url.origin)
  );
}
