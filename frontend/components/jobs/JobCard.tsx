"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FitGauge } from "./FitGauge";
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  ExternalLink,
  Download,
  Lock,
} from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ScoreBreakdown {
  skill_alignment?:      { score: number; matched?: string[]; missing?: string[] };
  seniority_match?:      { score: number };
  domain_relevance?:     { score: number };
  project_evidence?:     { score: number };
  profile_completeness?: { score: number };
}

interface Artifact {
  id:           string;
  type:         string;
  storage_path: string;
}

interface JobCardProps {
  fitScore:            number;
  evidenceConfidence:  string;
  automationEligibility: string;
  fitExplanation:      string | null;
  ineligibilityReason: string | null;
  scoreBreakdown?:     { components?: ScoreBreakdown };
  recoveryComplete:    boolean;
  job: {
    id:               string;
    title:            string;
    company:          string;
    location:         string;
    seniority_level:  string;
    remote_eligible:  boolean;
    ats_family:       string;
    posting_date:     string;
    board_categories: string[];
    source_regions:   string[];
    is_startup:       boolean;
    is_remote_first:  boolean;
  };
  onTailor: (jobId: string) => Promise<void>;
}

const AVATAR_COLORS = ["#0052CC","#6B5ACD","#20C997","#FF8C00","#E63946","#1D7EFF"];

function avatarColor(company: string) {
  let h = 0;
  for (const c of company) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

const eligibilityLabel: Record<string, { label: string; class: string }> = {
  eligible:    { label: "Auto-apply eligible",   class: "badge-teal" },
  restricted:  { label: "Review required",        class: "badge-orange" },
  manual_only: { label: "Manual only",            class: "badge-gray" },
};

const confidenceClass: Record<string, string> = {
  high:   "badge-teal",
  medium: "badge-blue",
  low:    "badge-orange",
};

function daysAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : `${diff}d ago`;
}

type TailorState = "idle" | "queuing" | "generating" | "done" | "timeout" | "error";

