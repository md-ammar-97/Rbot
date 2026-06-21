import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import KanbanBoard from "@/components/tracker/KanbanBoard";

export default async function TrackerPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-apple-surface">
      <nav className="bg-white border-b border-apple-border px-6 h-14 flex items-center gap-6">
        <a href="/dashboard" className="text-[17px] font-semibold text-apple-text">RBot</a>
        <a href="/jobs"    className="text-[15px] text-apple-text-secondary hover:text-apple-text">Jobs</a>
        <a href="/tracker" className="text-[15px] font-medium text-apple-accent">Tracker</a>
        <a href="/profile" className="text-[15px] text-apple-text-secondary hover:text-apple-text">Profile</a>
      </nav>
      <main className="px-6 py-10">
        <h1 className="text-[28px] font-bold text-apple-text mb-8">Application Tracker</h1>
        <KanbanBoard userId={user.id} />
      </main>
    </div>
  );
}
