import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { KanbanBoard } from "@/components/tracker/KanbanBoard";

export default async function TrackerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  // Count active apps for the header badge
  const { count: activeCount } = await supabase
    .from("tracker_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("current_status", "in", "(closed_accepted,closed_rejected,closed_withdrawn)");

  return (
    <AppShell title="Application Tracker" avatarUrl={profile?.avatar_url} userName={profile?.full_name}>
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-pmfit-text">Job Tracker</h1>
          <p className="text-[14px] text-pmfit-text-secondary mt-0.5">
            {activeCount ?? 0} active applications · drag cards to update status
          </p>
        </div>
        <span className="ml-auto badge-blue text-[12px]">
          {activeCount ?? 0} Active
        </span>
      </div>
      <KanbanBoard userId={user.id} />
    </AppShell>
  );
}
