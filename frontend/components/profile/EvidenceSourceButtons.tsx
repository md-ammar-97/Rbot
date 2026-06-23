"use client";

import { useState, useRef } from "react";
import { X, Upload, Linkedin, Github } from "lucide-react";

type ModalType = "resume" | "linkedin" | "github" | null;

async function getToken() {
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token ?? "";
}

// ─── Shared modal shell ──────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-pmfit-border">
          <h2 className="text-[18px] font-semibold text-pmfit-text">{title}</h2>
          <button onClick={onClose} className="text-pmfit-text-muted hover:text-pmfit-text transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Shared file drop zone ───────────────────────────────────────────────────
function FileDropZone({
  accept, label, endpoint, onDone,
}: { accept: string; label: string; endpoint: string; onDone: () => void }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setStatus("uploading");
    setMessage("");
    try {
      const token = await getToken();
      const form  = new FormData();
      form.append("file", file);
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!resp.ok) throw new Error((await resp.json()).detail || "Upload failed.");
      setStatus("done");
      setMessage("Uploaded successfully — parsing in progress.");
      setTimeout(onDone, 1800);
    } catch (e: unknown) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Upload failed. Please try again.");
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
          status === "done" ? "border-pmfit-teal bg-pmfit-teal-subtle" :
          status === "error" ? "border-pmfit-red/40 bg-red-50" :
          "border-pmfit-border hover:border-pmfit-blue"
        }`}
      >
        {status === "idle" && <p className="text-[14px] text-pmfit-text-secondary">{label}</p>}
        {status === "uploading" && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-pmfit-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-pmfit-blue animate-pulse">Uploading…</p>
          </div>
        )}
        {status === "done"  && <p className="text-[14px] text-pmfit-teal font-medium">✓ {message}</p>}
        {status === "error" && <p className="text-[14px] text-pmfit-red">{message}</p>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />
    </>
  );
}

// ─── GitHub repo modal ───────────────────────────────────────────────────────
function GitHubModal({ onClose }: { onClose: () => void }) {
  const [url,        setUrl]        = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error,      setError]      = useState("");
  const [done,       setDone]       = useState(false);

  function parseUrl(raw: string) {
    const cleaned = raw.trim().replace(/^https?:\/\//, "").replace(/^github\.com\//, "").replace(/\/$/, "");
    const parts   = cleaned.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  }

  const parsed = parseUrl(url);

  const connect = async () => {
    if (!parsed) { setError("Invalid URL — paste a full GitHub repo URL."); return; }
    setConnecting(true);
    setError("");
    try {
      const token = await getToken();
      const resp  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/intake/github`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ owner: parsed.owner, repo: parsed.repo, is_private: false }),
      });
      if (!resp.ok) throw new Error((await resp.json()).detail || "Failed to connect.");
      setDone(true);
      setTimeout(onClose, 1800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Modal title="Connect GitHub Repo" onClose={onClose}>
      {done ? (
        <p className="text-[14px] text-pmfit-teal font-medium text-center py-6">✓ Repository connected — analysis queued.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-pmfit-blue/5 border border-pmfit-blue/20 px-4 py-3">
            <p className="text-[12px] font-semibold text-pmfit-blue mb-0.5">How to add</p>
            <p className="text-[12px] text-pmfit-text-secondary">Paste the full GitHub URL of any public repository.</p>
            <p className="text-[11px] text-pmfit-text-muted mt-1">Example: <code className="bg-pmfit-border px-1 rounded">https://github.com/md-ammar-97/pmfit</code></p>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              className="input flex-1 text-[14px]"
              placeholder="https://github.com/username/repository"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && connect()}
              disabled={connecting}
            />
            <button
              onClick={connect}
              disabled={connecting || !parsed}
              className="btn-primary text-[13px] h-10 px-4 shrink-0 flex items-center gap-2 disabled:opacity-50"
            >
              {connecting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Connect
            </button>
          </div>
          {error && <p className="text-[13px] text-pmfit-red">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

// ─── Root component ──────────────────────────────────────────────────────────
export function EvidenceSourceButtons() {
  const [active, setActive] = useState<ModalType>(null);

  return (
    <>
      {active === "resume" && (
        <Modal title="Upload Resume" onClose={() => setActive(null)}>
          <p className="text-[13px] text-pmfit-text-secondary mb-4">PDF, DOCX, or TXT · Max 10 MB.</p>
          <FileDropZone accept=".pdf,.docx,.txt" label="Click or drag your resume here" endpoint="/intake/resume" onDone={() => setActive(null)} />
        </Modal>
      )}
      {active === "linkedin" && (
        <Modal title="LinkedIn Export" onClose={() => setActive(null)}>
          <ol className="text-[12px] text-pmfit-text-secondary list-decimal ml-4 mb-4 space-y-1">
            <li>LinkedIn → Me → Settings → Data privacy → Get a copy of your data</li>
            <li>Select &quot;Want something in particular&quot; → Jobs, Profile, Connections</li>
            <li>Upload the downloaded ZIP file below</li>
          </ol>
          <FileDropZone accept=".zip" label="Click to upload LinkedIn export (.zip)" endpoint="/intake/linkedin" onDone={() => setActive(null)} />
        </Modal>
      )}
      {active === "github" && (
        <GitHubModal onClose={() => setActive(null)} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          { key: "resume"   as const, icon: Upload,   label: "Upload Resume"       },
          { key: "linkedin" as const, icon: Linkedin,  label: "Add LinkedIn Export" },
          { key: "github"   as const, icon: Github,    label: "Connect GitHub"      },
        ] as { key: ModalType; icon: React.ElementType; label: string }[]).map(({ key, icon: Icon, label }) => (
          <button
            key={key!}
            onClick={() => setActive(key)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-pmfit-border hover:border-pmfit-blue hover:bg-pmfit-blue-subtle/30 transition-all group"
          >
            <Icon size={22} className="text-pmfit-text-muted group-hover:text-pmfit-blue" />
            <span className="text-[13px] font-medium text-pmfit-text-secondary group-hover:text-pmfit-blue text-center">
              {label}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
