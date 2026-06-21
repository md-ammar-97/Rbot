"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallback() {
  const router = useRouter();
  const [debugInfo, setDebugInfo] = useState<string>("Starting…");

  useEffect(() => {
    const supabase = createClient();

    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code   = params.get("code");
      const error  = params.get("error");

      setDebugInfo(`URL params — code: ${code ? code.slice(0, 12) + "…" : "MISSING"} | error: ${error ?? "none"}`);

      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error)}`);
        return;
      }

      if (!code) {
        setDebugInfo("No code in URL — redirecting to login");
        router.replace("/login?error=no_code");
        return;
      }

      setDebugInfo(`Exchanging code (first 12 chars: ${code.slice(0, 12)}…)`);

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        // Show the actual error — DO NOT redirect automatically so user can screenshot this
        setDebugInfo(
          `exchangeCodeForSession FAILED\n` +
          `message: ${exchangeError.message}\n` +
          `status: ${(exchangeError as any).status ?? "n/a"}\n` +
          `name: ${exchangeError.name}`
        );
        return; // Stay on this page so error is visible
      }

      if (!data.session?.user) {
        setDebugInfo("Exchange succeeded but session/user is null — check Supabase dashboard");
        return;
      }

      setDebugInfo(`Signed in as ${data.session.user.email} — fetching profile…`);

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", data.session.user.id)
        .single();

      setDebugInfo(`Profile onboarding_complete: ${profile?.onboarding_complete} — redirecting…`);

      router.replace(profile?.onboarding_complete ? "/dashboard" : "/onboarding");
    };

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen bg-apple-surface flex flex-col items-center justify-center gap-4 p-8">
      <p className="text-[15px] text-apple-text-secondary">Completing sign-in…</p>
      <pre className="text-[12px] text-apple-text bg-white/60 border border-apple-border rounded-xl p-4 max-w-xl w-full whitespace-pre-wrap break-all">
        {debugInfo}
      </pre>
    </div>
  );
}
