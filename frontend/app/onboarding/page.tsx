import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

interface Props {
  searchParams: { force?: string; step?: string };
}

export default async function OnboardingPage({ searchParams }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, recovery_status, full_name")
    .eq("id", user.id)
    .single();

  // Redirect to dashboard only if onboarding is complete AND the user
  // didn't arrive via a force=true or step= link from the profile page.
  const isForced = searchParams.force === "true" || Boolean(searchParams.step);
  if (profile?.onboarding_complete && !isForced) redirect("/dashboard");

  return (
    <OnboardingFlow
      user={{ id: user.id, email: user.email!, name: profile?.full_name }}
      recoveryStatus={profile?.recovery_status ?? "pending"}
      initialStep={searchParams.step}
    />
  );
}
