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

const TIMEOUT_SECONDS = 120;

export default function RecoveryStep({ userId, recoveryStatus }: Props) {
  const router    = useRouter();
  const [status,        setStatus]        = useState(recoveryStatus);
  const [questions,     setQuestions]     = useState<Question[]>([]);
  const [caseId,        setCaseId]        = useState<string | null>(null);
  const [answers,       setAnswers]       = useState<Record<string, string>>({});
  const [submittingAll, setSubmittingAll] = useState(false);
  const [elapsed,       setElapsed]       = useState(0);
  const timedOut = status === "pending" && elapsed >= TIMEOUT_SECONDS;

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

  useEffect(() => {
    if (status !== "pending") return;
    const id = setInterval(async () => {
      setElapsed((e) => e + 5);
      const s = await fetchStatus();
      if (s === "complete" || s === "in_progress") {
        clearInterval(id);
        await fetchQuestions();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [status, fetchStatus, fetchQuestions]);

  const submitSingleAnswer = async (question: Question) => {
    if (!caseId || !answers[question.id]?.trim()) return;
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
  };

  const finishOnboarding = async () => {
    const token = await _getToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/onboarding/complete`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    router.push("/dashboard");
  };

  const handleSubmitAll = async () => {
    const unanswered  = questions.filter((q) => !q.answered);
    const filledPairs = unanswered.filter((q) => answers[q.id]?.trim());
    if (filledPairs.length === 0) return;

    setSubmittingAll(true);
    try {
      for (const q of filledPairs) {
        await submitSingleAnswer(q);
      }
      await finishOnboarding();
    } finally {
      setSubmittingAll(false);
    }
  };

  if (status === "pending") {
    if (timedOut) {
      return (
        <div className="text-center py-8">
          <p className="text-[17px] text-pmfit-text font-medium mb-2">
            Analysis is taking longer than expected.
          </p>
          <p className="text-[14px] text-pmfit-text-secondary mb-6">
            You can continue to the dashboard — your profile will complete in the background.
          </p>
          <button onClick={finishOnboarding} className="btn-primary w-full text-[17px] mb-3">
            Continue to Dashboard →
          </button>
          <button
            onClick={() => { setElapsed(0); fetchStatus(); }}
            className="btn-secondary w-full text-[15px]"
          >
            Check again
          </button>
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <div className="w-10 h-10 border-2 border-pmfit-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[17px] text-pmfit-text font-medium">Analysing your resume…</p>
        <p className="text-[14px] text-pmfit-text-secondary mt-2">This takes 15–30 seconds.</p>
        {elapsed >= 30 && (
          <p className="text-[13px] text-pmfit-text-muted mt-4">
            Still working… ({TIMEOUT_SECONDS - elapsed}s before timeout)
          </p>
        )}
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-pmfit-teal-subtle flex items-center justify-center mx-auto mb-4 text-3xl text-pmfit-teal">
          ✓
        </div>
        <p className="text-[22px] font-semibold text-pmfit-text mb-2">Your baseline resume is ready.</p>
        <p className="text-[15px] text-pmfit-text-secondary mb-8">
          Quality Recovery is complete. Job discovery and scoring are now active.
        </p>
        <button onClick={finishOnboarding} className="btn-primary w-full text-[17px]">
          Go to Dashboard →
        </button>
      </div>
    );
  }

  const unanswered   = questions.filter((q) => !q.answered);
  const filledCount  = unanswered.filter((q) => answers[q.id]?.trim()).length;
  const canSubmitAll = filledCount > 0 && !submittingAll;

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-pmfit-text mb-2">Resume Quality Recovery</h2>
      <p className="text-[15px] text-pmfit-text-secondary mb-6">
        Fill in as many answers as you can, then submit all at once to rebuild your profile.
      </p>

      {unanswered.length === 0 && status === "in_progress" && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-pmfit-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[15px] text-pmfit-text-secondary">Rebuilding your profile with your answers…</p>
        </div>
      )}

      <div className="space-y-6">
        {unanswered.map((q) => (
          <div key={q.id} className="border border-pmfit-border rounded-xl p-5">
            <p className="text-[12px] font-semibold text-pmfit-blue tracking-wide uppercase mb-2">
              {q.dimension.replace(/_/g, " ")}
            </p>
            <p className="text-[15px] text-pmfit-text font-medium mb-3">{q.question}</p>
            <textarea
              className="w-full border border-pmfit-border rounded-xl p-3 text-[15px] text-pmfit-text
                         placeholder:text-pmfit-text-muted focus:outline-none focus:border-pmfit-blue
                         resize-none transition-colors min-h-[80px]"
              placeholder="Your answer…"
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              disabled={submittingAll}
            />
          </div>
        ))}
      </div>

      {unanswered.length > 0 && (
        <div className="mt-6 space-y-3">
          <button
            onClick={handleSubmitAll}
            disabled={!canSubmitAll}
            className="w-full btn-primary text-[15px] h-12 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submittingAll ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving answers…
              </>
            ) : (
              `Submit All & Build Profile${filledCount > 0 ? ` (${filledCount} answer${filledCount !== 1 ? "s" : ""})` : ""}`
            )}
          </button>
          <button
            onClick={finishOnboarding}
            disabled={submittingAll}
            className="w-full btn-secondary text-[14px]"
          >
            Skip for now →
          </button>
        </div>
      )}
    </div>
  );
}

async function _getToken() {
  const { createClient } = await import("@/lib/supabase/client");
  return (await createClient().auth.getSession()).data.session?.access_token ?? "";
}
