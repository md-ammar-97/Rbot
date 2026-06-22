"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { KanbanCard } from "./KanbanCard";
import { Skeleton } from "@/components/ui/Skeleton";

interface TrackerItem {
  id:             string;
  current_status: string;
  last_updated:   string;
  jobs: {
    id:         string;
    title:      string;
    company:    string;
    ats_family: string;
  } | null;
}

const COLUMNS: { status: string; label: string; color: string }[] = [
  { status: "discovered",          label: "Discovered",    color: "#9CA3AF" },
  { status: "reviewing",           label: "Reviewing",     color: "#0052CC" },
  { status: "tailoring",           label: "Tailoring",     color: "#6B5ACD" },
  { status: "applied",             label: "Applied",       color: "#20C997" },
  { status: "outreach_sent",       label: "Outreach",      color: "#1D7EFF" },
  { status: "recruiter_response",  label: "Recruiter",     color: "#FF8C00" },
  { status: "interview_scheduled", label: "Interview",     color: "#FF8C00" },
  { status: "final_round",         label: "Final Round",   color: "#6B5ACD" },
  { status: "offer_received",      label: "Offer",         color: "#20C997" },
];

const containerV = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const colV       = { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.35 } } };

export function KanbanBoard({ userId }: { userId: string }) {
  const [items,   setItems]   = useState<TrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tracker_items")
        .select("id, current_status, last_updated, jobs(id, title, company, ats_family)")
        .eq("user_id", userId)
        .not("current_status", "in", "(closed_accepted,closed_rejected,closed_withdrawn)")
        .order("last_updated", { ascending: false });
      setItems((data as unknown as TrackerItem[]) || []);
      setLoading(false);
    })();
  }, [userId]); // eslint-disable-line

  const updateStatus = async (itemId: string, newStatus: string) => {
    await supabase
      .from("tracker_items")
      .update({ current_status: newStatus, last_updated: new Date().toISOString() })
      .eq("id", itemId);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, current_status: newStatus } : i))
    );
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.slice(0, 5).map((col) => (
          <div key={col.status} className="flex-shrink-0 w-60 space-y-3">
            <Skeleton className="h-6 w-28 rounded-lg" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const byStatus = COLUMNS.reduce<Record<string, TrackerItem[]>>((acc, col) => {
    acc[col.status] = items.filter((i) => i.current_status === col.status);
    return acc;
  }, {});

  const visibleCols = COLUMNS.filter(
    (col, i) => i < 5 || (byStatus[col.status]?.length ?? 0) > 0
  );

  return (
    <div className="w-full overflow-x-auto pb-4">
      <motion.div
        variants={containerV}
        initial="hidden"
        animate="show"
        className="flex gap-4"
        style={{ minWidth: `${visibleCols.length * 256}px` }}
      >
        {visibleCols.map((col) => {
          const colItems = byStatus[col.status] ?? [];
          return (
            <motion.div
              key={col.status}
              variants={colV}
              className="flex-shrink-0 w-60 flex flex-col gap-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("itemId");
                if (id) updateStatus(id, col.status);
              }}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-1 mb-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
                <span className="text-[12px] font-bold text-pmfit-text-secondary uppercase tracking-wide truncate">
                  {col.label}
                </span>
                <span className="ml-auto text-[11px] font-semibold text-pmfit-text-muted bg-pmfit-border/60 px-1.5 py-0.5 rounded-full">
                  {colItems.length}
                </span>
              </div>

              {/* Drop zone */}
              <div
                className="flex flex-col gap-2 min-h-[80px] rounded-xl p-1 transition-colors"
                onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.background = "rgba(0,82,204,0.04)"; }}
                onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                onDrop={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
              >
                {colItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("itemId", item.id)}
                  >
                    <KanbanCard
                      title={item.jobs?.title ?? "Unknown Role"}
                      company={item.jobs?.company ?? "Unknown"}
                      atsFamily={item.jobs?.ats_family ?? ""}
                      updatedAt={item.last_updated}
                      jobId={item.jobs?.id ?? ""}
                    />
                  </div>
                ))}

                {colItems.length === 0 && (
                  <div className="flex items-center justify-center h-16 rounded-xl border-2 border-dashed border-pmfit-border">
                    <p className="text-[11px] text-pmfit-text-muted">Drop here</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
