"""
All Celery background tasks for RBot.
Tasks are organized in pipeline order: ingestion → profile → recovery → discovery → scoring → drafting.
"""
import uuid
from app.workers.celery_app import celery_app
from app.core.supabase import supabase_admin


# ─── Sprint 1: Ingestion ──────────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def parse_resume(self, evidence_id: str, user_id: str, storage_path: str, content_type: str):
    """Download, extract text, and structure a resume file."""
    from app.integrations.groq_client import groq_chat

    try:
        file_bytes = supabase_admin.storage.from_("resume-uploads").download(storage_path)
        raw_text   = _extract_text(file_bytes, content_type)

        if len(raw_text.strip()) < 50:
            # Image-only PDF or empty file — mark and surface via recovery
            supabase_admin.table("raw_evidence").update({
                "parsed_content": {"full_text": "", "is_image_only": True,
                                   "extraction_method": "pymupdf"},
                "parse_confidence": 0.0,
                "parse_model": "none",
            }).eq("id", evidence_id).execute()
            build_profile_graph.delay(user_id)
            return

        # Pass 1: OCR cleanup
        cleaned = groq_chat(
            model="llama-3.1-8b-instant",
            system=(
                "Clean OCR artefacts from this resume text. Fix merged words, broken lines, "
                "and whitespace issues. Return only the corrected text. "
                "Do NOT add or remove any content."
            ),
            user=raw_text[:8000],
            temperature=0.1,
        )

        # Pass 2: Structure extraction
        structured = groq_chat(
            model="llama-3.1-8b-instant",
            system=(
                "Extract this resume into JSON with keys: "
                "contact (name, email, phone, linkedin), summary, "
                "experience (list of {title, company, start_date, end_date, description, achievements[]}), "
                "skills (list of strings), education (list of {institution, degree, graduation_year}). "
                "Return only valid JSON. Do NOT invent or infer any information not present."
            ),
            user=cleaned,
            temperature=0.1,
            json_mode=True,
        )

        supabase_admin.table("raw_evidence").update({
            "parsed_content": {
                "full_text":          cleaned,
                "sections":           structured,
                "extraction_method":  "pymupdf",
                "char_count":         len(cleaned),
                "is_image_only":      False,
            },
            "parse_confidence": 0.9,
            "parse_model":      "llama-3.1-8b-instant",
        }).eq("id", evidence_id).execute()

        build_profile_graph.delay(user_id)

    except Exception as exc:
        self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def parse_linkedin_export_task(self, evidence_id: str, user_id: str, storage_path: str):
    """Parse a LinkedIn export ZIP and store structured positions/skills."""
    from app.services.ingestion import parse_linkedin_export
    try:
        zip_bytes  = supabase_admin.storage.from_("linkedin-exports").download(storage_path)
        structured = parse_linkedin_export(zip_bytes)

        supabase_admin.table("raw_evidence").update({
            "parsed_content":   structured,
            "parse_confidence": 0.85,
            "parse_model":      "csv_parser",
        }).eq("id", evidence_id).execute()

        # Delete the ZIP — we only need the extracted CSV data; no reason to store the archive
        try:
            supabase_admin.storage.from_("linkedin-exports").remove([storage_path])
        except Exception:
            pass  # non-fatal; ZIP will linger but data is already saved

        build_profile_graph.delay(user_id)

    except ValueError as e:
        supabase_admin.table("raw_evidence").update({
            "parsed_content":   {"error": str(e)},
            "parse_confidence": 0.0,
        }).eq("id", evidence_id).execute()
    except Exception as exc:
        self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def ingest_github_repo(self, repo_id: str, user_id: str):
    """Fetch README and docs from a GitHub repo and create a raw_evidence record."""
    from app.integrations.github_client import fetch_evidence_files
    from app.services.ingestion import summarise_github_files
    try:
        repo  = supabase_admin.table("github_repos").select("*") \
                .eq("id", repo_id).single().execute().data
        token = None
        if repo.get("is_private") and repo.get("oauth_token_ref"):
            token = _get_vault_secret(repo["oauth_token_ref"])

        files = fetch_evidence_files(repo["owner"], repo["repo"], token)

        if not files:
            supabase_admin.table("github_repos").update({
                "extracted_files": [], "last_synced_at": "now()"
            }).eq("id", repo_id).execute()
            return

        summaries = summarise_github_files(files)

        evidence = supabase_admin.table("raw_evidence").insert({
            "user_id":          user_id,
            "source_type":      "github",
            "source_url":       f"https://github.com/{repo['owner']}/{repo['repo']}",
            "source_label":     f"GitHub: {repo['owner']}/{repo['repo']}",
            "parsed_content":   {"files": summaries},
            "parse_confidence": 0.85,
            "parse_model":      "llama-3.3-70b-versatile",
        }).execute()

        supabase_admin.table("github_repos").update({
            "extracted_files": [
                {
                    "path":                      f["path"],
                    "extracted_at":              "now()",
                    "included_in_evidence_id":   evidence.data[0]["id"],
                }
                for f in files
            ],
            "last_synced_at": "now()",
        }).eq("id", repo_id).execute()

        build_profile_graph.delay(user_id)

    except Exception as exc:
        self.retry(exc=exc)


