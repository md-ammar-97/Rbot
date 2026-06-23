"use client";

import { motion } from "framer-motion";
import { Clock, ExternalLink, GripVertical, MapPin } from "lucide-react";

interface KanbanCardProps {
  title:      string;
  company:    string;
  atsFamily:  string;
  updatedAt:  string;
  jobId:      string;
  sourceUrl?: string | null;
  location?:  string | null;
  reqId?:     string | null;
  postingDate?: string | null;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 0)   return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (d === 0) return "Posted today";
  if (d === 1) return "1d ago";
  if (d < 30)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const COLORS = ["#0052CC","#6B5ACD","#20C997","#FF8C00"];
function avatarColor(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % COLORS.length;
  return COLORS[h];
}

export function KanbanCard({ title, company, atsFamily, updatedAt, jobId, sourceUrl, location, reqId, postingDate }: KanbanCardProps) {
  const linkHref  = sourceUrl || null;
  const dateLabel = formatDate(postingDate) ?? formatDate(updatedAt);

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="bg-white rounded-xl border border-pmfit-border shadow-card p-3.5 group cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start gap-2.5">
        {/* Drag handle */}
        <GripVertical size={14} className="text-pmfit-text-muted shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
          style={{ backgroundColor: avatarColor(company) }}
        >
          {company[0].toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-pmfit-text leading-snug truncate">{title}</p>
          <p className="text-[12px] text-pmfit-text-secondary truncate">{company}</p>

          {location && (
            <p className="flex items-center gap-0.5 text-[11px] text-pmfit-text-muted mt-0.5 truncate">
              <MapPin size={9} /> {location}
            </p>
          )}

          <div className="flex items-center justify-between mt-1.5">
            <span className="flex items-center gap-1 text-[11px] text-pmfit-text-muted">
              <Clock size={10} /> {dateLabel}
            </span>
            <div className="flex items-center gap-1.5">
              {reqId && (
                <span className="text-[9px] font-mono text-pmfit-text-muted bg-pmfit-border/60 px-1 py-0.5 rounded">
                  #{reqId.slice(0, 12)}
                </span>
              )}
              <span className="text-[10px] text-pmfit-text-muted uppercase">{atsFamily}</span>
            </div>
          </div>
        </div>

        {/* External link */}
        {linkHref ? (
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-pmfit-text-muted hover:text-pmfit-blue shrink-0 mt-0.5 transition-colors"
            title="Open job posting"
          >
            <ExternalLink size={13} />
          </a>
        ) : (
          <div className="w-[13px] shrink-0" />
        )}
      </div>
    </motion.div>
  );
}
