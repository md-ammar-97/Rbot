"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const supabase     = createClient();
  const searchParams = useSearchParams();
  const error        = searchParams.get("error");

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes:     "openid email profile",
      },
    });
  };

  return (
    <main className="min-h-screen bg-apple-surface flex items-center justify-center px-6">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-[22px] font-bold text-apple-text">
            RBot
          </Link>
          <p className="mt-2 text-[15px] text-apple-text-secondary">
            AI Job Co-Pilot for Product Managers
          </p>
        </div>

        {/* Card */}
        <div className="card p-10">
          <h1 className="text-[22px] font-semibold text-apple-text text-center mb-2">
            Sign in to RBot
          </h1>
          <p className="text-[14px] text-apple-text-secondary text-center mb-8">
            Your data is completely isolated — only you can see your profile,
            applications, and documents.
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-apple-destructive-subtle border border-apple-destructive/20">
              <p className="text-[14px] text-apple-destructive text-center">
                {error === "auth_failed"
                  ? "Sign-in failed. Please try again."
                  : error}
              </p>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            className="w-full h-[52px] flex items-center justify-center gap-3
                       bg-white border border-apple-border rounded-xl
                       text-[17px] font-medium text-apple-text
                       hover:bg-apple-surface active:scale-[0.98]
                       transition-all duration-150"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="mt-6 text-[12px] text-apple-text-tertiary text-center leading-relaxed">
            By signing in, you agree to RBot&apos;s terms.
            <br />
            We request only your name, email, and profile picture from Google.
          </p>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-[14px] text-apple-text-secondary hover:underline">
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
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