# ─── Sprint 2: Profile Graph ──────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def build_profile_graph(self, user_id: str):
    """Merge all raw_evidence for a user into profiles.profile_graph."""
    from app.services.profile_graph import merge_evidence
    try:
        evidence_rows = supabase_admin.table("raw_evidence").select("*") \
                        .eq("user_id", user_id).execute().data

        if not evidence_rows:
            return

        graph = merge_evidence(user_id, evidence_rows)

        supabase_admin.table("profiles").update({
            "profile_graph": graph,
            "updated_at":    "now()",
        }).eq("id", user_id).execute()

        run_recovery_diagnosis.delay(user_id)

    except Exception as exc:
        self.retry(exc=exc)


# ─── Sprint 3: Recovery Engine ────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=2)
def run_recovery_diagnosis(self, user_id: str):
    """Run quality diagnosis and open a recovery case if any dimension fails."""
    from app.services.recovery_engine import diagnose_profile, open_recovery_case
    try:
        profile = supabase_admin.table("profiles").select("profile_graph, recovery_status") \
                  .eq("id", user_id).single().execute().data

        graph = (profile or {}).get("profile_graph") or {}
        if not graph:
            return

        diagnosis = diagnose_profile(graph)

        if not diagnosis["recovery_required"]:
            supabase_admin.table("profiles").update({
                "recovery_status": "complete",
            }).eq("id", user_id).execute()
            generate_baseline.delay(user_id)
        else:
            open_recovery_case(user_id, diagnosis)
            supabase_admin.table("profiles").update({
                "recovery_status": "in_progress",
            }).eq("id", user_id).execute()

    except Exception as exc:
        self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2)
def generate_baseline(self, user_id: str):
    """Generate the master baseline resume from the profile graph + recovery answers."""
    from app.services.drafting_engine import generate_baseline_resume, text_to_pdf
    from app.services.groundedness import check_groundedness
    from app.integrations.groq_client import prompt_hash, output_hash
    try:
        profile = supabase_admin.table("profiles").select("profile_graph") \
                  .eq("id", user_id).single().execute().data
        graph   = (profile or {}).get("profile_graph") or {}
        answers = supabase_admin.table("recovery_answers").select("*") \
                  .eq("user_id", user_id).execute().data or []

        resume_text = generate_baseline_resume(graph, answers)
        if not resume_text:
            return

        grounding = check_groundedness(resume_text, graph)

        if grounding["verdict"] == "fail":
            supabase_admin.table("policy_audit_log").insert({
                "user_id":      user_id,
                "action":       "generate_baseline_resume",
                "decision":     "block",
                "rule_matched": "fabrication",
                "reason":       (
                    f"Groundedness score {grounding['score']:.2f}. "
                    f"Ungrounded: {grounding['ungrounded_claims'][:3]}"
                ),
            }).execute()
            return

        # Log generation
        ph = prompt_hash("BASELINE_SYSTEM", str(graph)[:500])
        oh = output_hash(resume_text)
        log = supabase_admin.table("generation_log").insert({
            "user_id":         user_id,
            "generation_type": "baseline_resume",
            "model":           "llama-3.3-70b-versatile",
            "prompt_hash":     ph,
            "output_hash":     oh,
            "evidence_sources": [f"profile_graph:{user_id}"],
        }).execute()
        log_id = log.data[0]["id"]

        # Save PDF to Storage
        artifact_id  = str(uuid.uuid4())
        storage_path = f"{user_id}/baseline/{artifact_id}.pdf"
        pdf_bytes    = text_to_pdf(resume_text)
        supabase_admin.storage.from_("artifacts").upload(storage_path, pdf_bytes)

        supabase_admin.table("artifacts").insert({
            "id":               artifact_id,
            "user_id":          user_id,
            "type":             "baseline_resume",
            "storage_path":     storage_path,
            "evidence_sources": [f"profile_graph:{user_id}"],
            "generated_by_model": "llama-3.3-70b-versatile",
            "generation_log_id": log_id,
            "user_approved":    False,
        }).execute()

        supabase_admin.table("profiles").update({
            "recovery_status":       "complete",
            "recovery_completed_at": "now()",
        }).eq("id", user_id).execute()

        # Kick off job scoring for this user
        score_all_jobs.delay(user_id)

    except Exception as exc:
        self.retry(exc=exc)


