import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, recovery_status, onboarding_complete")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_complete) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-apple-surface">
      <nav className="bg-white border-b border-apple-border px-6 h-14 flex items-center justify-between">
        <span className="text-[17px] font-semibold text-apple-text">RBot</span>
        <div className="flex items-center gap-6">
          <Link href="/jobs"    className="text-[15px] text-apple-text-secondary hover:text-apple-text">Jobs</Link>
          <Link href="/tracker" className="text-[15px] text-apple-text-secondary hover:text-apple-text">Tracker</Link>
          <Link href="/profile" className="text-[15px] text-apple-text-secondary hover:text-apple-text">Profile</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-[32px] font-bold text-apple-text mb-2">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-[17px] text-apple-text-secondary mb-10">
          Your PM job search, simplified.
        </p>

        {profile?.recovery_status !== "complete" && (
          <div className="card p-6 mb-8 bg-apple-warning-subtle border-apple-warning/30">
            <p className="text-[15px] font-semibold text-apple-text mb-1">
              Resume Quality Recovery in progress
            </p>
            <p className="text-[14px] text-apple-text-secondary mb-3">
              Complete recovery before job matching and applications are unlocked.
            </p>
            <Link href="/profile" className="btn-primary text-[14px] h-9 px-4 inline-flex items-center">
              Continue Recovery →
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/jobs" className="card p-6 hover:shadow-md transition-shadow">
            <p className="text-[13px] font-semibold text-apple-accent tracking-wide mb-2">JOBS</p>
            <p className="text-[20px] font-semibold text-apple-text mb-1">Discover Roles</p>
            <p className="text-[14px] text-apple-text-secondary">PM roles scored and ranked for you</p>
          </Link>
          <Link href="/tracker" className="card p-6 hover:shadow-md transition-shadow">
            <p className="text-[13px] font-semibold text-apple-accent tracking-wide mb-2">TRACKER</p>
            <p className="text-[20px] font-semibold text-apple-text mb-1">Application Tracker</p>
            <p className="text-[14px] text-apple-text-secondary">Track every application through the pipeline</p>
          </Link>
          <Link href="/profile" className="card p-6 hover:shadow-md transition-shadow">
            <p className="text-[13px] font-semibold text-apple-accent tracking-wide mb-2">PROFILE</p>
            <p className="text-[20px] font-semibold text-apple-text mb-1">Your Profile</p>
            <p className="text-[14px] text-apple-text-secondary">Resume, evidence, and recovery status</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