export function JobCard({ fitScore, evidenceConfidence, automationEligibility, fitExplanation, ineligibilityReason, scoreBreakdown, recoveryComplete, job, onTailor }: JobCardProps) {
  const [expanded,     setExpanded]     = useState(false);
  const [tailorState,  setTailorState]  = useState<TailorState>("idle");
  const [artifacts,    setArtifacts]    = useState<Artifact[]>([]);
  const [downloading,  setDownloading]  = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const color = avatarColor(job.company);

  const pollArtifacts = (token: string) => {
    let elapsed = 0;
    pollRef.current = setInterval(async () => {
      elapsed += 3;
      if (elapsed > 60) {
        clearInterval(pollRef.current!);
        setTailorState("timeout");
        return;
      }
      const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs/${job.id}/artifacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const relevant = (data.data ?? []).filter((a: Artifact) =>
        a.type === "tailored_resume" || a.type === "cover_letter"
      );
      if (relevant.length > 0) {
        clearInterval(pollRef.current!);
        setArtifacts(relevant);
        setTailorState("done");
      }
    }, 3000);
  };

  const handleTailor = async () => {
    if (!recoveryComplete) return;
    setTailorState("queuing");
    try {
      const token = (await import("@/lib/supabase/client"))
        .createClient().auth.getSession().then((r) => r.data.session?.access_token ?? "");
      const t = await token;
      await onTailor(job.id);
      setTailorState("generating");
      pollArtifacts(t);
    } catch {
      setTailorState("error");
    }
  };

  const download = async (artifact: Artifact) => {
    setDownloading(artifact.id);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const t = (await createClient().auth.getSession()).data.session?.access_token ?? "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs/${job.id}/artifacts/${artifact.id}/url`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const { data } = await res.json();
      const a = document.createElement("a");
      a.href = data.url;
      a.download = `${artifact.type}-${job.id}.pdf`;
      a.click();
    } finally {
      setDownloading(null);
    }
  };

  const breakdownData = scoreBreakdown?.components
    ? Object.entries(scoreBreakdown.components).map(([key, v]) => ({
        name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace("Match", "").trim(),
        value: Math.round((v as { score: number }).score * 100),
      }))
    : [];

  const elig = eligibilityLabel[automationEligibility] ?? { label: automationEligibility, class: "badge-gray" };

  return (
    <motion.div
      layout
      className="card overflow-hidden"
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[14px] font-bold shrink-0"
            style={{ backgroundColor: color }}
          >
            {job.company[0].toUpperCase()}
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-semibold text-pmfit-text truncate">{job.title}</p>
            <p className="text-[13px] text-pmfit-text-secondary">{job.company}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {job.location && (
                <span className="flex items-center gap-1 text-[12px] text-pmfit-text-muted">
                  <MapPin size={11} /> {job.location}{job.remote_eligible ? " · Remote OK" : ""}
                </span>
              )}
              <span className="flex items-center gap-1 text-[12px] text-pmfit-text-muted">
                <Clock size={11} /> {daysAgo(job.posting_date)}
              </span>
              <span className="text-[11px] text-pmfit-text-muted uppercase">{job.ats_family}</span>
            </div>
          </div>

          {/* Fit gauge */}
          <FitGauge score={fitScore} size={68} />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className={elig.class}>
            <Zap size={9} className="mr-0.5" /> {elig.label}
          </span>
          <span className={confidenceClass[evidenceConfidence] ?? "badge-gray"}>
            {evidenceConfidence} confidence
          </span>
          {job.seniority_level && (
            <span className="badge-blue">{job.seniority_level.replace(/_/g, " ").toUpperCase()}</span>
          )}
          {job.is_startup && <span className="badge-blue">Startup</span>}
          {job.is_remote_first && <span className="badge-teal">Remote-First</span>}
          {(job.source_regions || []).map((r) =>
            r !== "global" && r !== "us" ? (
              <span key={r} className="badge-gray">{r.toUpperCase()}</span>
            ) : null
          )}
        </div>

        {/* Ineligibility reason */}
        {ineligibilityReason && (
          <p className="mt-2 text-[12px] text-pmfit-red bg-pmfit-red-subtle rounded-lg px-3 py-1.5">
            {ineligibilityReason}
          </p>
        )}

        {/* Fit explanation */}
        {fitExplanation && (
          <p className="mt-3 text-[13px] text-pmfit-text-secondary line-clamp-2">{fitExplanation}</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {/* Tailor button — gated on recovery */}
          {!recoveryComplete ? (
            <div className="relative group">
              <button disabled className="btn-primary text-[13px] h-8 px-4 opacity-40 flex items-center gap-1.5">
                <Lock size={12} /> Generate Tailored Resume
              </button>
              <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-20 whitespace-nowrap bg-pmfit-navy text-white text-[11px] rounded-lg px-3 py-1.5 shadow-lg">
                Complete resume recovery first
              </div>
            </div>
          ) : tailorState === "idle" ? (
            <button onClick={handleTailor} className="btn-primary text-[13px] h-8 px-4">
              Generate Tailored Resume
            </button>
          ) : tailorState === "queuing" ? (
            <button disabled className="btn-primary text-[13px] h-8 px-4 flex items-center gap-2 opacity-70">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Queuing…
            </button>
          ) : tailorState === "generating" ? (
            <button disabled className="btn-primary text-[13px] h-8 px-4 flex items-center gap-2 opacity-70">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…
            </button>
          ) : tailorState === "done" ? (
            <div className="flex flex-wrap items-center gap-2">
              {artifacts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => download(a)}
                  disabled={downloading === a.id}
                  className="btn-secondary text-[12px] h-8 px-3 flex items-center gap-1.5"
                >
                  <Download size={12} />
                  {downloading === a.id ? "Downloading…" : a.type === "cover_letter" ? "Cover Letter" : "Tailored Resume"}
                </button>
              ))}
            </div>
          ) : tailorState === "timeout" ? (
            <button onClick={handleTailor} className="btn-secondary text-[13px] h-8 px-4 text-pmfit-orange">
              Still generating — retry
            </button>
          ) : (
            <button onClick={handleTailor} className="btn-secondary text-[13px] h-8 px-4 text-pmfit-red">
              Error — retry
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="btn-ghost text-[13px] h-8 px-3 ml-auto"
          >
            {expanded ? <><ChevronUp size={14} /> Less</> : <><ChevronDown size={14} /> Score breakdown</>}
          </button>
        </div>
      </div>

      {/* Expandable breakdown */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-pmfit-border"
          >
            <div className="px-5 py-4 space-y-3 bg-pmfit-bg/50">
              <p className="text-[12px] font-bold text-pmfit-text-secondary uppercase tracking-wide">
                Score Breakdown
              </p>
              {breakdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={breakdownData} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <Tooltip
                      cursor={{ fill: "#F5F7FF" }}
                      formatter={(v) => [`${v}%`, ""]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                    />
                    <Bar dataKey="value" radius={4} isAnimationActive animationDuration={600}>
                      {breakdownData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.value >= 70 ? "#20C997" : entry.value >= 50 ? "#0052CC" : "#FF8C00"}
                        />
                      ))}
                    </Bar>
                    <XAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-[13px] text-pmfit-text-muted">Breakdown not available for this job.</p>
              )}
              <a
                href={`/apply/${job.id}`}
                className="inline-flex items-center gap-1 text-[13px] text-pmfit-blue hover:underline font-medium"
              >
                Full job details <ExternalLink size={12} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
