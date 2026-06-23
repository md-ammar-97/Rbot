"use client";

import { useState } from "react";

interface Props {
  userId: string;
  onNext: () => void;
  onComplete: () => void;
}

interface ConnectedRepo {
  slug: string;
}

function parseGitHubUrl(raw: string): { owner: string; repo: string } | null {
  const cleaned = raw
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\/$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

export default function GitHubStep({ userId, onNext, onComplete }: Props) {
  const [url,           setUrl]           = useState("");
  const [connecting,    setConnecting]    = useState(false);
  const [error,         setError]         = useState("");
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[]>([]);

  const parsed = parseGitHubUrl(url);

  const handleConnect = async () => {
    if (!parsed) {
      setError("Invalid URL — paste a full GitHub repo URL.");
      return;
    }
    setConnecting(true);
    setError("");

    try {
      const token = await _getToken();
      const resp  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/intake/github`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ owner: parsed.owner, repo: parsed.repo, is_private: false }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Failed to connect repository.");
      }

      const slug = `${parsed.owner}/${parsed.repo}`;
      setConnectedRepos((prev) => [...prev, { slug }]);
      setUrl("");
      onComplete();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-pmfit-text mb-2">GitHub Projects</h2>
      <p className="text-[15px] text-pmfit-text-secondary mb-1">
        Connect repos to evidence your technical depth and PM-engineering collaboration.
      </p>

      {/* Format instructions */}
      <div className="mb-5 rounded-xl bg-pmfit-blue/5 border border-pmfit-blue/20 px-4 py-3">
        <p className="text-[12px] font-semibold text-pmfit-blue mb-1">How to add a repo</p>
        <p className="text-[12px] text-pmfit-text-secondary">
          Paste the full GitHub URL for any public repository.
        </p>
        <p className="text-[12px] text-pmfit-text-muted mt-1">
          Example:{" "}
          <code className="bg-pmfit-border px-1 rounded text-[11px]">
            https://github.com/md-ammar-97/pmfit
          </code>
        </p>
      </div>

      {/* URL input row */}
      <div className="flex gap-2 mb-2">
        <input
          type="url"
          placeholder="https://github.com/username/repository"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          className="input flex-1 text-[14px]"
          disabled={connecting}
        />
        <button
          onClick={handleConnect}
          disabled={connecting || !parsed}
          className="btn-primary text-[13px] h-10 px-4 shrink-0 flex items-center gap-2 disabled:opacity-50"
        >
          {connecting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Connecting…
            </>
          ) : (
            "Connect"
          )}
        </button>
      </div>

      {/* Per-connection error */}
      {error && (
        <p className="text-[13px] text-pmfit-red mt-1 mb-3">{error}</p>
      )}

      {/* Connected repos list */}
      {connectedRepos.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[12px] font-semibold text-pmfit-text-secondary uppercase tracking-wide">
            Connected repositories
          </p>
          {connectedRepos.map((r) => (
            <div
              key={r.slug}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pmfit-teal-subtle border border-pmfit-teal/30"
            >
              <span className="text-pmfit-teal text-sm">✓</span>
              <span className="text-[13px] font-medium text-pmfit-text">{r.slug}</span>
            </div>
          ))}
          <p className="text-[12px] text-pmfit-text-secondary mt-1">
            You can connect more repos, or continue to the next step.
          </p>
        </div>
      )}

      <button
        onClick={onNext}
        className="mt-6 w-full btn-secondary text-[15px]"
        disabled={connecting}
      >
        {connectedRepos.length > 0 ? "Continue →" : "Skip for now →"}
      </button>
    </div>
  );
}

async function _getToken() {
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token ?? "";
}
