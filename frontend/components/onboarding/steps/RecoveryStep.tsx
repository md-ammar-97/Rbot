"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Question {
  id:          string;
  dimension:   string;
  role_id:     string | null;
  question:    string;
  answer_type: string;
  required:    boolean;
  answered:    boolean;
}

interface Props {
  userId:         string;
  recoveryStatus: string;
}

export default function RecoveryStep({ userId, recoveryStatus }: Props) {
  const router    = useRouter();
  const [status,    setStatus]    = useState(recoveryStatus);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [caseId,    setCaseId]    = useState<string | null>(null);
  const [answers,   setAnswers]   = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [polling,   setPolling]   = useState(false);

  const fetchStatus = useCallback(async () => {
    const token = await _getToken();
    const resp  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/recovery/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    setStatus(data.data.recovery_status);
    return data.data.recovery_status;
  }, []);

  const fetchQuestions = useCallback(async () => {
    const token = await _getToken();
    const resp  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/recovery/questions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    setQuestions(data.data.questions || []);
    setCaseId(data.data.case_id);
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchQuestions();
  }, [fetchStatus, fetchQuestions]);

  // Poll for completion every 5 seconds
  useEffect(() => {
    if (status === "complete") return;
    const id = setInterval(async () => {
      const s = await fetchStatus();
      if (s === "complete") {
        clearInterval(id);
        await fetchQuestions();
      } else if (s === "in_progress") {
        await fetchQuestions();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [status, fetchStatus, fetchQuestions]);

  const submitAnswer = async (question: Question) => {
    if (!caseId || !answers[question.id]) return;
    setSaving(true);
    try {
      const token = await _getToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/recovery/answer`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({
          question_id:   question.id,
          question_text: question.question,
          answer:        answers[question.id],
          case_id:       caseId,
        }),
      });
      setQuestions((qs) => qs.map((q) => q.id === question.id ? { ...q, answered: true } : q));
    } finally {
      setSaving(false);
    }
  };

  const finishOnboarding = async () => {
    const token = await _getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/onboarding/complete`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    router.push("/dashboard");
  };

  if (status === "pending") {
    return (
      <div className="text-center py-8">
        <div className="w-10 h-10 border-2 border-apple-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[17px] text-apple-text font-medium">Analysing your resume…</p>
        <p className="text-[14px] text-apple-text-secondary mt-2">This takes 15–30 seconds.</p>
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-apple-success-subtle flex items-center justify-center mx-auto mb-4 text-3xl">
          ✓
        </div>
        <p className="text-[22px] font-semibold text-apple-text mb-2">Your baseline resume is ready.</p>
        <p className="text-[15px] text-apple-text-secondary mb-8">
          Quality Recovery is complete. Job discovery and scoring are now active.
        </p>
        <button onClick={finishOnboarding} className="btn-primary w-full text-[17px]">
          Go to Dashboard →
        </button>
      </div>
    );
  }

  const unanswered = questions.filter((q) => !q.answered);

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-apple-text mb-2">Resume Quality Recovery</h2>
      <p className="text-[15px] text-apple-text-secondary mb-6">
        Answer these questions to strengthen your profile. Each is specific to a role you listed.
      </p>

      {unanswered.length === 0 && status === "in_progress" && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-apple-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[15px] text-apple-text-secondary">Rebuilding your profile with your answers…</p>
        </div>
      )}

      <div className="space-y-6">
        {unanswered.map((q) => (
          <div key={q.id} className="border border-apple-border rounded-xl p-5">
            <p className="text-[12px] font-semibold text-apple-accent tracking-wide uppercase mb-2">
              {q.dimension.replace(/_/g, " ")}
            </p>
            <p className="text-[15px] text-apple-text font-medium mb-3">{q.question}</p>
            <textarea
              className="w-full border border-apple-border rounded-xl p-3 text-[15px] text-apple-text
                         placeholder:text-apple-text-tertiary focus:outline-none focus:border-apple-accent
                         resize-none transition-colors min-h-[80px]"
              placeholder="Your answer…"
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
            />
            <button
              onClick={() => submitAnswer(q)}
              disabled={saving || !answers[q.id]}
              className="mt-2 btn-primary text-[14px] h-9 px-4"
            >
              {saving ? "Saving…" : "Submit Answer"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

async function _getToken() {
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token ?? "";
}
