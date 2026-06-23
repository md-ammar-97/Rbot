"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Eye, EyeOff, RefreshCw } from "lucide-react";

interface BlacklistEntry {
  id:              string;
  company_name:    string;
  company_website: string;
}

interface Props {
  profile:   Record<string, unknown>;
  blacklist: BlacklistEntry[];
}

async function getToken() {
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token ?? "";
}

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 space-y-5">
      <div className="border-b border-pmfit-border pb-4">
        <h2 className="text-[17px] font-bold text-pmfit-text">{title}</h2>
        <p className="text-[13px] text-pmfit-text-secondary mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

// ─── Tag input ──────────────────────────────────────────────────────────────
function TagInput({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  };

  return (
    <div>
      <label className="block text-[12px] font-semibold text-pmfit-text-secondary mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-pmfit-blue/10 text-pmfit-blue text-[12px] font-medium">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-pmfit-red"><X size={11} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1 text-[14px]"
          placeholder={`Add ${label.toLowerCase()}…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <button onClick={add} className="btn-secondary text-[13px] h-10 px-3"><Plus size={14} /></button>
      </div>
    </div>
  );
}

// ─── Profile section ────────────────────────────────────────────────────────
function ProfileSection({ profile }: { profile: Record<string, unknown> }) {
  const [fullName,  setFullName]  = useState((profile.full_name  as string) ?? "");
  const [avatarUrl, setAvatarUrl] = useState((profile.avatar_url as string) ?? "");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const save = async () => {
    setSaving(true);
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName.trim() || null }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Section title="Profile" description="Your name and display details.">
      <div>
        <label className="block text-[12px] font-semibold text-pmfit-text-secondary mb-1.5 uppercase tracking-wide">Full Name</label>
        <input type="text" className="input w-full text-[14px]" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className="block text-[12px] font-semibold text-pmfit-text-secondary mb-1.5 uppercase tracking-wide">Avatar URL</label>
        <input type="url" className="input w-full text-[14px]" placeholder="https://…" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} disabled />
        <p className="text-[11px] text-pmfit-text-muted mt-1">Avatar is set by your login provider and cannot be changed here.</p>
      </div>
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary text-[13px] h-9 px-5 flex items-center gap-2">
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          {saved ? "Saved!" : "Save Profile"}
        </button>
      </div>
    </Section>
  );
}

// ─── Job Targeting section ───────────────────────────────────────────────────
function JobTargetingSection({ profile }: { profile: Record<string, unknown> }) {
  const [roles,           setRoles]           = useState<string[]>((profile.target_roles         as string[]) ?? []);
  const [locations,       setLocations]       = useState<string[]>((profile.target_locations     as string[]) ?? []);
  const [remote,          setRemote]          = useState<string>((profile.remote_preference      as string) ?? "flexible");
  const [workAuth,        setWorkAuth]        = useState<string>((profile.work_authorization     as string) ?? "");
  const [sponsorship,     setSponsorship]     = useState<boolean>((profile.sponsorship_required  as boolean) ?? false);
  const [compMin,         setCompMin]         = useState<string>(String(profile.compensation_min ?? ""));
  const [compMax,         setCompMax]         = useState<string>(String(profile.compensation_max ?? ""));
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const save = async () => {
    setSaving(true);
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        target_roles:         roles,
        target_locations:     locations,
        remote_preference:    remote,
        work_authorization:   workAuth || null,
        sponsorship_required: sponsorship,
        compensation_min:     compMin ? Number(compMin) : null,
        compensation_max:     compMax ? Number(compMax) : null,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Section title="Job Targeting" description="Define the roles and conditions that PMFit searches for.">
      <TagInput label="Target Roles" values={roles} onChange={setRoles} />
      <TagInput label="Target Locations" values={locations} onChange={setLocations} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-pmfit-text-secondary mb-1.5 uppercase tracking-wide">Remote Preference</label>
          <select className="input w-full text-[14px]" value={remote} onChange={(e) => setRemote(e.target.value)}>
            <option value="remote_only">Remote Only</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-pmfit-text-secondary mb-1.5 uppercase tracking-wide">Work Authorization</label>
          <input type="text" className="input w-full text-[14px]" placeholder="e.g. US Citizen, H1-B" value={workAuth} onChange={(e) => setWorkAuth(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-semibold text-pmfit-text-secondary mb-1.5 uppercase tracking-wide">Min Salary (USD)</label>
          <input type="number" className="input w-full text-[14px]" placeholder="e.g. 120000" value={compMin} onChange={(e) => setCompMin(e.target.value)} />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-pmfit-text-secondary mb-1.5 uppercase tracking-wide">Max Salary (USD)</label>
          <input type="number" className="input w-full text-[14px]" placeholder="e.g. 180000" value={compMax} onChange={(e) => setCompMax(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="sponsorship" checked={sponsorship} onChange={(e) => setSponsorship(e.target.checked)} className="w-4 h-4 accent-pmfit-blue" />
        <label htmlFor="sponsorship" className="text-[14px] text-pmfit-text">Visa sponsorship required</label>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary text-[13px] h-9 px-5 flex items-center gap-2">
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          {saved ? "Saved!" : "Save Targeting"}
        </button>
      </div>
    </Section>
  );
}

// ─── Blacklisted Companies section ─────────────────────────────────────────
function BlacklistSection({ initial }: { initial: BlacklistEntry[] }) {
  const [entries, setEntries] = useState<BlacklistEntry[]>(initial);
  const [name,    setName]    = useState("");
  const [website, setWebsite] = useState("");
  const [adding,  setAdding]  = useState(false);
  const [error,   setError]   = useState("");

  const add = async () => {
    if (!name.trim()) return;
    setAdding(true);
    setError("");
    try {
      const token = await getToken();
      const resp  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/blacklist`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: name.trim(), company_website: website.trim() }),
      });
      if (!resp.ok) throw new Error((await resp.json()).detail || "Failed to add.");
      const { data } = await resp.json();
      setEntries((prev) => [data, ...prev]);
      setName(""); setWebsite("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/blacklist/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <Section title="Blacklisted Companies" description="PMFit will never show you jobs from these companies.">
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <input type="text" className="input flex-1 text-[14px]" placeholder="Company name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input type="text" className="input flex-1 text-[14px]" placeholder="Website (optional)" value={website} onChange={(e) => setWebsite(e.target.value)} />
        <button onClick={add} disabled={adding || !name.trim()} className="btn-primary text-[13px] h-10 px-4 shrink-0 flex items-center gap-1.5 disabled:opacity-50">
          <Plus size={14} /> Add
        </button>
      </div>
      {error && <p className="text-[13px] text-pmfit-red">{error}</p>}

      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-pmfit-bg border border-pmfit-border">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-pmfit-text truncate">{e.company_name}</p>
                {e.company_website && <p className="text-[11px] text-pmfit-text-muted truncate">{e.company_website}</p>}
              </div>
              <button onClick={() => remove(e.id)} className="text-pmfit-text-muted hover:text-pmfit-red transition-colors shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-pmfit-text-muted text-center py-4">No blacklisted companies yet.</p>
      )}
    </Section>
  );
}

