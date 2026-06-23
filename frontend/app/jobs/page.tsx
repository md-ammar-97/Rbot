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

const containerV = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const cardV      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function JobsPage() {
  const [jobs,             setJobs]             = useState<ScoredJob[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [minFit,           setMinFit]           = useState(0);
  const [query,            setQuery]            = useState("");
  const [recoveryComplete, setRecoveryComplete] = useState(false);
  const [showFilters,      setShowFilters]      = useState(false);
  const [remoteOnly,       setRemoteOnly]       = useState(false);
  const [startupOnly,      setStartupOnly]      = useState(false);
  const [sourceRegion,     setSourceRegion]     = useState("");
  const [boardCategory,    setBoardCategory]    = useState("");

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const params = new URLSearchParams({ min_fit: String(minFit) });
      if (remoteOnly)    params.set("remote",         "true");
      if (startupOnly)   params.set("is_startup",     "true");
      if (sourceRegion)  params.set("source_region",  sourceRegion);
      if (boardCategory) params.set("board_category", boardCategory);

      const [jobsRes, profileRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs/?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const jobsData    = await jobsRes.json();
      const profileData = await profileRes.json();
      setJobs(jobsData.data || []);
      setRecoveryComplete(profileData.data?.recovery_status === "complete");
      setLoading(false);
    })();
  }, [minFit, remoteOnly, startupOnly, sourceRegion, boardCategory]); // eslint-disable-line

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

        <div className="sm:ml-auto flex flex-wrap items-center gap-3">
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
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`btn-ghost h-9 px-3 flex items-center gap-1.5 text-[13px] ${showFilters ? "text-pmfit-blue" : ""}`}
            >
              <SlidersHorizontal size={15} /> Filters
            </button>
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
          {/* Expanded filters */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setRemoteOnly((v) => !v)}
                className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors ${
                  remoteOnly ? "bg-pmfit-teal text-white border-pmfit-teal" : "border-pmfit-border text-pmfit-text-secondary"
                }`}
              >
                Remote Only
              </button>
              <button
                onClick={() => setStartupOnly((v) => !v)}
                className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors ${
                  startupOnly ? "bg-pmfit-blue text-white border-pmfit-blue" : "border-pmfit-border text-pmfit-text-secondary"
                }`}
              >
                Startup
              </button>
              <select
                className="input h-8 text-[12px] w-36"
                value={sourceRegion}
                onChange={(e) => setSourceRegion(e.target.value)}
              >
                <option value="">All Regions</option>
                <option value="us">United States</option>
                <option value="uk">United Kingdom</option>
                <option value="eu">Europe</option>
                <option value="nordics">Nordics</option>
                <option value="india">India</option>
                <option value="global">Global / Remote</option>
              </select>
              <select
                className="input h-8 text-[12px] w-36"
                value={boardCategory}
                onChange={(e) => setBoardCategory(e.target.value)}
              >
                <option value="">All Boards</option>
                <option value="remote_first">Remote-First</option>
                <option value="startup">Startup</option>
                <option value="general_tech">General Tech</option>
                <option value="enterprise">Enterprise</option>
                <option value="uk_eu_focused">UK / EU</option>
                <option value="nordic">Nordic</option>
                <option value="india_focused">India</option>
              </select>
            </div>
          )}
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
                recoveryComplete={recoveryComplete}
                job={item.jobs}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AppShell>
  );
}
