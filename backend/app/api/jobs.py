from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.core.supabase import supabase_admin

router = APIRouter()


@router.get("/")
async def list_jobs(
    user=Depends(get_current_user),
    min_fit:   int  = Query(0, ge=0, le=100),
    max_fit:   int  = Query(100, ge=0, le=100),
    eligibility: str | None = Query(None),
    seniority:   str | None = Query(None),
    remote:      bool | None = Query(None),
    limit:  int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Return scored jobs for the current user, filtered and sorted by Fit Score."""
    query = (
        supabase_admin.table("job_scores")
        .select(
            "fit_score, evidence_confidence, automation_eligibility, fit_explanation, "
            "score_breakdown, ineligibility_reason, automation_block_reason, scored_at, "
            "jobs(id, title, company, location, seniority_level, remote_eligible, "
            "     ats_family, domains, required_skills, posting_date, first_seen_at)"
        )
        .eq("user_id", user.id)
        .gte("fit_score", min_fit)
        .lte("fit_score", max_fit)
        .order("fit_score", desc=True)
        .range(offset, offset + limit - 1)
    )

    if eligibility:
        query = query.eq("automation_eligibility", eligibility)

    result = query.execute()
    return {"data": result.data, "total": len(result.data)}


@router.get("/{job_id}")
async def get_job(job_id: str, user=Depends(get_current_user)):
    """Get a single job with the user's score."""
    job = supabase_admin.table("jobs").select("*").eq("id", job_id).maybe_single().execute()
    if not job.data:
        raise HTTPException(404, "Job not found.")
    score = supabase_admin.table("job_scores").select("*") \
            .eq("user_id", user.id).eq("job_id", job_id).maybe_single().execute()
    return {"data": {"job": job.data, "score": score.data}}


@router.post("/{job_id}/tailor")
async def request_tailoring(job_id: str, user=Depends(get_current_user)):
    """Queue tailored resume + cover letter generation for a specific job."""
    # Check recovery complete
    profile = supabase_admin.table("profiles").select("recovery_status") \
              .eq("id", user.id).maybe_single().execute().data
    if not profile or profile.get("recovery_status") != "complete":
        return {"error": "Resume Quality Recovery must complete before tailoring."}

    # Get baseline artifact
    baseline = supabase_admin.table("artifacts").select("id") \
               .eq("user_id", user.id).eq("type", "baseline_resume") \
               .order("created_at", desc=True).limit(1).maybe_single().execute()

    if not baseline.data:
        return {"error": "No baseline resume found. Complete recovery first."}

    from app.workers.tasks import generate_tailored_draft, generate_cover_letter_draft
    generate_tailored_draft.delay(user.id, job_id, baseline.data["id"])
    generate_cover_letter_draft.delay(user.id, job_id)

    return {"data": {"status": "tailoring_queued", "job_id": job_id}}


@router.get("/{job_id}/artifacts")
async def get_job_artifacts(job_id: str, user=Depends(get_current_user)):
    """Get all generated artifacts for a job."""
    result = supabase_admin.table("artifacts").select(
        "id, type, version, storage_path, user_approved, approved_at, created_at"
    ).eq("user_id", user.id).eq("job_id", job_id).order("created_at", desc=True).execute()
    return {"data": result.data}
