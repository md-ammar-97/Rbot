"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SECRET_CODE = "AMMAR8800206651";

export default function GatePage() {
  const router   = useRouter();
  const supabase = createClient();

  const [code,    setCode]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code !== SECRET_CODE) {
      setError("Invalid access code.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", user.id)
        .single();

      router.replace(profile?.onboarding_complete ? "/dashboard" : "/onboarding");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-apple-surface flex items-center justify-center px-6">
      <div className="w-full max-w-[400px]">

        <div className="text-center mb-8">
          <p className="text-[22px] font-bold text-apple-text">RBot</p>
          <p className="mt-2 text-[15px] text-apple-text-secondary">
            AI Job Co-Pilot for Product Managers
          </p>
        </div>

        <div className="card p-8">
          <h1 className="text-[22px] font-semibold text-apple-text text-center mb-2">
            Enter access code
          </h1>
          <p className="text-[13px] text-apple-text-secondary text-center mb-6">
            RBot is in private beta. Enter your access code to continue.
          </p>

          <form onSubmit={handleVerify} className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="Access code"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              autoFocus
              autoComplete="off"
              className="input"
            />

            {error && (
              <p className="text-[13px] text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !code}
              className="btn-primary w-full flex items-center justify-center"
            >
              {loading ? "Verifying…" : "Continue"}
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}
