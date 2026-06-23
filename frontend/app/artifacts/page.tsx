import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { OutreachTab } from "@/components/artifacts/OutreachTab";
import { ArrowRight, ScrollText } from "lucide-react";

type ArtifactType = "baseline_resume" | "tailored_resume" | "cover_letter";

interface Artifact {
  id:             string;
  type:           ArtifactType;
  version:        number;
  storage_path:   string;
  storage_bucket: string | null;
  job_id:         string | null;
  created_at:     string;
  jobs:           { title: string; company: string } | null;
}

interface OutreachDraft {
  id:                string;
  job_id:            string | null;
  recipient_name:    string | null;
  recipient_company: string | null;
  recipient_role:    string | null;
  body:              string | null;
  character_count:   number | null;
  created_at:        string;
  user_sent:         boolean;
  sent_at:           string | null;
  jobs:              { title: string } | null;
}

interface ScoredJob {
  job_id: string;
  jobs:   { id: string; title: string; company: string } | null;
}

export default async function ArtifactsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, recovery_status")
    .eq("id", user.id)
    .single();

  const activeTab = searchParams.tab === "outreach" ? "outreach" : "documents";

  // Fetch artifacts + signed URLs
  const { data: rawArtifacts } = await supabase
    .from("artifacts")
    .select("id, type, version, storage_path, storage_bucket, job_id, created_at, jobs(title, company)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const artifacts: Artifact[] = (rawArtifacts ?? []) as Artifact[];

  // Generate signed URLs for all artifacts
  const artifactsWithUrls = await Promise.all(
    artifacts.map(async (a) => {
      const bucket = a.storage_bucket ?? "artifacts";
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(a.storage_path, 1800); // 30-min expiry
      return { ...a, signedUrl: data?.signedUrl ?? null };
    })
  );

  // Fetch outreach drafts
  const { data: rawDrafts } = await supabase
    .from("outreach_drafts")
    .select("id, job_id, recipient_name, recipient_company, recipient_role, body, character_count, created_at, user_sent, sent_at, jobs(title)")
    .eq("user_id", user.id)
    .eq("user_discarded", false)
    .order("created_at", { ascending: false });

  const drafts: OutreachDraft[] = (rawDrafts ?? []) as OutreachDraft[];

  // Fetch recent scored jobs for outreach form picker
  const { data: rawScored } = await supabase
    .from("job_scores")
    .select("job_id, jobs(id, title, company)")
    .eq("user_id", user.id)
    .gte("fit_score", 50)
    .order("fit_score", { ascending: false })
    .limit(20);

  const recentJobs = ((rawScored ?? []) as ScoredJob[])
    .map((s) => s.jobs)
    .filter((j): j is { id: string; title: string; company: string } => j !== null);

  const recoveryDone = profile?.recovery_status === "complete";

  return (
    <AppShell title="Documents" avatarUrl={profile?.avatar_url} userName={profile?.full_name}>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-pmfit-text">Generated Documents</h1>
        <p className="text-[14px] text-pmfit-text-secondary mt-0.5">
          Your baseline resume, tailored resumes, cover letters, and outreach drafts.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-pmfit-border">
        {[
          { key: "documents", label: `Documents (${artifacts.length})` },
          { key: "outreach",  label: `Outreach (${drafts.length})` },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={`/artifacts?tab=${key}`}
            className={`px-4 py-2.5 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? "border-pmfit-blue text-pmfit-blue"
                : "border-transparent text-pmfit-text-secondary hover:text-pmfit-text"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Documents tab */}
      {activeTab === "documents" && (
        <>
          {!recoveryDone && artifacts.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-pmfit-blue/10 flex items-center justify-center mx-auto mb-4">
                <ScrollText size={28} className="text-pmfit-blue" />
              </div>
              <p className="text-[17px] font-bold text-pmfit-text mb-2">No documents yet</p>
              <p className="text-[14px] text-pmfit-text-secondary max-w-sm mx-auto mb-5">
                Complete your profile recovery to generate your baseline resume. Documents will appear here automatically.
              </p>
              <Link href="/profile" className="btn-primary h-10 px-6 text-[14px] inline-flex items-center gap-2">
                Go to Recovery <ArrowRight size={15} />
              </Link>
            </div>
          ) : artifacts.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-[15px] font-semibold text-pmfit-text mb-2">No documents yet</p>
              <p className="text-[13px] text-pmfit-text-secondary">
                Your baseline resume is being generated. Check back in a moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {artifactsWithUrls.map((a) => (
                <ArtifactCard
                  key={a.id}
                  id={a.id}
                  type={a.type}
                  version={a.version}
                  storagePath={a.storage_path}
                  jobTitle={(a.jobs as { title: string; company: string } | null)?.title ?? null}
                  jobCompany={(a.jobs as { title: string; company: string } | null)?.company ?? null}
                  createdAt={a.created_at}
                  signedUrl={a.signedUrl}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Outreach tab */}
      {activeTab === "outreach" && (
        <OutreachTab
          initialDrafts={drafts}
          recentJobs={recentJobs}
        />
      )}
    </AppShell>
  );
}
