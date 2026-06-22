"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { OTPInput } from "@/components/auth/OTPInput";
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

type Stage = "email" | "gate";

const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.4, ease: "easeOut" as const } },
  exit:    { opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.25 } },
};

function LoginContent() {
  const searchParams = useSearchParams();
  const urlError     = searchParams.get("error");
  const supabase     = createClient();

  const [stage,      setStage]      = useState<Stage>("email");
  const [email,      setEmail]      = useState("");
  const [otpCode,    setOtpCode]    = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [otpError,   setOtpError]   = useState(false);
  const [success,    setSuccess]    = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, scopes: "openid email profile" },
    });
    if (oauthError) {
      setError("Google sign-in is not available right now.");
      setLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send code. Try again."); return; }
      setStage("gate");
      setOtpCode("");
    } finally { setLoading(false); }
  };

  const handleVerifyGate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOtpError(false);
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otpCode.trim(), secretCode: secretCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(true);
        setError(data.error ?? "Verification failed. Please try again.");
        return;
      }

      const { error: verifyError, data: authData } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "email",
      });
      if (verifyError || !authData.session) {
        setOtpError(true);
        setError(verifyError?.message ?? "Session creation failed. Please try again.");
        return;
      }

      setSuccess(true);
      await new Promise((r) => setTimeout(r, 600));

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", authData.session.user.id)
        .single();

      window.location.href = profile?.onboarding_complete ? "/dashboard" : "/onboarding";
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed to resend code.");
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-pmfit-bg flex items-center justify-center px-6">
      {/* Background orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] right-[15%] w-96 h-96 rounded-full opacity-10"
             style={{ background: "radial-gradient(circle, #0052CC, transparent 70%)" }} />
        <div className="absolute bottom-[-10%] left-[10%] w-80 h-80 rounded-full opacity-8"
             style={{ background: "radial-gradient(circle, #6B5ACD, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo variant="top" size="lg" className="justify-center mb-3" />
          <p className="text-[15px] text-pmfit-text-secondary">
            AI Job Co-Pilot for Product Managers
          </p>
        </div>

        <AnimatePresence mode="wait">
          {stage === "email" ? (
            <motion.div
              key="email-stage"
              variants={cardVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="card p-8"
            >
              <h1 className="text-[22px] font-bold text-pmfit-text text-center mb-6">
                Sign in to PMFit
              </h1>

              {urlError && (
                <div className="mb-5 p-3 rounded-xl bg-pmfit-red-subtle border border-pmfit-red/20">
                  <p className="text-[13px] text-pmfit-red text-center">
                    {urlError === "auth_failed" ? "Sign-in failed. Please try again." : urlError}
                  </p>
                </div>
              )}

              {/* Google */}
              <motion.button
                onClick={handleGoogleSignIn}
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-pmfit-border rounded-xl text-[15px] font-medium text-pmfit-text hover:bg-pmfit-bg transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
                Continue with Google
              </motion.button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-pmfit-border" />
                <span className="text-[12px] text-pmfit-text-muted">or sign in with email</span>
                <div className="flex-1 h-px bg-pmfit-border" />
              </div>

              <form onSubmit={handleSendCode} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="input"
                />
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[13px] text-pmfit-red text-center"
                  >
                    {error}
                  </motion.p>
                )}
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : "Send Sign-in Code"}
                </button>
              </form>
            </motion.div>

          ) : (
            <motion.div
              key="gate-stage"
              variants={cardVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="card p-8"
            >
              <button
                onClick={() => { setStage("email"); setError(null); setOtpCode(""); setSecretCode(""); setOtpError(false); setSuccess(false); }}
                className="mb-5 text-[13px] text-pmfit-blue hover:underline flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Back
              </button>

              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <CheckCircle2 size={48} className="text-pmfit-teal mx-auto mb-3" />
                  <p className="text-[17px] font-semibold text-pmfit-text">Verified! Signing you in…</p>
                </motion.div>
              ) : (
                <>
                  <h1 className="text-[20px] font-bold text-pmfit-text mb-1">Verify your access</h1>
                  <p className="text-[13px] text-pmfit-text-secondary mb-7">
                    Enter the 8-character code sent to{" "}
                    <span className="font-semibold text-pmfit-text">{email}</span> and your access code.
                  </p>

                  <form onSubmit={handleVerifyGate} className="flex flex-col gap-4">
                    <div>
                      <p className="text-[12px] font-semibold text-pmfit-text-secondary mb-2 uppercase tracking-wide">
                        Sign-in code
                      </p>
                      <OTPInput
                        length={8}
                        value={otpCode}
                        onChange={(v) => { setOtpCode(v); setOtpError(false); setError(null); }}
                        error={otpError}
                        success={success}
                        disabled={loading}
                      />
                    </div>

                    <div className="relative">
                      <input
                        type={showSecret ? "text" : "password"}
                        placeholder="Access code"
                        value={secretCode}
                        onChange={(e) => setSecretCode(e.target.value)}
                        required
                        autoComplete="off"
                        className="input pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-pmfit-text-muted hover:text-pmfit-text"
                      >
                        {showSecret ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[13px] text-pmfit-red text-center"
                      >
                        {error}
                      </motion.p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || otpCode.length < 8 || !secretCode}
                      className="btn-primary w-full"
                    >
                      {loading ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : "Verify & Sign In"}
                    </button>
                  </form>

                  <div className="mt-4 text-center">
                    <button
                      onClick={handleResend}
                      disabled={loading}
                      className="text-[13px] text-pmfit-blue hover:underline disabled:opacity-50"
                    >
                      Didn&apos;t receive a code? Resend
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center mt-5">
          <Link href="/" className="text-[13px] text-pmfit-text-secondary hover:text-pmfit-text transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
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
