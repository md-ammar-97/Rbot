import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { DiagnosisDonut, DimensionBars } from "@/components/recovery/DiagnosisChart";
import { EvidenceGapCard } from "@/components/recovery/EvidenceGapCard";
import { CheckCircle2, AlertCircle, ArrowRight, FileWarning } from "lucide-react";
import { EvidenceSourceButtons } from "@/components/profile/EvidenceSourceButtons";

interface DiagnosisDimension {
  score:     number;
  threshold: number;
  passed:    boolean;
  note:      string | null;
}

interface Diagnosis {
  overall_score:      number;
  dimensions:         Record<string, DiagnosisDimension>;
  failed_dimensions:  string[];
  recovery_required:  boolean;
}

interface OpenQuestion {
  id:          string;
  dimension:   string;
  question:    string;
  answer_type: string;
  required:    boolean;
  answered:    boolean;
  options?:    string[];
}

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, recovery_status, profile_graph")
    .eq("id", user.id)
    .single();

  const { data: recoveryCase } = await supabase
    .from("recovery_cases")
    .select("diagnosis, open_questions, status, questions_answered_count")
    .eq("user_id", user.id)
    .neq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const diagnosis      = recoveryCase?.diagnosis as Diagnosis | null;
  const openQuestions  = (recoveryCase?.open_questions ?? []) as OpenQuestion[];
  const answeredCount  = recoveryCase?.questions_answered_count ?? 0;
  const totalQuestions = openQuestions.length;
  const recoveryDone   = profile?.recovery_status === "complete";

  const completeness  = Math.round((profile?.profile_graph?.profile_completeness ?? 0) * 100);
  const confidence    = (profile?.profile_graph?.evidence_confidence as string) ?? "unknown";
  const overallScore  = diagnosis ? Math.round(diagnosis.overall_score * 100) : completeness;

  // True "no data" state: no recovery case AND no profile graph at all
  const hasNoData = !recoveryCase && completeness === 0;

  return (
    <AppShell title="Resume Recovery" avatarUrl={profile?.avatar_url} userName={profile?.full_name}>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-pmfit-text">Recovery Dashboard</h1>
        <p className="text-[14px] text-pmfit-text-secondary mt-0.5">
          {recoveryDone
            ? "Your profile is complete and ready for job matching."
            : hasNoData
            ? "Upload your resume to get started with PMFit."
            : "Complete your profile to unlock job matching and applications."}
        </p>
      </div>

      {/* No data — prominent onboarding CTA */}
      {hasNoData && (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-pmfit-blue/40 bg-pmfit-blue-subtle/30 p-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-pmfit-blue/10 flex items-center justify-center">
            <FileWarning size={32} className="text-pmfit-blue" />
          </div>
          <div>
            <p className="text-[17px] font-bold text-pmfit-text">No profile data yet</p>
            <p className="text-[14px] text-pmfit-text-secondary mt-1 max-w-md">
              You haven&apos;t uploaded your resume or connected any evidence sources. Complete onboarding to unlock job matching, fit scoring, and tailored applications.
            </p>
          </div>
          <Link href="/onboarding?force=true" className="btn-primary h-10 px-6 text-[14px] flex items-center gap-2">
            Start profile setup <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* Recovery complete banner */}
      {recoveryDone && (
        <div className="mb-6 rounded-2xl border border-pmfit-teal/30 bg-pmfit-teal-subtle p-5 flex items-center gap-4">
          <CheckCircle2 size={22} className="text-pmfit-teal shrink-0" />
          <div>
            <p className="text-[15px] font-semibold text-pmfit-text">Profile recovery complete</p>
            <p className="text-[13px] text-pmfit-text-secondary mt-0.5">
              Your baseline resume has been generated. Start browsing matched roles.
            </p>
          </div>
          <Link href="/jobs" className="btn-primary text-[13px] h-9 px-4 ml-auto shrink-0 flex items-center gap-1.5">
            Browse Jobs <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: charts + dimensions */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-6">
            <h2 className="text-[16px] font-bold text-pmfit-text mb-5">Recovery Diagnosis</h2>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <DiagnosisDonut score={overallScore} />
              <div className="flex-1 space-y-4 w-full">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-pmfit-bg p-4 text-center">
                    <p className="text-[28px] font-bold text-pmfit-text">{completeness}%</p>
                    <p className="text-[12px] text-pmfit-text-secondary">Profile Complete</p>
                  </div>
                  <div className="rounded-xl bg-pmfit-bg p-4 text-center">
                    <p className="text-[28px] font-bold text-pmfit-text capitalize">{confidence}</p>
                    <p className="text-[12px] text-pmfit-text-secondary">Evidence Confidence</p>
                  </div>
                </div>
                {!recoveryDone && totalQuestions > 0 && (
                  <div>
                    <div className="flex justify-between text-[12px] text-pmfit-text-secondary mb-1.5">
                      <span>Recovery progress</span>
                      <span>{answeredCount} / {totalQuestions} answered</span>
                    </div>
                    <div className="h-2 bg-pmfit-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pmfit-blue rounded-full transition-all duration-500"
                        style={{ width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {diagnosis?.dimensions && Object.keys(diagnosis.dimensions).length > 0 && (
            <div className="card p-6">
              <h2 className="text-[16px] font-bold text-pmfit-text mb-5">Quality Dimensions</h2>
              <DimensionBars dimensions={diagnosis.dimensions} />
            </div>
          )}

          <div className="card p-6">
            <h2 className="text-[16px] font-bold text-pmfit-text mb-4">Evidence Sources</h2>
            <EvidenceSourceButtons />
          </div>
        </div>

        {/* Right 1/3: evidence gaps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-pmfit-text">Evidence Gaps</h2>
            {openQuestions.filter((q) => !q.answered).length > 0 && (
              <span className="badge-red">
                {openQuestions.filter((q) => !q.answered).length} open
              </span>
            )}
          </div>

          {/* No data at all — prompt onboarding */}
          {hasNoData ? (
            <div className="card p-6 text-center border border-pmfit-orange/30">
              <AlertCircle size={32} className="text-pmfit-orange mx-auto mb-3" />
              <p className="text-[15px] font-semibold text-pmfit-text">Profile not started</p>
              <p className="text-[13px] text-pmfit-text-secondary mt-1 mb-4">
                Upload your resume to generate your quality diagnosis and identify evidence gaps.
              </p>
              <Link href="/onboarding?force=true" className="btn-primary text-[13px] h-9 px-4 inline-flex items-center gap-1.5">
                Set up profile <ArrowRight size={13} />
              </Link>
            </div>

          /* Recovery case exists but all questions answered */
          ) : recoveryCase && openQuestions.length === 0 ? (
            <div className="card p-6 text-center">
              <CheckCircle2 size={36} className="text-pmfit-teal mx-auto mb-3" />
              <p className="text-[15px] font-semibold text-pmfit-text">All gaps resolved</p>
              <p className="text-[13px] text-pmfit-text-secondary mt-1">
                No open questions. Your profile is well-evidenced.
              </p>
            </div>

          /* Open questions to answer */
          ) : (
            <div className="space-y-3">
              {[...openQuestions]
                .sort((a, b) => Number(a.answered) - Number(b.answered))
                .map((q) => (
                  <EvidenceGapCard key={q.id} question={q} />
                ))}
            </div>
          )}

          {!recoveryDone && diagnosis?.recovery_required && (
            <div className="card p-4 border border-pmfit-orange/30 bg-pmfit-orange-subtle/40">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-pmfit-orange shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-pmfit-text">Proceed with current profile?</p>
                  <p className="text-[12px] text-pmfit-text-secondary mt-0.5">
                    Auto-apply and some tailoring features will be limited until quality improves.
                  </p>
                  <button className="mt-3 text-[12px] text-pmfit-orange font-semibold hover:underline">
                    Override and proceed anyway →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
