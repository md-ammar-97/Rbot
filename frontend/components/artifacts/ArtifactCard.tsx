"use client";

import { useState } from "react";
import { Download, FileText, Mail, Briefcase, ExternalLink } from "lucide-react";

interface ArtifactCardProps {
  id:          string;
  type:        string;
  version:     number;
  storagePath: string;
  jobTitle?:   string | null;
  jobCompany?: string | null;
  createdAt:   string;
  signedUrl:   string | null;
}

const TYPE_META: Record<string, { label: string; badgeClass: string; icon: React.ElementType }> = {
  baseline_resume: { label: "Baseline Resume", badgeClass: "badge-teal",   icon: FileText   },
  tailored_resume: { label: "Tailored Resume",  badgeClass: "badge-blue",   icon: Briefcase  },
  cover_letter:    { label: "Cover Letter",     badgeClass: "badge-orange", icon: Mail       },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function ArtifactCard({ id, type, version, jobTitle, jobCompany, createdAt, signedUrl }: ArtifactCardProps) {
  const [downloading, setDownloading] = useState(false);
  const meta = TYPE_META[type] ?? { label: type, badgeClass: "badge-gray", icon: FileText };
  const Icon = meta.icon;

  const handleDownload = async () => {
    if (!signedUrl) return;
    setDownloading(true);
    try {
      const resp = await fetch(signedUrl);
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `${type}_${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-pmfit-blue/10 flex items-center justify-center shrink-0">
          <Icon size={20} className="text-pmfit-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={meta.badgeClass}>{meta.label}</span>
            {version > 1 && (
              <span className="text-[10px] text-pmfit-text-muted font-mono">v{version}</span>
            )}
          </div>
          {jobTitle && (
            <p className="text-[13px] text-pmfit-text-secondary mt-1 truncate">
              For: {jobTitle}{jobCompany ? ` · ${jobCompany}` : ""}
            </p>
          )}
          <p className="text-[12px] text-pmfit-text-muted mt-0.5">{formatDate(createdAt)}</p>
        </div>
      </div>

      <div className="flex gap-2 pt-1 border-t border-pmfit-border">
        {signedUrl ? (
          <>
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-[12px] h-8 px-3 flex items-center gap-1.5 flex-1 justify-center"
            >
              <ExternalLink size={13} /> View PDF
            </a>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-primary text-[12px] h-8 px-3 flex items-center gap-1.5 flex-1 justify-center disabled:opacity-50"
            >
              <Download size={13} />
              {downloading ? "Downloading…" : "Download"}
            </button>
          </>
        ) : (
          <p className="text-[12px] text-pmfit-text-muted py-1">File unavailable.</p>
        )}
      </div>
    </div>
  );
}
