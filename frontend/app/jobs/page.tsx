"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { JobCard } from "@/components/jobs/JobCard";
import { SkeletonJobGrid } from "@/components/ui/Skeleton";
import { SlidersHorizontal, Search } from "lucide-react";

interface ScoredJob {
  fit_score:              number;
  evidence_confidence:    string;
  automation_eligibility: string;
  fit_explanation:        string | null;
  ineligibility_reason:   string | null;
  score_breakdown:        { components?: Record<string, { score: number }> } | null;
  jobs: {
    id:              string;
    title:           string;
    company:         string;
    location:        string;
    seniority_level: string;
    remote_eligible: boolean;
    ats_family:      string;
    posting_date:    string;
  };
}

const containerV = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const cardV      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function JobsPage() {
  const [jobs,    setJobs]    = useState<ScoredJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [minFit,  setMinFit]  = useState(0);
  const [query,   setQuery]   = useState("");

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
      const res   = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/jobs/?min_fit=${minFit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data  = await res.json();
      setJobs(data.data || []);
      setLoading(false);
    })();
  }, [minFit]); // eslint-disable-line

  const requestTailoring = async (jobId: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs/${jobId}/tailor`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const filtered = jobs.filter((j) =>
    !query ||
    j.jobs.title.toLowerCase().includes(query.toLowerCase()) ||
    j.jobs.company.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AppShell title="Job Discovery">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-bold text-pmfit-text">PM Opportunities</h1>
          <p className="text-[14px] text-pmfit-text-secondary mt-0.5">
            {loading ? "Loading…" : `${filtered.length} roles scored for you`}
          </p>
        </div>

        <div className="sm:ml-auto flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pmfit-text-muted" />
            <input
              type="text"
              placeholder="Search roles or companies…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input h-9 pl-9 w-56 text-[14px]"
            />
          </div>
          {/* Min fit filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-pmfit-text-muted" />
            <select
              className="input h-9 w-28 text-[13px]"
              value={minFit}
              onChange={(e) => setMinFit(Number(e.target.value))}
            >
              {[0, 40, 55, 70, 80].map((v) => (
                <option key={v} value={v}>Fit ≥ {v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonJobGrid />
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-[17px] font-semibold text-pmfit-text mb-2">No matching roles found</p>
          <p className="text-[14px] text-pmfit-text-secondary">
            Try lowering the minimum fit score or check back in a few hours — discovery runs every 4 hrs.
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerV}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 xl:grid-cols-2 gap-4"
        >
          {filtered.map((item) => (
            <motion.div key={item.jobs.id} variants={cardV}>
              <JobCard
                fitScore={item.fit_score}
                evidenceConfidence={item.evidence_confidence}
                automationEligibility={item.automation_eligibility}
                fitExplanation={item.fit_explanation}
                ineligibilityReason={item.ineligibility_reason}
                scoreBreakdown={item.score_breakdown ?? undefined}
                job={item.jobs}
                onTailor={requestTailoring}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AppShell>
  );
}
