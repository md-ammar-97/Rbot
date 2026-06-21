"use client";

import { useState, Suspense } from "react";
import { useRouter }          from "next/navigation";
import Link                   from "next/link";
import { useSearchParams }    from "next/navigation";
import { createClient }       from "@/lib/supabase/client";

// ---------- disposable domain block-list ----------
const BLOCKED_DOMAINS = new Set([
  "mailinator.com","guerrillamail.com","temp-mail.org","throwaway.email",
  "yopmail.com","sharklasers.com","guerrillamailblock.com","grr.la",
  "guerrillamail.info","spam4.me","trashmail.com","trashmail.me",
  "trashmail.net","dispostable.com","mailnull.com","spamgourmet.com",
  "10minutemail.com","tempmail.com","fakeinbox.com","maildrop.cc",
  "mailnesia.com","mintemail.com","spamspot.com","mailsac.com",
  "getnada.com","discard.email","tempr.email","spamgourmet.org",
  "owlpic.com","inboxbear.com","mohmal.com","mailtemp.net",
  "filzmail.com","throwam.com","binkmail.com","safetymail.info",
  "mailpoof.com","drdrb.com","spamfree24.org","spamgob.com",
]);

function isDisposable(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return BLOCKED_DOMAINS.has(domain);
}
// --------------------------------------------------

type Stage = "choose" | "otp";

function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const urlError     = searchParams.get("error");

  const supabase = createClient();

  const [stage,       setStage]       = useState<Stage>("choose");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [otpCode,     setOtpCode]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [showModal,   setShowModal]   = useState(false);

  // ---- Google OAuth ----
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes:     "openid email profile",
      },
    });

    if (oauthError) {
      setError("Google sign-in is not available right now.");
      setLoading(false);
    }
  };

  // ---- Email + Password → send OTP ----
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isDisposable(email)) {
      setError("Disposable email addresses are not allowed.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as any).error ?? "Invalid email or password.");
        return;
      }

      setStage("otp");
    } finally {
      setLoading(false);
    }
  };

  // ---- Verify OTP ----
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password, otp_code: otpCode }),
      });

      const body = await res.json().catch(() => ({})) as any;

      if (!res.ok) {
        setError(body.error ?? "Verification failed. Please try again.");
        return;
      }

      // Establish session in the browser
      await supabase.auth.setSession({
        access_token:  body.session.access_token,
        refresh_token: body.session.refresh_token,
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", body.user.id)
        .single();

      router.replace(profile?.onboarding_complete ? "/dashboard" : "/onboarding");
    } finally {
      setLoading(false);
    }
  };

  // ---- Resend OTP ----
  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as any).error ?? "Could not resend the code.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-apple-surface flex items-center justify-center px-6">
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-[22px] font-bold text-apple-text">RBot</Link>
          <p className="mt-2 text-[15px] text-apple-text-secondary">
            AI Job Co-Pilot for Product Managers
          </p>
        </div>

        {/* Card */}
        <div className="card p-8">

          {stage === "choose" && (
            <>
              <h1 className="text-[22px] font-semibold text-apple-text text-center mb-6">
                Sign in to RBot
              </h1>

              {/* URL error (e.g. ?error=auth_failed) */}
              {urlError && (
                <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-[13px] text-red-600 text-center">
                    {urlError === "auth_failed"
                      ? "Sign-in failed. Please try again."
                      : urlError}
                  </p>
                </div>
              )}

              {/* Google */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-[50px] flex items-center justify-center gap-3
                           bg-white border border-apple-border rounded-xl
                           text-[15px] font-medium text-apple-text
                           hover:bg-apple-surface active:scale-[0.98]
                           transition-all duration-150 disabled:opacity-60"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-apple-border" />
                <span className="text-[12px] text-apple-text-tertiary">or sign in with email</span>
                <div className="flex-1 h-px bg-apple-border" />
              </div>

              {/* Email + Password form */}
              <form onSubmit={handleSendOTP} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="input"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="input"
                />

                {error && (
                  <p className="text-[13px] text-red-500 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {loading ? "Sending code…" : "Send Verification Code"}
                </button>
              </form>

              {/* Blocked signup */}
              <div className="mt-5 text-center">
                <button
                  onClick={() => setShowModal(true)}
                  className="text-[13px] text-apple-text-tertiary hover:text-apple-text underline-offset-2 hover:underline transition-colors"
                >
                  Don&apos;t have an account? Sign up
                </button>
              </div>
            </>
          )}

          {stage === "otp" && (
            <>
              <button
                onClick={() => { setStage("choose"); setError(null); setOtpCode(""); }}
                className="mb-4 text-[13px] text-apple-accent hover:underline flex items-center gap-1"
              >
                ← Back
              </button>

              <h1 className="text-[20px] font-semibold text-apple-text mb-2">
                Enter your code
              </h1>
              <p className="text-[13px] text-apple-text-secondary mb-6">
                We sent a 6-digit code to <strong>{email}</strong>.
                It expires in 5 minutes.
              </p>

              <form onSubmit={handleVerifyOTP} className="flex flex-col gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoFocus
                  className="input text-center text-[24px] tracking-[0.5em] font-mono"
                />

                {error && (
                  <p className="text-[13px] text-red-500 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {loading ? "Verifying…" : "Verify Code"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="text-[13px] text-apple-accent hover:underline disabled:opacity-50"
                >
                  Didn&apos;t receive it? Resend code
                </button>
              </div>
            </>
          )}
        </div>

        <div className="text-center mt-5">
          <Link href="/" className="text-[13px] text-apple-text-secondary hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>

      {/* Blocked signup modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="card p-8 max-w-sm w-full text-center"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[17px] font-semibold text-apple-text mb-2">
              Public Signup Disabled
            </p>
            <p className="text-[14px] text-apple-text-secondary mb-6 leading-relaxed">
              To request access, please contact{" "}
              <a
                href="mailto:mohdammar97@gmail.com"
                className="text-apple-accent underline"
              >
                mohdammar97@gmail.com
              </a>
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="btn-primary w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
