"use client";

import { useState, useRef } from "react";

interface Props {
  userId: string;
  onNext: () => void;
}

export default function ResumeUploadStep({ userId, onNext }: Props) {
  const [status,   setStatus]   = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message,  setMessage]  = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;
    setStatus("uploading");
    setMessage("");

    try {
      const token = await _getToken();
      const form  = new FormData();
      form.append("file", file);

      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/intake/resume`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
        body:    form,
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Upload failed");
      }

      setStatus("done");
      setMessage("Resume uploaded. Parsing in progress…");
      setTimeout(onNext, 1500);
    } catch (e: unknown) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Upload failed. Please try again.");
    }
  };

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-apple-text mb-2">Upload your resume</h2>
      <p className="text-[15px] text-apple-text-secondary mb-6">
        PDF, DOCX, or TXT · Max 10 MB. We'll extract your experience automatically.
      </p>

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
          status === "done"
            ? "border-apple-success bg-apple-success-subtle"
            : "border-apple-border hover:border-apple-accent"
        }`}
      >
        {status === "idle"      && <p className="text-[15px] text-apple-text-secondary">Click or drag your resume here</p>}
        {status === "uploading" && <p className="text-[15px] text-apple-accent">Uploading…</p>}
        {status === "done"      && <p className="text-[15px] text-apple-success font-medium">✓ {message}</p>}
        {status === "error"     && <p className="text-[15px] text-apple-destructive">{message}</p>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
        }}
      />

      <button
        onClick={onNext}
        className="mt-6 w-full btn-secondary text-[15px]"
        disabled={status === "uploading"}
      >
        Skip for now →
      </button>
    </div>
  );
}

async function _getToken(): Promise<string> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}
