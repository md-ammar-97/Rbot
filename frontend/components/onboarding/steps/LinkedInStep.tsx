"use client";

import { useState, useRef } from "react";

interface Props {
  userId:     string;
  onNext:     () => void;
  onComplete: () => void;
}

export default function LinkedInStep({ userId, onNext, onComplete }: Props) {
  const [status,  setStatus]  = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setStatus("uploading");
    try {
      const token = await _getToken();
      const form  = new FormData();
      form.append("file", file);
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/intake/linkedin`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
        body:    form,
      });
      if (!resp.ok) throw new Error((await resp.json()).detail || "Upload failed");
      setStatus("done");
      setMessage("LinkedIn export uploaded. Parsing in progress…");
      setTimeout(onComplete, 1500);
    } catch (e: unknown) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Upload failed.");
    }
  };

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-pmfit-text mb-2">LinkedIn export</h2>
      <p className="text-[15px] text-pmfit-text-secondary mb-2">
        Strengthens your profile with more accurate dates, skills, and job descriptions.
      </p>
      <ol className="text-[13px] text-pmfit-text-secondary list-decimal ml-4 mb-6 space-y-1">
        <li>Go to LinkedIn → Me → Settings → Data privacy → Get a copy of your data</li>
        <li>Select &quot;Want something in particular&quot; → check Jobs, Profile, Connections</li>
        <li>Download and upload the ZIP file here</li>
      </ol>

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
          status === "done"
            ? "border-pmfit-teal bg-pmfit-teal-subtle"
            : "border-pmfit-border hover:border-pmfit-blue"
        }`}
      >
        {status === "idle" && (
          <p className="text-[15px] text-pmfit-text-secondary">Click to upload LinkedIn export (.zip)</p>
        )}
        {status === "uploading" && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-pmfit-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-[14px] text-pmfit-blue animate-pulse">Uploading…</p>
          </div>
        )}
        {status === "done"  && <p className="text-[15px] text-pmfit-teal font-medium">✓ {message}</p>}
        {status === "error" && <p className="text-[15px] text-pmfit-red">{message}</p>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
      />

      <button onClick={onNext} className="mt-6 w-full btn-secondary text-[15px]">
        Skip for now →
      </button>
    </div>
  );
}

async function _getToken() {
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token ?? "";
}
