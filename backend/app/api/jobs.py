from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_current_user
from app.core.supabase import supabase_admin

router = APIRouter()


def _one(result):
    return result.data[0] if result.data else None


@router.get("/")
async def list_jobs(
    user=Depends(get_current_user),
    min_fit:       int       = Query(0, ge=0, le=100),
    max_fit:       int       = Query(100, ge=0, le=100),
    eligibility:   str | None = Query(None),
    seniority:     str | None = Query(None),
    remote:        bool | None = Query(None),
    board_category: str | None = Query(None),
    source_region:  str | None = Query(None),
    is_startup:     bool | None = Query(None),
    limit:  int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Return scored jobs for the current user, filtered and sorted by Fit Score."""

    # Two-step query: resolve array-column filters on jobs first, then filter job_scores
    needs_array_filter = any([board_category, source_region, is_startup is not None, remote is not None])
    filtered_job_ids: list[str] | None = None

    if needs_array_filter:
        jobs_q = supabase_admin.table("jobs").select("id")
        if board_category:
            jobs_q = jobs_q.contains("board_categories", [board_category])
        if source_region:
            jobs_q = jobs_q.contains("source_regions", [source_region])
        if is_startup is True:
            jobs_q = jobs_q.eq("is_startup", True)
        if remote is True:
            jobs_q = jobs_q.eq("remote_eligible", True)
        job_rows = jobs_q.execute().data or []
        if not job_rows:
            return {"data": [], "total": 0}
        filtered_job_ids = [j["id"] for j in job_rows]

    query = (
        supabase_admin.table("job_scores")
        .select(
            "fit_score, evidence_confidence, automation_eligibility, fit_explanation, "
            "score_breakdown, ineligibility_reason, automation_block_reason, scored_at, "
            "jobs(id, title, company, location, seniority_level, remote_eligible, "
            "     ats_family, domains, required_skills, posting_date, first_seen_at, "
            "     board_categories, source_regions, is_startup, is_remote_first)"
        )
        .eq("user_id", user.id)
        .gte("fit_score", min_fit)
        .lte("fit_score", max_fit)
        .order("fit_score", desc=True)
        .range(offset, offset + limit - 1)
    )

    if eligibility:
        query = query.eq("automation_eligibility", eligibility)
    if filtered_job_ids is not None:
        query = query.in_("job_id", filtered_job_ids)

    result = query.execute()
    return {"data": result.data, "total": len(result.data)}


@router.get("/{job_id}")
async def get_job(job_id: str, user=Depends(get_current_user)):
    """Get a single job with the user's score."""
    job = _one(supabase_admin.table("jobs").select("*").eq("id", job_id).limit(1).execute())
    if not job:
        raise HTTPException(404, "Job not found.")
    score = _one(
        supabase_admin.table("job_scores").select("*")
        .eq("user_id", user.id).eq("job_id", job_id).limit(1).execute()
    )
    return {"data": {"job": job, "score": score}}


@router.post("/{job_id}/tailor")
async def request_tailoring(job_id: str, user=Depends(get_current_user)):
    """Queue tailored resume + cover letter generation for a specific job."""
    profile = _one(
        supabase_admin.table("profiles").select("recovery_status")
        .eq("id", user.id).limit(1).execute()
    )
    if not profile or profile.get("recovery_status") != "complete":
        return {"error": "Resume Quality Recovery must complete before tailoring."}

    baseline = _one(
        supabase_admin.table("artifacts").select("id")
        .eq("user_id", user.id).eq("type", "baseline_resume")
        .order("created_at", desc=True).limit(1).execute()
    )
    if not baseline:
        return {"error": "No baseline resume found. Complete recovery first."}

    from app.workers.tasks import generate_tailored_draft, generate_cover_letter_draft
    generate_tailored_draft.delay(user.id, job_id, baseline["id"])
    generate_cover_letter_draft.delay(user.id, job_id)

    return {"data": {"status": "tailoring_queued", "job_id": job_id}}


@router.get("/{job_id}/artifacts")
async def get_job_artifacts(job_id: str, user=Depends(get_current_user)):
    """Get all generated artifacts for a job."""
    result = supabase_admin.table("artifacts").select(
        "id, type, version, storage_path, user_approved, approved_at, created_at"
    ).eq("user_id", user.id).eq("job_id", job_id).order("created_at", desc=True).execute()
    return {"data": result.data}


@router.get("/{job_id}/artifacts/{artifact_id}/url")
async def get_artifact_download_url(job_id: str, artifact_id: str, user=Depends(get_current_user)):
    """Return a short-lived signed download URL for an artifact."""
    artifact = _one(
        supabase_admin.table("artifacts").select("user_id, storage_path")
        .eq("id", artifact_id).eq("job_id", job_id).limit(1).execute()
    )
    if not artifact or artifact["user_id"] != user.id:
        raise HTTPException(403, "Artifact not found or access denied.")
    signed = supabase_admin.storage.from_("artifacts").create_signed_url(
        artifact["storage_path"], 300  # 5-minute expiry
    )
    return {"data": {"url": signed["signedURL"]}}
