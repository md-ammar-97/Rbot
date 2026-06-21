import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: evidence } = await supabase
    .from("raw_evidence")
    .select("id, source_type, source_label, parse_confidence, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: baseline } = await supabase
    .from("artifacts")
    .select("id, type, storage_path, created_at")
    .eq("user_id", user.id)
    .eq("type", "baseline_resume")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const recoveryColor =
    profile?.recovery_status === "complete"
      ? "text-apple-success"
      : profile?.recovery_status === "in_progress"
      ? "text-apple-warning"
      : "text-apple-text-secondary";

  return (
    <div className="min-h-screen bg-apple-surface">
      <nav className="bg-white border-b border-apple-border px-6 h-14 flex items-center gap-6">
        <Link href="/dashboard" className="text-[17px] font-semibold text-apple-text">RBot</Link>
        <Link href="/jobs"    className="text-[15px] text-apple-text-secondary hover:text-apple-text">Jobs</Link>
        <Link href="/tracker" className="text-[15px] text-apple-text-secondary hover:text-apple-text">Tracker</Link>
        <Link href="/profile" className="text-[15px] font-medium text-apple-accent">Profile</Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-[28px] font-bold text-apple-text">Your Profile</h1>

        {/* Recovery status */}
        <div className="card p-6">
          <p className="text-[13px] font-semibold text-apple-text-secondary uppercase tracking-wide mb-3">
            Resume Quality Recovery
          </p>
          <p className={`text-[20px] font-semibold ${recoveryColor}`}>
            {profile?.recovery_status === "complete"
              ? "Complete"
              : profile?.recovery_status === "in_progress"
              ? "In Progress"
              : "Pending"}
          </p>
          {profile?.recovery_completed_at && (
            <p className="text-[13px] text-apple-text-tertiary mt-1">
              Completed {new Date(profile.recovery_completed_at).toLocaleDateString()}
            </p>
          )}
          {profile?.recovery_status !== "complete" && (
            <Link href="/onboarding" className="mt-3 btn-primary text-[14px] h-9 px-4 inline-flex items-center">
              Continue Recovery →
            </Link>
          )}
          {baseline && (
            <p className="mt-3 text-[13px] text-apple-success font-medium">
              ✓ Baseline resume generated
            </p>
          )}
        </div>

        {/* Evidence sources */}
        <div className="card p-6">
          <p className="text-[13px] font-semibold text-apple-text-secondary uppercase tracking-wide mb-4">
            Evidence Sources
          </p>
          {(!evidence || evidence.length === 0) ? (
            <p className="text-[15px] text-apple-text-secondary">No evidence uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {evidence.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-medium text-apple-text">{ev.source_label}</p>
                    <p className="text-[13px] text-apple-text-tertiary">
                      {ev.source_type} · {new Date(ev.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-[12px] px-2 py-1 rounded-lg border font-medium ${
                      (ev.parse_confidence ?? 0) >= 0.8
                        ? "text-apple-success bg-apple-success-subtle border-apple-success/20"
                        : "text-apple-warning bg-apple-warning-subtle border-apple-warning/20"
                    }`}
                  >
                    {Math.round((ev.parse_confidence ?? 0) * 100)}% confidence
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/onboarding"
            className="mt-5 inline-flex items-center text-[14px] text-apple-accent hover:underline font-medium"
          >
            + Add more evidence
          </Link>
        </div>

        {/* Job preferences */}
        <div className="card p-6">
          <p className="text-[13px] font-semibold text-apple-text-secondary uppercase tracking-wide mb-4">
            Job Preferences
          </p>
          <dl className="grid grid-cols-2 gap-4">
            {[
              ["Target Roles",      (profile?.target_roles || []).join(", ") || "Not set"],
              ["Locations",         (profile?.target_locations || []).join(", ") || "Not set"],
              ["Remote",            profile?.remote_preference || "Not set"],
              ["Work Authorization", profile?.work_authorization || "Not set"],
              ["Sponsorship",       profile?.sponsorship_required ? "Required" : "Not required"],
              ["Auto-Apply",        profile?.auto_apply_enabled ? "Enabled" : "Disabled"],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-[12px] text-apple-text-secondary font-medium">{label}</dt>
                <dd className="text-[14px] text-apple-text mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </main>
    </div>
  );
}