// ─── Integrations section ────────────────────────────────────────────────────
function IntegrationsSection({ profile }: { profile: Record<string, unknown> }) {
  const [apifyKey,   setApifyKey]   = useState((profile.apify_api_key as string) ?? "");
  const [showKey,    setShowKey]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [fetching,   setFetching]   = useState(false);
  const [fetchMsg,   setFetchMsg]   = useState("");

  const save = async () => {
    setSaving(true);
    const token = await getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ apify_api_key: apifyKey.trim() || null }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const fetchJobs = async () => {
    setFetching(true);
    setFetchMsg("");
    try {
      const token = await getToken();
      const resp  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/intake/discover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        setFetchMsg("Discovery queued! Jobs will appear in 2–5 minutes.");
      } else {
        setFetchMsg("Failed to start discovery. Please try again.");
      }
    } catch {
      setFetchMsg("Network error. Please try again.");
    } finally {
      setFetching(false);
      setTimeout(() => setFetchMsg(""), 6000);
    }
  };

  return (
    <Section title="Integrations" description="Connect external data sources to enhance job discovery.">
      <div>
        <label className="block text-[12px] font-semibold text-pmfit-text-secondary mb-1.5 uppercase tracking-wide">Apify API Key</label>
        <p className="text-[12px] text-pmfit-text-muted mb-2">
          Enables scraped job discovery from LinkedIn, Indeed, Glassdoor, and Wellfound. Get your key at apify.com.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              className="input w-full text-[14px] pr-10"
              placeholder="apify_api_…"
              value={apifyKey}
              onChange={(e) => setApifyKey(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-pmfit-text-muted hover:text-pmfit-text"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button onClick={save} disabled={saving} className="btn-primary text-[13px] h-10 px-4 flex items-center gap-2 shrink-0">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      <div className="border-t border-pmfit-border pt-5">
        <label className="block text-[12px] font-semibold text-pmfit-text-secondary mb-1.5 uppercase tracking-wide">Job Discovery</label>
        <p className="text-[12px] text-pmfit-text-muted mb-3">
          PMFit automatically discovers new PM jobs every 4 hours. Click below to run it now — results appear on the Jobs page within a few minutes.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobs}
            disabled={fetching}
            className="btn-secondary text-[13px] h-10 px-4 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={fetching ? "animate-spin" : ""} />
            {fetching ? "Starting…" : "Fetch Jobs Now"}
          </button>
          {fetchMsg && (
            <p className={`text-[13px] ${fetchMsg.startsWith("Discovery") ? "text-pmfit-teal" : "text-pmfit-red"}`}>
              {fetchMsg}
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

// ─── Resume Recovery section ─────────────────────────────────────────────────
interface RecoveryQuestion {
  id:           string;
  dimension:    string;
  question:     string;
  answer_type:  string;
  required:     boolean;
  answered:     boolean;
  saved_answer: string;
}

function RecoverySection() {
  const [loading,    setLoading]    = useState(true);
  const [status,     setStatus]     = useState("");
  const [questions,  setQuestions]  = useState<RecoveryQuestion[]>([]);
  const [caseId,     setCaseId]     = useState<string | null>(null);
  const [answers,    setAnswers]    = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [msg,        setMsg]        = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const [sResp, qResp] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/recovery/status`,    { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/recovery/questions`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const sData = await sResp.json();
    const qData = await qResp.json();
    setStatus(sData.data.recovery_status);
    const qs: RecoveryQuestion[] = qData.data.questions || [];
    setQuestions(qs);
    setCaseId(qData.data.case_id);
    // Pre-fill any previously saved answers
    const pre: Record<string, string> = {};
    for (const q of qs) {
      if (q.saved_answer) pre[q.id] = q.saved_answer;
    }
    setAnswers(pre);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const unanswered  = questions.filter((q) => !q.answered);
  const filledPairs = unanswered.filter((q) => answers[q.id]?.trim());

  const handleSubmit = async () => {
    if (!caseId || filledPairs.length === 0) return;
    setSubmitting(true);
    setMsg("");
    try {
      const token = await getToken();
      let lastResp: { data?: { status?: string } } | null = null;
      for (const q of filledPairs) {
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/recovery/answer`, {
          method:  "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body:    JSON.stringify({ question_id: q.id, question_text: q.question, answer: answers[q.id], case_id: caseId }),
        });
        lastResp = await resp.json();
      }
      if (lastResp?.data?.status === "recovery_complete") {
        setStatus("complete");
        setMsg("Recovery complete! Your baseline resume is being generated.");
      } else {
        setMsg(`${filledPairs.length} answer${filledPairs.length !== 1 ? "s" : ""} saved.`);
        await load();
      }
    } catch {
      setMsg("Error saving answers. Please try again.");
    } finally {
      setSubmitting(false);
      setTimeout(() => setMsg(""), 5000);
    }
  };

  if (loading) {
    return (
      <Section title="Resume Quality Recovery" description="Answer a few questions so PMFit can build your baseline resume and score jobs for you.">
        <div className="flex items-center gap-2 text-pmfit-text-secondary text-[13px]">
          <span className="w-4 h-4 border-2 border-pmfit-blue border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      </Section>
    );
  }

  if (status === "complete") {
    return (
      <Section title="Resume Quality Recovery" description="Answer a few questions so PMFit can build your baseline resume and score jobs for you.">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-pmfit-teal-subtle border border-pmfit-teal/20">
          <span className="text-pmfit-teal text-2xl font-bold">✓</span>
          <div>
            <p className="text-[14px] font-semibold text-pmfit-text">Recovery Complete</p>
            <p className="text-[12px] text-pmfit-text-secondary mt-0.5">Your baseline resume is ready and jobs are actively being scored for you.</p>
          </div>
        </div>
      </Section>
    );
  }

  // All answered but still building (status update in flight)
  if (unanswered.length === 0 && status === "in_progress") {
    return (
      <Section title="Resume Quality Recovery" description="Answer a few questions so PMFit can build your baseline resume and score jobs for you.">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-pmfit-blue/5 border border-pmfit-blue/20">
          <span className="w-5 h-5 border-2 border-pmfit-blue border-t-transparent rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-[14px] font-semibold text-pmfit-text">Building your baseline resume…</p>
            <p className="text-[12px] text-pmfit-text-secondary mt-0.5">All questions answered. Refresh in a moment to confirm completion.</p>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section
      title="Resume Quality Recovery"
      description={`${unanswered.length} question${unanswered.length !== 1 ? "s" : ""} remaining — answer them to unlock job scoring and baseline resume generation.`}
    >
      <div className="space-y-5">
        {unanswered.map((q) => (
          <div key={q.id} className="border border-pmfit-border rounded-xl p-4">
            <p className="text-[11px] font-semibold text-pmfit-blue tracking-wide uppercase mb-1.5">
              {q.dimension.replace(/_/g, " ")}
            </p>
            <p className="text-[14px] text-pmfit-text font-medium mb-3">{q.question}</p>
            <textarea
              className="w-full border border-pmfit-border rounded-xl p-3 text-[14px] text-pmfit-text
                         placeholder:text-pmfit-text-muted focus:outline-none focus:border-pmfit-blue
                         resize-none transition-colors min-h-[80px]"
              placeholder="Your answer…"
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              disabled={submitting}
            />
          </div>
        ))}
      </div>

      {msg && (
        <p className={`text-[13px] mt-3 ${msg.includes("Error") ? "text-pmfit-red" : "text-pmfit-teal"}`}>{msg}</p>
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSubmit}
          disabled={filledPairs.length === 0 || submitting}
          className="btn-primary text-[13px] h-10 px-5 flex items-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
          ) : (
            `Submit${filledPairs.length > 0 ? ` ${filledPairs.length} Answer${filledPairs.length !== 1 ? "s" : ""}` : ""}`
          )}
        </button>
      </div>
    </Section>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────
export function SettingsClient({ profile, blacklist }: Props) {
  return (
    <div className="max-w-2xl space-y-6">
      <ProfileSection      profile={profile} />
      <JobTargetingSection profile={profile} />
      <RecoverySection />
      <BlacklistSection    initial={blacklist} />
      <IntegrationsSection profile={profile} />
    </div>
  );
}
