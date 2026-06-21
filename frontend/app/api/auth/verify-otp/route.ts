import { NextResponse }  from "next/server";
import {
  AuthConfigurationError,
  getSupabaseAuthClients,
  normalizeEmail,
  redactAuthError,
} from "../_utils";

export async function POST(request: Request) {
  try {
    const { email, password, otp_code } = await request.json();
    const normalizedEmail = normalizeEmail(email);
    const normalizedOtp = typeof otp_code === "string" ? otp_code.trim() : "";

    if (!normalizedEmail || typeof password !== "string" || !password || !normalizedOtp) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { supabaseAnon, supabaseAdmin } = getSupabaseAuthClients();

    // Step 1: Find the active OTP for this email
    const { data: otpRow, error: otpLookupError } = await supabaseAdmin
      .from("otp_verifications")
      .select("id, otp_code, attempts, expires_at")
      .eq("email", normalizedEmail)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpLookupError) {
      console.error("verify-otp lookup failed", otpLookupError);
      return NextResponse.json(
        { error: "Could not verify the code." },
        { status: 500 }
      );
    }

    if (!otpRow) {
      return NextResponse.json(
        { error: "Code expired or not found. Request a new one." },
        { status: 401 }
      );
    }

    // Step 2: Increment attempts and check lock
    const newAttempts = otpRow.attempts + 1;

    const { error: attemptsError } = await supabaseAdmin
      .from("otp_verifications")
      .update({ attempts: newAttempts })
      .eq("id", otpRow.id);

    if (attemptsError) {
      console.error("verify-otp attempts update failed", attemptsError);
      return NextResponse.json(
        { error: "Could not verify the code." },
        { status: 500 }
      );
    }

    if (newAttempts > 5) {
      return NextResponse.json(
        { error: "Too many incorrect attempts. Request a new code." },
        { status: 429 }
      );
    }

    // Step 3: Verify the code
    if (normalizedOtp !== otpRow.otp_code) {
      return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 401 });
    }

    // Step 4: Mark as used
    const { error: usedError } = await supabaseAdmin
      .from("otp_verifications")
      .update({ used: true })
      .eq("id", otpRow.id);

    if (usedError) {
      console.error("verify-otp used update failed", usedError);
      return NextResponse.json(
        { error: "Could not verify the code." },
        { status: 500 }
      );
    }

    // Step 5: Sign in the user and return the session
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.session) {
      if (error) {
        console.warn("verify-otp final sign-in failed", {
          message: error.message,
          status: error.status,
        });
      }
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
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      console.error("verify-otp configuration error", { message: error.message });
      return NextResponse.json(
        { error: "Email sign-in is not configured." },
        { status: 503 }
      );
    }

    console.error("verify-otp unexpected error", redactAuthError(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