# ─── Sprint 4: Discovery & Normalization ─────────────────────────────────────

@celery_app.task(bind=True)
def discover_and_normalize_jobs(self):
    """Triggered by n8n every 4 hours. Fetches from all boards and enqueues normalization."""
    from app.integrations.greenhouse_client    import fetch_jobs as gh_fetch,  DEFAULT_BOARDS
    from app.integrations.lever_client         import fetch_jobs as lv_fetch,  DEFAULT_COMPANIES
    from app.integrations.ashby_client         import fetch_jobs as ash_fetch, DEFAULT_COMPANIES as ASHBY_COMPANIES
    from app.integrations.smartrecruiters_client import fetch_jobs as sr_fetch, DEFAULT_COMPANIES as SR_COMPANIES
    from app.integrations.workable_client      import fetch_jobs as wk_fetch,  DEFAULT_COMPANIES as WORKABLE_COMPANIES
    from app.integrations.breezy_client        import fetch_jobs as br_fetch,  DEFAULT_COMPANIES as BREEZY_COMPANIES
    from app.integrations.teamtailor_client    import fetch_jobs as tt_fetch,  DEFAULT_COMPANIES as TT_COMPANIES
    from app.integrations.jazzhr_client        import fetch_jobs as jz_fetch,  DEFAULT_COMPANIES as JAZZ_COMPANIES
    from app.integrations.remoteok_client      import fetch_jobs as rok_fetch
    from app.integrations.remotive_client      import fetch_jobs as rmt_fetch
    from app.integrations.wellfound_client     import fetch_jobs as wf_fetch
    from app.integrations.personio_client      import fetch_jobs as prs_fetch
    from app.integrations.reed_client          import fetch_jobs as rd_fetch
    from app.integrations.apify_client         import fetch_indeed_jobs, fetch_linkedin_jobs

    def _upsert_and_queue(raw_job: dict) -> None:
        result = supabase_admin.table("raw_jobs").upsert(
            raw_job, on_conflict="source,source_job_id"
        ).execute()
        if result.data:
            normalize_raw_job.delay(result.data[0]["id"])

    # ── Slug-based ATS boards ──────────────────────────────────────────────────
    for board_token in DEFAULT_BOARDS:
        try:
            for raw_job in gh_fetch(board_token):
                _upsert_and_queue(raw_job)
        except Exception:
            continue

    for company_slug in DEFAULT_COMPANIES:
        try:
            for raw_job in lv_fetch(company_slug):
                _upsert_and_queue(raw_job)
        except Exception:
            continue

    for company_slug in ASHBY_COMPANIES:
        try:
            for raw_job in ash_fetch(company_slug):
                _upsert_and_queue(raw_job)
        except Exception:
            continue

    for company_slug in SR_COMPANIES:
        try:
            for raw_job in sr_fetch(company_slug):
                _upsert_and_queue(raw_job)
        except Exception:
            continue

    for company_slug in WORKABLE_COMPANIES:
        try:
            for raw_job in wk_fetch(company_slug):
                _upsert_and_queue(raw_job)
        except Exception:
            continue

    for company_slug in BREEZY_COMPANIES:
        try:
            for raw_job in br_fetch(company_slug):
                _upsert_and_queue(raw_job)
        except Exception:
            continue

    for company_slug in TT_COMPANIES:
        try:
            for raw_job in tt_fetch(company_slug):
                _upsert_and_queue(raw_job)
        except Exception:
            continue

    for company_slug in JAZZ_COMPANIES:
        try:
            for raw_job in jz_fetch(company_slug):
                _upsert_and_queue(raw_job)
        except Exception:
            continue

    # ── Single-endpoint boards (no slug) ──────────────────────────────────────
    for fetcher_fn in (rok_fetch, rmt_fetch, wf_fetch, prs_fetch, rd_fetch):
        try:
            for raw_job in fetcher_fn():
                _upsert_and_queue(raw_job)
        except Exception:
            continue

    # ── Per-user Apify scraping (Indeed + LinkedIn) ───────────────────────────
    users_with_apify = supabase_admin.table("profiles").select("id, apify_api_key") \
                       .not_.is_("apify_api_key", "null").execute().data or []
    for u in users_with_apify:
        for fetcher in (fetch_indeed_jobs, fetch_linkedin_jobs):
            try:
                for raw_job in fetcher(u["apify_api_key"]):
                    _upsert_and_queue(raw_job)
            except Exception:
                continue


