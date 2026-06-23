"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FitGauge } from "./FitGauge";
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  ExternalLink,
} from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ScoreBreakdown {
  skill_alignment?:      { score: number; matched?: string[]; missing?: string[] };
  seniority_match?:      { score: number };
  domain_relevance?:     { score: number };
  project_evidence?:     { score: number };
  profile_completeness?: { score: number };
}

interface JobCardProps {
  fitScore:              number;
  evidenceConfidence:    string;
  automationEligibility: string;
  fitExplanation:        string | null;
  ineligibilityReason:   string | null;
  scoreBreakdown?:       { components?: ScoreBreakdown };
  recoveryComplete:      boolean;
  job: {
    id:                  string;
    title:               string;
    company:             string;
    location_normalized: string | null;
    seniority_level:     string;
    remote_eligible:     boolean;
    ats_family:          string;
    posting_date:        string;
    source_url:          string | null;
    req_id:              string | null;
    board_categories:    string[];
    source_regions:      string[];
    is_startup:          boolean;
    is_remote_first:     boolean;
  };
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

function toTitleCase(s: string | null | undefined) {
  if (!s) return s;
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 14)  return `${diff}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function JobCard({ fitScore, evidenceConfidence, automationEligibility, fitExplanation, ineligibilityReason, scoreBreakdown, job }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);

  const color = avatarColor(job.company);

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
              {job.location_normalized && (
                <span className="flex items-center gap-1 text-[12px] text-pmfit-text-muted">
                  <MapPin size={11} /> {toTitleCase(job.location_normalized)}{job.remote_eligible ? " · Remote OK" : ""}
                </span>
              )}
              <span className="flex items-center gap-1 text-[12px] text-pmfit-text-muted">
                <Clock size={11} /> {formatDate(job.posting_date)}
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
          {job.source_url && (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-[13px] h-8 px-4 inline-flex items-center gap-1.5"
            >
              Full Job Details <ExternalLink size={12} />
            </a>
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
              {job.req_id && (
                <p className="text-[11px] text-pmfit-text-muted">
                  Req ID: <span className="font-mono">{job.req_id}</span>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
