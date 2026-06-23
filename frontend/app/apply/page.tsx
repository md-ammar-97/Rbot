import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { RollbackButton } from "@/components/apply/RollbackButton";
import { CheckCircle2, Clock, XCircle, AlertCircle, Zap } from "lucide-react";

interface ApplySession {
  id:                string;
  job_id:            string | null;
  session_type:      string;
  status:            string;
  ats_family:        string | null;
  submitted_at:      string | null;
  failure_reason:    string | null;
  rollback_available: boolean;
  started_at:        string;
  jobs:              { title: string; company: string; source_url: string | null } | null;
}

const STATUS_META: Record<string, { label: string; icon: React.ElementType; class: string }> = {
  submitted: { label: "Submitted",   icon: CheckCircle2, class: "text-pmfit-teal" },
  pending:   { label: "Pending",     icon: Clock,        class: "text-pmfit-blue" },
  cancelled: { label: "Cancelled",   icon: XCircle,      class: "text-pmfit-text-muted" },
  failed:    { label: "Failed",      icon: AlertCircle,  class: "text-pmfit-red" },
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default async function ApplyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: rawSessions } = await supabase
    .from("apply_sessions")
    .select("id, job_id, session_type, status, ats_family, submitted_at, failure_reason, rollback_available, started_at, jobs(title, company, source_url)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  const sessions: ApplySession[] = (rawSessions ?? []) as ApplySession[];

  return (
    <AppShell title="Applications" avatarUrl={profile?.avatar_url} userName={profile?.full_name}>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-pmfit-text">Application Sessions</h1>
        <p className="text-[14px] text-pmfit-text-secondary mt-0.5">
          Track every auto-apply and confirmed submission made through PMFit.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-pmfit-blue/10 flex items-center justify-center mx-auto mb-4">
            <Zap size={28} className="text-pmfit-blue" />
          </div>
          <p className="text-[17px] font-bold text-pmfit-text mb-2">No application sessions yet</p>
          <p className="text-[14px] text-pmfit-text-secondary max-w-sm mx-auto">
            When PMFit auto-applies to a job on your behalf, the session will appear here. You can also manually trigger applications from the Jobs page.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const statusMeta = STATUS_META[session.status] ?? {
              label: session.status,
              icon:  Clock,
              class: "text-pmfit-text-muted",
            };
            const StatusIcon = statusMeta.icon;
            const job = session.jobs as { title: string; company: string; source_url: string | null } | null;

            return (
              <div key={session.id} className="card p-5">
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${statusMeta.class}`}>
                    <StatusIcon size={18} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold text-pmfit-text">
                          {job?.title ?? "Unknown role"}
                        </p>
                        <p className="text-[13px] text-pmfit-text-secondary">
                          {job?.company ?? "Unknown company"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[12px] font-semibold ${statusMeta.class}`}>
                          {statusMeta.label}
                        </span>
                        {session.ats_family && (
                          <span className="badge-gray text-[10px]">{session.ats_family}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px] text-pmfit-text-muted">
                      <span>Started {formatDate(session.started_at)}</span>
                      {session.submitted_at && (
                        <span>Submitted {formatDate(session.submitted_at)}</span>
                      )}
                      <span className="capitalize">
                        {session.session_type === "auto" ? "Auto-apply" : "Confirmed"}
                      </span>
                    </div>

                    {session.failure_reason && (
                      <p className="mt-2 text-[12px] text-pmfit-red bg-pmfit-red-subtle rounded-lg px-3 py-1.5">
                        {session.failure_reason}
                      </p>
                    )}

                    {session.rollback_available && (
                      <div className="mt-3">
                        <RollbackButton sessionId={session.id} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
