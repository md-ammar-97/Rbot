"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AddedItem {
  id:             string;
  current_status: string;
  last_updated:   string;
  jobs: {
    id:         string;
    title:      string;
    company:    string;
    ats_family: string;
  };
}

interface Props {
  onClose: () => void;
  onAdded: (item: AddedItem) => void;
}

export function AddJobModal({ onClose, onAdded }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [title,           setTitle]           = useState("");
  const [company,         setCompany]         = useState("");
  const [applicationDate, setApplicationDate] = useState(today);
  const [jobDescription,  setJobDescription]  = useState("");
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState("");

  const canSubmit = title.trim() && company.trim() && applicationDate && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError("");

    try {
      const token = await _getToken();
      const resp  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tracker/manual`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({
          title:            title.trim(),
          company:          company.trim(),
          application_date: applicationDate,
          job_description:  jobDescription.trim() || null,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to add job.");
      }

      const { data } = await resp.json();
      onAdded({
        id:             data.item_id,
        current_status: "applied",
        last_updated:   new Date().toISOString(),
        jobs: {
          id:         data.job_id,
          title:      title.trim(),
          company:    company.trim(),
          ats_family: "manual",
        },
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-pmfit-border">
          <h2 className="text-[18px] font-semibold text-pmfit-text">Add Job Manually</h2>
          <button onClick={onClose} className="text-pmfit-text-muted hover:text-pmfit-text transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-pmfit-text-secondary mb-1.5 uppercase tracking-wide">
              Job Title <span className="text-pmfit-red">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Product Manager"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full text-[14px]"
              disabled={saving}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-pmfit-text-secondary mb-1.5 uppercase tracking-wide">
              Company <span className="text-pmfit-red">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Stripe"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="input w-full text-[14px]"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-pmfit-text-secondary mb-1.5 uppercase tracking-wide">
              Application Date <span className="text-pmfit-red">*</span>
            </label>
            <input
              type="date"
              value={applicationDate}
              onChange={(e) => setApplicationDate(e.target.value)}
              className="input w-full text-[14px]"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-pmfit-text-secondary mb-1.5 uppercase tracking-wide">
              Job Description <span className="text-pmfit-text-muted font-normal normal-case">(optional)</span>
            </label>
            <textarea
              placeholder="Paste the job description or any notes…"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="input w-full text-[14px] resize-none min-h-[80px]"
              disabled={saving}
            />
          </div>

          {error && (
            <p className="text-[13px] text-pmfit-red">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 btn-secondary text-[15px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 btn-primary text-[15px] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding…
              </>
            ) : (
              "Add to Tracker"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

async function _getToken() {
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token ?? "";
}