@celery_app.task(bind=True, max_retries=2)
def normalize_raw_job(self, raw_job_id: str):
    """Normalise a single raw_job record and upsert into the canonical jobs table."""
    from app.services.normalization import normalise_raw_job
    try:
        canonical_id = normalise_raw_job(raw_job_id)
        if canonical_id:
            # Score this new job for all users with complete recovery
            users = supabase_admin.table("profiles").select("id") \
                    .eq("recovery_status", "complete").execute().data or []
            for u in users:
                score_jobs_for_user.delay(u["id"], canonical_id)
    except Exception as exc:
        self.retry(exc=exc)


# ─── Sprint 5: Scoring ────────────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=2)
def score_jobs_for_user(self, user_id: str, job_id: str):
    """Score a single (user, job) pair."""
    from app.services.scoring import score_job_for_user
    try:
        score_job_for_user(user_id, job_id)
    except Exception as exc:
        self.retry(exc=exc)


@celery_app.task(bind=True)
def score_all_jobs(self, user_id: str):
    """Score all canonical jobs for a newly recovered user."""
    try:
        jobs = supabase_admin.table("jobs").select("id").eq("quarantine", False).execute().data or []
        for job in jobs:
            score_jobs_for_user.delay(user_id, job["id"])
    except Exception:
        pass


# ─── Sprint 6: Drafting ───────────────────────────────────────────────────────

@celery_app.task(bind=True, max_retries=2)
def generate_tailored_draft(self, user_id: str, job_id: str, baseline_artifact_id: str):
    """Generate a tailored resume for a specific job."""
    from app.services.drafting_engine import generate_tailored_resume, text_to_pdf
    from app.integrations.groq_client import prompt_hash, output_hash
    try:
        # Fetch baseline text from Storage
        baseline = supabase_admin.table("artifacts").select("storage_path") \
                   .eq("id", baseline_artifact_id).single().execute().data
        if not baseline:
            return

        pdf_bytes    = supabase_admin.storage.from_("artifacts").download(baseline["storage_path"])
        baseline_text = pdf_bytes.decode("utf-8", errors="replace")

        profile = supabase_admin.table("profiles").select("profile_graph") \
                  .eq("id", user_id).single().execute().data
        graph   = (profile or {}).get("profile_graph") or {}
        job     = supabase_admin.table("jobs").select("*").eq("id", job_id).single().execute().data

        result = generate_tailored_resume(baseline_text, job, graph)

        if result["groundedness"]["verdict"] == "fail":
            supabase_admin.table("policy_audit_log").insert({
                "user_id": user_id, "job_id": job_id,
                "action": "generate_tailored_resume", "decision": "block",
                "rule_matched": "fabrication",
                "reason": f"Groundedness {result['groundedness']['score']:.2f}",
            }).execute()
            return

        ph       = prompt_hash("TAILORING_SYSTEM", job_id)
        oh       = output_hash(result["text"])
        log      = supabase_admin.table("generation_log").insert({
            "user_id": user_id, "job_id": job_id,
            "generation_type": "tailored_resume",
            "model": "llama-3.3-70b-versatile",
            "prompt_hash": ph, "output_hash": oh,
            "evidence_sources": [f"artifact:{baseline_artifact_id}", f"job:{job_id}"],
        }).execute()

        artifact_id  = str(uuid.uuid4())
        storage_path = f"{user_id}/tailored/{artifact_id}.pdf"
        supabase_admin.storage.from_("artifacts").upload(
            storage_path, text_to_pdf(result["text"])
        )
        supabase_admin.table("artifacts").insert({
            "id": artifact_id, "user_id": user_id, "job_id": job_id,
            "type": "tailored_resume", "storage_path": storage_path,
            "storage_bucket": "artifacts",
            "evidence_sources": [f"artifact:{baseline_artifact_id}", f"job:{job_id}"],
            "generated_by_model": "llama-3.3-70b-versatile",
            "generation_log_id": log.data[0]["id"],
        }).execute()

    except Exception as exc:
        self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2)
