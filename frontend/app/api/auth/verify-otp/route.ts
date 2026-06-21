import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, validateEnv } from "../_utils";

const SECRET_CODE = "AMMAR8800206651";

export async function POST(req: NextRequest) {
  try {
    validateEnv();
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let email: string, otp: string, secretCode: string;
  try {
    const body = await req.json();
    email      = (body.email      ?? "").trim().toLowerCase();
    otp        = (body.otp        ?? "").trim();
    secretCode = (body.secretCode ?? "").trim();
    if (!email || !otp || !secretCode) throw new Error();
  } catch {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (secretCode !== SECRET_CODE) {
    return NextResponse.json({ error: "Invalid access code." }, { status: 400 });
  }

  const adminSupabase = getAdminClient();

  // Look up the latest active OTP for this email
  const { data: record, error: fetchError } = await adminSupabase
    .from("otp_verifications")
    .select("*")
    .eq("email", email)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !record) {
    return NextResponse.json(
      { error: "Invalid or expired code. Request a new one." },
      { status: 400 }
    );
  }

  if (record.attempts >= 5) {
    return NextResponse.json(
      { error: "Too many failed attempts. Request a new code." },
      { status: 429 }
    );
  }

  // Increment attempt count before checking code (prevents brute force)
  await adminSupabase
    .from("otp_verifications")
    .update({ attempts: record.attempts + 1 })
    .eq("id", record.id);

  if (record.otp_code !== otp) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  // Mark used
  await adminSupabase
    .from("otp_verifications")
    .update({ used: true })
    .eq("id", record.id);

  // Generate a fresh session token (no email sent)
  const { data: sessionLink, error: sessionError } =
    await adminSupabase.auth.admin.generateLink({ type: "magiclink", email });

  if (sessionError || !sessionLink?.properties?.hashed_token) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({ token_hash: sessionLink.properties.hashed_token });
}
