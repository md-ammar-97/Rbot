"use client";

import { useState, useEffect } from "react";
import FitScoreBadge from "@/components/shared/FitScoreBadge";
import Link from "next/link";

interface ScoredJob {
  fit_score:            number;
  evidence_confidence:  string;
  automation_eligibility: string;
  fit_explanation:      string;
  ineligibility_reason: string | null;
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

export default function JobsPage() {
  const [jobs,    setJobs]    = useState<ScoredJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [minFit,  setMinFit]  = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const token = await _getToken();
      const resp  = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/jobs/?min_fit=${minFit}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await resp.json();
      setJobs(data.data || []);
      setLoading(false);
    })();
  }, [minFit]);

  const requestTailoring = async (jobId: string) => {
    const token = await _getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs/${jobId}/tailor`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    alert("Tailoring queued. Check your profile for artifacts when ready.");
  };

  return (
    <div className="min-h-screen bg-apple-surface">
      <nav className="bg-white border-b border-apple-border px-6 h-14 flex items-center gap-6">
        <Link href="/dashboard" className="text-[17px] font-semibold text-apple-text">RBot</Link>
        <Link href="/jobs"    className="text-[15px] font-medium text-apple-accent">Jobs</Link>
        <Link href="/tracker" className="text-[15px] text-apple-text-secondary hover:text-apple-text">Tracker</Link>
        <Link href="/profile" className="text-[15px] text-apple-text-secondary hover:text-apple-text">Profile</Link>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] font-bold text-apple-text">Matched Roles</h1>
          <div className="flex items-center gap-3">
            <label className="text-[14px] text-apple-text-secondary">Min Fit Score:</label>
            <select
              className="input w-24 h-9 text-[14px]"
              value={minFit}
              onChange={(e) => setMinFit(Number(e.target.value))}
            >
              {[0, 40, 55, 70, 80].map((v) => (
                <option key={v} value={v}>{v}+</option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-apple-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-[17px] text-apple-text-secondary">
              No scored jobs yet. Discovery runs every 4 hours.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {jobs.map((item) => (
            <div key={item.jobs.id} className="card p-5 flex items-start gap-5">
              <div className="shrink-0 pt-1">
                <FitScoreBadge score={item.fit_score} size="lg" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[17px] font-semibold text-apple-text">{item.jobs.title}</p>
                    <p className="text-[14px] text-apple-text-secondary">{item.jobs.company}</p>
                    <p className="text-[13px] text-apple-text-tertiary mt-0.5">
                      {item.jobs.location}
                      {item.jobs.remote_eligible && " · Remote OK"}
                      {" · "}
                      {item.jobs.ats_family}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span
                      className={`text-[12px] px-2 py-1 rounded-lg font-medium border ${
                        item.automation_eligibility === "eligible"
                          ? "text-apple-success bg-apple-success-subtle border-apple-success/20"
                          : item.automation_eligibility === "restricted"
                          ? "text-apple-warning bg-apple-warning-subtle border-apple-warning/20"
                          : "text-apple-text-secondary bg-apple-surface border-apple-border"
                      }`}
                    >
                      {item.automation_eligibility.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`text-[12px] px-2 py-1 rounded-lg font-medium border ${
                        item.evidence_confidence === "high"
                          ? "text-apple-success bg-apple-success-subtle border-apple-success/20"
                          : item.evidence_confidence === "medium"
                          ? "text-apple-warning bg-apple-warning-subtle border-apple-warning/20"
                          : "text-apple-text-secondary bg-apple-surface border-apple-border"
                      }`}
                    >
                      {item.evidence_confidence} confidence
                    </span>
                  </div>
                </div>
                {item.fit_explanation && (
                  <p className="text-[13px] text-apple-text-secondary mt-2 line-clamp-2">
                    {item.fit_explanation}
                  </p>
                )}
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => requestTailoring(item.jobs.id)}
                    className="btn-primary text-[13px] h-8 px-3"
                  >
                    Generate Tailored Resume
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

async function _getToken() {
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token ?? "";
}
