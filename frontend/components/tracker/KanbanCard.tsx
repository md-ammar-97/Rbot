"use client";

import { motion } from "framer-motion";
import { Clock, ExternalLink, GripVertical } from "lucide-react";

interface KanbanCardProps {
  title:     string;
  company:   string;
  atsFamily: string;
  updatedAt: string;
  jobId:     string;
}

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
}

const COLORS = ["#0052CC","#6B5ACD","#20C997","#FF8C00"];
function avatarColor(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % COLORS.length;
  return COLORS[h];
}

export function KanbanCard({ title, company, atsFamily, updatedAt, jobId }: KanbanCardProps) {
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
          <div className="flex items-center justify-between mt-1.5">
            <span className="flex items-center gap-1 text-[11px] text-pmfit-text-muted">
              <Clock size={10} /> {daysAgo(updatedAt)}
            </span>
            <span className="text-[10px] text-pmfit-text-muted uppercase">{atsFamily}</span>
          </div>
        </div>

        {/* Link */}
        <a
          href={`/apply/${jobId}`}
          onClick={(e) => e.stopPropagation()}
          className="text-pmfit-text-muted hover:text-pmfit-blue shrink-0 mt-0.5 transition-colors"
        >
          <ExternalLink size={13} />
        </a>
      </div>
    </motion.div>
  );
}
