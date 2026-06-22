"use client";

import { useState } from "react";

interface Props {
  userId:     string;
  onNext:     () => void;
  onComplete: () => void;
}

export default function GitHubStep({ userId, onNext, onComplete }: Props) {
  const [owner,   setOwner]   = useState("");
  const [repo,    setRepo]    = useState("");
  const [status,  setStatus]  = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleConnect = async () => {
    if (!owner.trim() || !repo.trim()) {
      setStatus("error");
      setMessage("Please enter both owner and repository name.");
      return;
    }
    setStatus("saving");
    try {
      const token = await _getToken();
      const resp  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/intake/github`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ owner: owner.trim(), repo: repo.trim(), is_private: false }),
      });
      if (!resp.ok) throw new Error((await resp.json()).detail || "Failed");
      setStatus("done");
      setMessage(`${owner}/${repo} connected. Extracting evidence…`);
      setTimeout(onComplete, 1500);
    } catch (e: unknown) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Failed to connect repository.");
    }
  };

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-pmfit-text mb-2">Connect a GitHub repo</h2>
      <p className="text-[15px] text-pmfit-text-secondary mb-6">
        PMFit reads your README and docs to surface concrete PM evidence:
        technical depth, ownership signals, and outcome metrics.
      </p>

      <div className="flex gap-3 mb-4">
        <input
          className="input flex-1"
          placeholder="owner (e.g. md-ammar-97)"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />
        <span className="self-center text-pmfit-text-muted text-[17px]">/</span>
        <input
          className="input flex-1"
          placeholder="repo-name"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
        />
      </div>

      {status === "error" && (
        <p className="text-[14px] text-pmfit-red mb-4">{message}</p>
      )}
      {status === "done" && (
        <p className="text-[14px] text-pmfit-teal mb-4 font-medium">✓ {message}</p>
      )}

      <button
        onClick={handleConnect}
        disabled={status === "saving" || status === "done"}
        className="w-full btn-primary mb-4"
      >
        {status === "saving" ? "Connecting…" : "Connect Repository"}
      </button>

      <button onClick={onNext} className="w-full btn-secondary text-[15px]">
        Skip for now →
      </button>
    </div>
  );
}

async function _getToken() {
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token ?? "";
}
