"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

export function RollbackButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [loading,     setLoading]     = useState(false);
  const [rolledBack,  setRolledBack]  = useState(false);
  const [error,       setError]       = useState("");

  const handleRollback = async () => {
    if (!confirm("Are you sure you want to roll back this application? This action cannot be undone.")) return;
    setLoading(true);
    setError("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const token = (await createClient().auth.getSession()).data.session?.access_token ?? "";
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/apply/sessions/${sessionId}/rollback`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        setRolledBack(true);
        router.refresh();
      } else {
        const data = await resp.json();
        setError(data.detail ?? "Rollback failed. The window may have closed.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (rolledBack) {
    return (
      <p className="text-[12px] text-pmfit-teal font-semibold">Application rolled back.</p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRollback}
        disabled={loading}
        className="btn-ghost text-[12px] h-8 px-3 flex items-center gap-1.5 text-pmfit-orange border border-pmfit-orange/30 hover:bg-pmfit-orange/5 disabled:opacity-50"
      >
        <RotateCcw size={13} className={loading ? "animate-spin" : ""} />
        {loading ? "Rolling back…" : "Rollback (within 60s)"}
      </button>
      {error && <p className="text-[12px] text-pmfit-red">{error}</p>}
    </div>
  );
}
