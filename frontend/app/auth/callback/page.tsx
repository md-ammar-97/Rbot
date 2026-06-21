"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code  = params.get("code");
      const error = params.get("error");

      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error)}`);
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (!exchangeError) {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("onboarding_complete")
              .eq("id", user.id)
              .single();

            router.replace(profile?.onboarding_complete ? "/dashboard" : "/onboarding");
            return;
          }
        }
      }

      router.replace("/login?error=auth_failed");
    };

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen bg-apple-surface flex items-center justify-center">
      <p className="text-[15px] text-apple-text-secondary">Completing sign-in...</p>
    </div>
  );
}
