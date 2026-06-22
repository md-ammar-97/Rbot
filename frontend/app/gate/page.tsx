"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";

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
    <main className="min-h-screen bg-pmfit-bg flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[400px]"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo variant="top" />
          </div>
          <p className="text-[14px] text-pmfit-text-secondary">
            AI Job Co-Pilot for Product Managers
          </p>
        </div>

        <div className="card p-8">
          <h1 className="text-[22px] font-semibold text-pmfit-text text-center mb-2">
            Enter access code
          </h1>
          <p className="text-[13px] text-pmfit-text-secondary text-center mb-6">
            PMFit is in private beta. Enter your access code to continue.
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
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[13px] text-pmfit-red text-center"
              >
                {error}
              </motion.p>
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
      </motion.div>
    </main>
  );
}
