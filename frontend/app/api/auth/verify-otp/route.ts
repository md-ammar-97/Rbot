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
    const { email, password, otp_code } = await request.json();

    if (!email || !password || !otp_code) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Step 1: Find the active OTP for this email
    const { data: otpRow } = await supabaseAdmin
      .from("otp_verifications")
      .select("id, otp_code, attempts, expires_at")
      .eq("email", email)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!otpRow) {
      return NextResponse.json(
        { error: "Code expired or not found. Request a new one." },
        { status: 401 }
      );
    }

    // Step 2: Increment attempts and check lock
    const newAttempts = otpRow.attempts + 1;

    await supabaseAdmin
      .from("otp_verifications")
      .update({ attempts: newAttempts })
      .eq("id", otpRow.id);

    if (newAttempts > 5) {
      return NextResponse.json(
        { error: "Too many incorrect attempts. Request a new code." },
        { status: 429 }
      );
    }

    // Step 3: Verify the code
    if (otp_code.trim() !== otpRow.otp_code) {
      return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 401 });
    }

    // Step 4: Mark as used
    await supabaseAdmin
      .from("otp_verifications")
      .update({ used: true })
      .eq("id", otpRow.id);

    // Step 5: Sign in the user and return the session
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return NextResponse.json({ error: "Sign-in failed." }, { status: 500 });
    }

    return NextResponse.json({
      session: {
        access_token:  data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at:    data.session.expires_at,
        token_type:    data.session.token_type,
      },
      user: {
        id:    data.user.id,
        email: data.user.email,
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
