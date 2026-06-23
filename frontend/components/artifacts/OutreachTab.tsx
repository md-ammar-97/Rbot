"use client";

import { useState } from "react";
import { Copy, CheckCircle2, Trash2, Send, ChevronDown, ChevronUp, Plus } from "lucide-react";

interface OutreachDraft {
  id:                string;
  job_id:            string | null;
  recipient_name:    string | null;
  recipient_company: string | null;
  recipient_role:    string | null;
  body:              string | null;
  character_count:   number | null;
  created_at:        string;
  user_sent:         boolean;
  sent_at:           string | null;
  jobs:              { title: string } | null;
}

interface ScoredJob {
  id:    string;
  title: string;
  company: string;
}

interface Props {
  initialDrafts: OutreachDraft[];
  recentJobs:    ScoredJob[];
}

async function getToken() {
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token ?? "";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 14) return `${diff}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DraftCard({ draft, onSend, onDiscard }: {
  draft:     OutreachDraft;
  onSend:    (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  const [expanded,  setExpanded]  = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [actioning, setActioning] = useState(false);

  const copy = async () => {
    if (!draft.body) return;
    await navigator.clipboard.writeText(draft.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    setActioning(true);
    try { await onSend(draft.id); } finally { setActioning(false); }
  };

  const handleDiscard = async () => {
    setActioning(true);
    try { await onDiscard(draft.id); } finally { setActioning(false); }
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-pmfit-text">
              {draft.recipient_name ?? "Unknown recipient"}
            </p>
            {draft.user_sent ? (
              <span className="badge-teal text-[10px]">Sent</span>
            ) : (
              <span className="badge-gray text-[10px]">Draft</span>
            )}
          </div>
          <p className="text-[12px] text-pmfit-text-secondary mt-0.5">
            {[draft.recipient_role, draft.recipient_company].filter(Boolean).join(" at ")}
          </p>
          {draft.jobs?.title && (
            <p className="text-[11px] text-pmfit-text-muted mt-0.5">Re: {draft.jobs.title}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[11px] text-pmfit-text-muted">{formatDate(draft.created_at)}</span>
            {draft.character_count && (
              <span className="text-[10px] font-mono text-pmfit-text-muted bg-pmfit-border/60 px-1.5 py-0.5 rounded">
                {draft.character_count} chars
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="btn-ghost h-8 w-8 p-0 flex items-center justify-center shrink-0"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && draft.body && (
        <div className="mt-3 pt-3 border-t border-pmfit-border">
          <pre className="text-[13px] text-pmfit-text whitespace-pre-wrap font-sans leading-relaxed">
            {draft.body}
          </pre>
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-pmfit-border">
        <button
          onClick={copy}
          className="btn-ghost text-[12px] h-8 px-3 flex items-center gap-1.5"
        >
          {copied ? <CheckCircle2 size={13} className="text-pmfit-teal" /> : <Copy size={13} />}
          {copied ? "Copied!" : "Copy"}
        </button>
        {!draft.user_sent && (
          <button
            onClick={handleSend}
            disabled={actioning}
            className="btn-ghost text-[12px] h-8 px-3 flex items-center gap-1.5 text-pmfit-teal"
          >
            <Send size={13} /> Mark Sent
          </button>
        )}
        <button
          onClick={handleDiscard}
          disabled={actioning}
          className="btn-ghost text-[12px] h-8 px-3 flex items-center gap-1.5 text-pmfit-red ml-auto"
        >
          <Trash2 size={13} /> Discard
        </button>
      </div>
    </div>
  );
}

function GenerateForm({ recentJobs, onQueued }: { recentJobs: ScoredJob[]; onQueued: () => void }) {
  const [jobId,     setJobId]     = useState(recentJobs[0]?.id ?? "");
  const [name,      setName]      = useState("");
  const [role,      setRole]      = useState("");
  const [company,   setCompany]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState("");

  const submit = async () => {
    if (!jobId || !name.trim()) return;
    setLoading(true);
    setMsg("");
    try {
      const token = await getToken();
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/outreach/generate`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ job_id: jobId, recipient_name: name.trim(), recipient_role: role.trim(), recipient_company: company.trim() }),
      });
      if (resp.ok) {
        setMsg("Queued! Your draft will appear here in about 30 seconds.");
        setName(""); setRole(""); setCompany("");
        onQueued();
      } else {
        const err = await resp.json();
        setMsg(err.data?.error === "policy_blocked" ? "Blocked by policy rules." : "Failed to queue. Try again.");
      }
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(""), 8000);
    }
  };

  return (
    <div className="card p-5 border border-pmfit-blue/20 bg-pmfit-blue-subtle/20">
      <h3 className="text-[14px] font-bold text-pmfit-text mb-4 flex items-center gap-2">
        <Plus size={15} /> Generate New Outreach
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-pmfit-text-secondary mb-1 uppercase tracking-wide">Job</label>
          <select
            className="input w-full text-[13px]"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
          >
            {recentJobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title} · {j.company}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-pmfit-text-secondary mb-1 uppercase tracking-wide">Recipient Name</label>
            <input className="input w-full text-[13px]" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-pmfit-text-secondary mb-1 uppercase tracking-wide">Their Role</label>
            <input className="input w-full text-[13px]" placeholder="VP of Product" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-pmfit-text-secondary mb-1 uppercase tracking-wide">Company</label>
            <input className="input w-full text-[13px]" placeholder="Acme Inc." value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
        </div>
        {msg && (
          <p className={`text-[12px] ${msg.startsWith("Queued") ? "text-pmfit-teal" : "text-pmfit-red"}`}>{msg}</p>
        )}
        <button
          onClick={submit}
          disabled={loading || !jobId || !name.trim()}
          className="btn-primary text-[13px] h-9 px-5 flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          {loading ? "Queueing…" : "Generate Outreach"}
        </button>
      </div>
    </div>
  );
}

export function OutreachTab({ initialDrafts, recentJobs }: Props) {
  const [drafts,      setDrafts]      = useState<OutreachDraft[]>(initialDrafts);
  const [showForm,    setShowForm]    = useState(false);

  const send = async (id: string) => {
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/outreach/${id}/send`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setDrafts((prev) => prev.map((d) => d.id === id ? { ...d, user_sent: true } : d));
  };

  const discard = async (id: string) => {
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/outreach/${id}/discard`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-pmfit-text-secondary">
          {drafts.length === 0 ? "No outreach drafts yet." : `${drafts.length} draft${drafts.length !== 1 ? "s" : ""}`}
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-secondary text-[13px] h-8 px-3 flex items-center gap-1.5"
        >
          <Plus size={13} /> New Outreach
        </button>
      </div>

      {showForm && (
        <GenerateForm
          recentJobs={recentJobs}
          onQueued={() => setShowForm(false)}
        />
      )}

      {drafts.length === 0 && !showForm ? (
        <div className="card p-12 text-center">
          <p className="text-[15px] font-semibold text-pmfit-text mb-2">No outreach drafts</p>
          <p className="text-[13px] text-pmfit-text-secondary">
            Generate personalised LinkedIn messages for your target jobs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => (
            <DraftCard key={d.id} draft={d} onSend={send} onDiscard={discard} />
          ))}
        </div>
      )}
    </div>
  );
}
