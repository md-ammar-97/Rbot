import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, target_roles, target_locations, remote_preference, work_authorization, sponsorship_required, compensation_min, compensation_max, search_intent, auto_apply_enabled, apify_api_key, github_token")
    .eq("id", user.id)
    .single();

  const { data: blacklist } = await supabase
    .from("blacklisted_companies")
    .select("id, company_name, company_website, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell title="Settings" avatarUrl={profile?.avatar_url} userName={profile?.full_name}>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-pmfit-text">Settings</h1>
        <p className="text-[14px] text-pmfit-text-secondary mt-0.5">
          Manage your profile, job preferences, and integrations.
        </p>
      </div>
      <SettingsClient profile={profile ?? {}} blacklist={blacklist ?? []} />
    </AppShell>
  );
}
