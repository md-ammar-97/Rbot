import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, generateOtpCode, validateEnv } from "../_utils";

export async function POST(req: NextRequest) {
  try {
    validateEnv();
  } catch (e) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let email: string;
  try {
    const body = await req.json();
    email = (body.email ?? "").trim().toLowerCase();
    if (!email) throw new Error();
  } catch {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const adminSupabase = getAdminClient();

  // Get or create the Supabase user via generateLink (no email sent)
  const { data: linkData, error: linkError } =
    await adminSupabase.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !linkData?.user?.id) {
    return NextResponse.json({ error: "Failed to resolve user" }, { status: 500 });
  }
  const userId = linkData.user.id;

  // Remove any existing unused OTPs for this user
  await adminSupabase
    .from("otp_verifications")
    .delete()
    .eq("user_id", userId)
    .eq("used", false);

  // Generate and store new OTP
  const otpCode   = generateOtpCode();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { error: insertError } = await adminSupabase
    .from("otp_verifications")
    .insert({ user_id: userId, email, otp_code: otpCode, expires_at: expiresAt });

  if (insertError) {
    return NextResponse.json({ error: "Failed to store code" }, { status: 500 });
  }

  // Send via Resend
  const resendRes = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:    process.env.OTP_FROM_EMAIL,
      to:      email,
      subject: "Your PMFit sign-in code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="margin-bottom:8px;">Sign in to PMFit</h2>
          <p style="color:#555;margin-bottom:24px;">Enter this code on the sign-in page:</p>
          <div style="background:#f4f4f5;border-radius:8px;padding:20px 32px;text-align:center;
                      font-size:28px;font-weight:700;letter-spacing:0.15em;font-family:monospace;">
            ${otpCode}
          </div>
          <p style="color:#888;font-size:13px;margin-top:20px;">
            This code expires in 1 hour and can only be used once.
          </p>
        </div>`,
    }),
  });

  if (!resendRes.ok) {
    const resendBody = await resendRes.text();
    console.error("Resend error:", resendBody);
    return NextResponse.json({ error: "Failed to send email" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
