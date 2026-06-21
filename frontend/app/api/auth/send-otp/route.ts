import { createClient } from "@supabase/supabase-js";
import { NextResponse }  from "next/server";

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Step 1: Verify credentials
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const userId = authData.user.id;

    // Step 2: Check for an active (unexpired, unused) OTP
    const { data: existing } = await supabaseAdmin
      .from("otp_verifications")
      .select("otp_code")
      .eq("email", email)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const otpCode = existing?.otp_code ?? Math.floor(100000 + Math.random() * 900000).toString();

    // Step 3: Insert a new row only if no active OTP
    if (!existing) {
      await supabaseAdmin.from("otp_verifications").insert({
        user_id:    userId,
        email,
        otp_code:   otpCode,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
    }

    // Step 4: Send email
    await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:    process.env.OTP_FROM_EMAIL,
        to:      [email],
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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
