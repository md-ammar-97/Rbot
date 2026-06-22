import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Search, FileText, Kanban, ArrowRight, AlertCircle } from "lucide-react";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, recovery_status, onboarding_complete, profile_graph")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_complete) redirect("/onboarding");

  const { count: activeApps } = await supabase
    .from("tracker_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("current_status", "in", "(closed_accepted,closed_rejected,closed_withdrawn)");

  const { count: totalJobs } = await supabase
    .from("job_scores")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("fit_score", 60);

  const completeness   = Math.round((profile?.profile_graph?.profile_completeness ?? 0) * 100);
  const recoveryDone   = profile?.recovery_status === "complete";
  const firstName      = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <AppShell title="Dashboard" avatarUrl={profile?.avatar_url} userName={profile?.full_name}>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-[32px] font-bold text-pmfit-text">
          Welcome back, {firstName}.
        </h1>
        <p className="text-[16px] text-pmfit-text-secondary mt-1">
          Your PM job search co-pilot is ready.
        </p>
      </div>

      {/* Recovery banner */}
      {!recoveryDone && (
        <div className="mb-6 rounded-2xl border border-pmfit-orange/30 bg-pmfit-orange-subtle p-5 flex items-start gap-4">
          <AlertCircle size={20} className="text-pmfit-orange shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-pmfit-text">Resume Quality Recovery in progress</p>
            <p className="text-[14px] text-pmfit-text-secondary mt-0.5">
              Complete recovery to unlock job matching, tailored drafts, and applications.
            </p>
          </div>
          <Link href="/profile" className="btn-primary text-[13px] h-9 px-4 shrink-0">
            Continue <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {/* Profile completeness */}
        <div className="card p-6 flex flex-col items-center text-center">
          <CircularProgress
            value={completeness}
            size={130}
            sublabel="Profile complete"
          />
          <p className="mt-4 text-[13px] font-semibold text-pmfit-text-secondary uppercase tracking-wide">
            Profile Quality
          </p>
        </div>

        {/* Active applications */}
        <div className="card p-6 flex flex-col justify-center text-center">
          <p className="text-[52px] font-bold text-pmfit-blue leading-none">
            <AnimatedCounter target={activeApps ?? 0} />
          </p>
          <p className="mt-2 text-[14px] font-semibold text-pmfit-text-secondary">Active Applications</p>
          <p className="text-[12px] text-pmfit-text-muted mt-0.5">Across all pipeline stages</p>
          <Link href="/tracker" className="mt-4 text-[13px] text-pmfit-blue hover:underline font-medium">
            View Tracker →
          </Link>
        </div>

        {/* Good-fit jobs */}
        <div className="card p-6 flex flex-col justify-center text-center">
          <p className="text-[52px] font-bold text-pmfit-purple leading-none">
            <AnimatedCounter target={totalJobs ?? 0} />
          </p>
          <p className="mt-2 text-[14px] font-semibold text-pmfit-text-secondary">Roles ≥ 60 Fit</p>
          <p className="text-[12px] text-pmfit-text-muted mt-0.5">Scored for you, updated every 4 hrs</p>
          <Link href="/jobs" className="mt-4 text-[13px] text-pmfit-blue hover:underline font-medium">
            Browse Jobs →
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <h2 className="text-[18px] font-bold text-pmfit-text mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: Search,
            label: "Job Discovery",
            desc: "PM roles scored and ranked for you",
            href: "/jobs",
            color: "text-pmfit-blue bg-pmfit-blue-subtle",
          },
          {
            icon: Kanban,
            label: "Application Tracker",
            desc: "Track every stage of your pipeline",
            href: "/tracker",
            color: "text-pmfit-purple bg-pmfit-purple-subtle",
          },
          {
            icon: FileText,
            label: "Resume Recovery",
            desc: "Profile quality and evidence sources",
            href: "/profile",
            color: "text-pmfit-teal bg-pmfit-teal-subtle",
          },
        ].map(({ icon: Icon, label, desc, href, color }) => (
          <Link
            key={href}
            href={href}
            className="card-hover p-5 flex items-start gap-4 group"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-pmfit-text group-hover:text-pmfit-blue transition-colors">
                {label}
              </p>
              <p className="text-[13px] text-pmfit-text-secondary mt-0.5">{desc}</p>
            </div>
            <ArrowRight size={16} className="ml-auto text-pmfit-text-muted group-hover:text-pmfit-blue transition-colors shrink-0 mt-0.5" />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
