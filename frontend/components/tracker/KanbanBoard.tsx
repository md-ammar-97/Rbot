"use client";

import { useState, useEffect } from "react";
import FitScoreBadge from "@/components/shared/FitScoreBadge";

const COLUMNS = [
  { key: "saved",          label: "Saved" },
  { key: "applied",        label: "Applied" },
  { key: "phone_screen",   label: "Phone Screen" },
  { key: "interview",      label: "Interview" },
  { key: "offer",          label: "Offer" },
  { key: "rejected",       label: "Rejected" },
  { key: "withdrawn",      label: "Withdrawn" },
] as const;

type Status = (typeof COLUMNS)[number]["key"];

interface TrackerItem {
  id:             string;
  current_status: Status;
  last_updated:   string;
  stale_flag:     boolean;
  jobs: {
    id:      string;
    title:   string;
    company: string;
    location: string;
    ats_family: string;
  };
  job_scores: {
    fit_score:            number;
    automation_eligibility: string;
  } | null;
}

interface Props {
  userId: string;
}

export default function KanbanBoard({ userId }: Props) {
  const [items,   setItems]   = useState<TrackerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await _getToken();
      const resp  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tracker/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      setItems(data.data || []);
      setLoading(false);
    })();
  }, []);

  const handleStatusChange = async (itemId: string, jobId: string, newStatus: Status) => {
    const token = await _getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tracker/${itemId}/status`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ job_id: jobId, new_status: newStatus }),
    });
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, current_status: newStatus } : item
      )
    );
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-8 h-8 border-2 border-apple-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-[17px] text-apple-text-secondary">No applications tracked yet.</p>
        <p className="text-[14px] text-apple-text-tertiary mt-2">
          When you save or apply to a job, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4" style={{ minWidth: COLUMNS.length * 260 + "px" }}>
        {COLUMNS.map((col) => {
          const colItems = items.filter((i) => i.current_status === col.key);
          return (
            <div key={col.key} className="flex-shrink-0 w-[240px]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-apple-text-secondary uppercase tracking-wide">
                  {col.label}
                </p>
                <span className="text-[12px] text-apple-text-tertiary bg-apple-surface rounded-full px-2 py-0.5 border border-apple-border">
                  {colItems.length}
                </span>
              </div>

              <div className="space-y-2">
                {colItems.map((item) => (
                  <div
                    key={item.id}
                    className={`card p-4 text-left ${item.stale_flag ? "border-apple-warning" : ""}`}
                  >
                    <p className="text-[14px] font-semibold text-apple-text line-clamp-1">{item.jobs.title}</p>
                    <p className="text-[13px] text-apple-text-secondary">{item.jobs.company}</p>

                    {item.job_scores && (
                      <div className="mt-2">
                        <FitScoreBadge score={item.job_scores.fit_score} size="sm" />
                      </div>
                    )}

                    {item.stale_flag && (
                      <p className="text-[11px] text-apple-warning font-medium mt-1">
                        No updates in 14+ days
                      </p>
                    )}

                    <select
                      className="mt-3 w-full text-[12px] border border-apple-border rounded-lg px-2 py-1
                                 text-apple-text bg-white focus:outline-none focus:border-apple-accent"
                      value={col.key}
                      onChange={(e) =>
                        handleStatusChange(item.id, item.jobs.id, e.target.value as Status)
                      }
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                ))}

                {colItems.length === 0 && (
                  <div className="border border-dashed border-apple-border rounded-xl h-24 flex items-center justify-center">
                    <p className="text-[12px] text-apple-text-tertiary">Empty</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function _getToken() {
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token ?? "";
}
