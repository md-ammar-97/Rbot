import { randomInt }     from "crypto";
import { NextResponse }  from "next/server";
import {
  AuthConfigurationError,
  getOtpEmailConfig,
  getSupabaseAuthClients,
  normalizeEmail,
  redactAuthError,
} from "../_utils";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || typeof password !== "string" || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { resendApiKey, fromEmail } = getOtpEmailConfig();
    const { supabaseAnon, supabaseAdmin } = getSupabaseAuthClients();

    // Step 1: Verify credentials
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError || !authData.user) {
      if (authError) {
        console.warn("send-otp credential check failed", {
          message: authError.message,
          status: authError.status,
        });
      }
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const userId = authData.user.id;

    // Step 2: Check for an active (unexpired, unused) OTP
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("otp_verifications")
      .select("otp_code")
      .eq("email", normalizedEmail)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("send-otp active OTP lookup failed", existingError);
      return NextResponse.json(
        { error: "Could not prepare a verification code." },
        { status: 500 }
      );
    }

    const otpCode = existing?.otp_code ?? randomInt(100000, 1000000).toString();

    // Step 3: Insert a new row only if no active OTP
    if (!existing) {
      const { error: insertError } = await supabaseAdmin.from("otp_verifications").insert({
        user_id:    userId,
        email:      normalizedEmail,
        otp_code:   otpCode,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

      if (insertError) {
        console.error("send-otp insert failed", insertError);
        return NextResponse.json(
          { error: "Could not prepare a verification code." },
          { status: 500 }
        );
      }
    }

    // Step 4: Send email
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    fromEmail,
        to:      [normalizedEmail],
        subject: "Your RBot sign-in code",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:400px;margin:0 auto;">
            <h2 style="color:#1d1d1f;">Your RBot sign-in code</h2>
            <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0071e3;">${otpCode}</p>
            <p style="color:#6e6e73;font-size:14px;">This code expires in 5 minutes.
            If you did not request this, you can ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const body = await resendResponse.text().catch(() => "");
      console.error("send-otp Resend request failed", {
        status: resendResponse.status,
        body: body.slice(0, 500),
      });

      return NextResponse.json(
        { error: "Could not send the verification email." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      console.error("send-otp configuration error", { message: error.message });
      return NextResponse.json(
        { error: "Email sign-in is not configured." },
        { status: 503 }
      );
    }

    console.error("send-otp unexpected error", redactAuthError(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