def generate_cover_letter_draft(self, user_id: str, job_id: str):
    """Generate a cover letter for a specific job."""
    from app.services.drafting_engine import generate_cover_letter
    from app.integrations.groq_client import prompt_hash, output_hash
    try:
        profile = supabase_admin.table("profiles").select("profile_graph") \
                  .eq("id", user_id).single().execute().data
        graph   = (profile or {}).get("profile_graph") or {}
        job     = supabase_admin.table("jobs").select("*").eq("id", job_id).single().execute().data

        result = generate_cover_letter(graph, job)

        if result["groundedness"]["verdict"] == "fail":
            return  # Block silently; policy log written by service

        ph  = prompt_hash("COVER_LETTER_SYSTEM", job_id)
        oh  = output_hash(result["text"])
        log = supabase_admin.table("generation_log").insert({
            "user_id": user_id, "job_id": job_id,
            "generation_type": "cover_letter",
            "model": "llama-3.3-70b-versatile",
            "prompt_hash": ph, "output_hash": oh,
            "evidence_sources": [f"profile_graph:{user_id}", f"job:{job_id}"],
        }).execute()

        artifact_id  = str(uuid.uuid4())
        storage_path = f"{user_id}/cover_letters/{artifact_id}.pdf"
        from app.services.drafting_engine import text_to_pdf
        supabase_admin.storage.from_("artifacts").upload(
            storage_path, text_to_pdf(result["text"])
        )
        supabase_admin.table("artifacts").insert({
            "id": artifact_id, "user_id": user_id, "job_id": job_id,
            "type": "cover_letter", "storage_path": storage_path,
            "storage_bucket": "artifacts",
            "evidence_sources": [f"profile_graph:{user_id}", f"job:{job_id}"],
            "generated_by_model": "llama-3.3-70b-versatile",
            "generation_log_id": log.data[0]["id"],
        }).execute()

    except Exception as exc:
        self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2)
def generate_outreach_draft(self, user_id: str, job_id: str, recipient: dict):
    """Generate a LinkedIn or email outreach draft."""
    from app.services.drafting_engine import generate_outreach
    try:
        profile = supabase_admin.table("profiles").select("profile_graph") \
                  .eq("id", user_id).single().execute().data
        graph   = (profile or {}).get("profile_graph") or {}
        job     = supabase_admin.table("jobs").select("*").eq("id", job_id).single().execute().data

        result = generate_outreach(graph, job, recipient)

        supabase_admin.table("outreach_drafts").insert({
            "user_id":           user_id,
            "job_id":            job_id,
            "draft_type":        "outreach_linkedin",
            "recipient_name":    recipient.get("name"),
            "recipient_role":    recipient.get("role"),
            "recipient_company": recipient.get("company"),
            "body":              result["text"],
            "character_count":   result["character_count"],
            "evidence_sources":  [f"profile_graph:{user_id}"],
        }).execute()

    except Exception as exc:
        self.retry(exc=exc)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _extract_text(file_bytes: bytes, content_type: str) -> str:
    """Extract plain text from PDF, DOCX, or plain text bytes."""
    import io
    if content_type == "application/pdf":
        import fitz  # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)
    elif "wordprocessingml" in content_type:
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs)
    else:
        return file_bytes.decode("utf-8", errors="replace")


def _get_vault_secret(secret_ref: str) -> str | None:
    """Retrieve a secret from Supabase Vault by reference. Stub for Phase 1."""
    # TODO: Implement actual Supabase Vault retrieval
    # https://supabase.com/docs/guides/database/vault
    return None
