import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.supabase import supabase_admin
from app.workers.tasks import (
    parse_resume,
    parse_linkedin_export_task,
    ingest_github_repo,
)

router = APIRouter()

ALLOWED_RESUME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}

MAX_RESUME_SIZE  = 10 * 1024 * 1024   # 10 MB
MAX_LINKEDIN_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/resume")
async def upload_resume(file: UploadFile = File(...), user=Depends(get_current_user)):
    if file.content_type not in ALLOWED_RESUME_TYPES:
        raise HTTPException(422, "Unsupported file type. Upload PDF, DOCX, or TXT.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(422, "The uploaded file appears to be empty.")
    if len(content) > MAX_RESUME_SIZE:
        raise HTTPException(422, "File too large. Maximum size is 10 MB.")

    storage_path = f"{user.id}/{uuid.uuid4()}/{file.filename}"
    supabase_admin.storage.from_("resume-uploads").upload(
        path=storage_path,
        file=content,
        file_options={"content-type": file.content_type},
    )

    evidence = supabase_admin.table("raw_evidence").insert({
        "user_id":       user.id,
        "source_type":   "resume",
        "source_label":  f"Resume — {file.filename}",
        "raw_file_path": storage_path,
        "parsed_content": {},
    }).execute()

    parse_resume.delay(
        evidence.data[0]["id"], user.id, storage_path, file.content_type
    )

    return {"data": {"evidence_id": evidence.data[0]["id"], "status": "parsing"}}


@router.post("/linkedin")
async def upload_linkedin_export(file: UploadFile = File(...), user=Depends(get_current_user)):
    if file.content_type not in ("application/zip", "application/x-zip-compressed"):
        raise HTTPException(422, "Upload the LinkedIn export as a .zip file.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(422, "The uploaded file appears to be empty.")
    if len(content) > MAX_LINKEDIN_SIZE:
        raise HTTPException(422, "File too large. Maximum size is 50 MB.")

    storage_path = f"{user.id}/{uuid.uuid4()}/linkedin_export.zip"
    supabase_admin.storage.from_("linkedin-exports").upload(
        path=storage_path,
        file=content,
        file_options={"content-type": "application/zip"},
    )

    evidence = supabase_admin.table("raw_evidence").insert({
        "user_id":       user.id,
        "source_type":   "linkedin_export",
        "source_label":  "LinkedIn Export",
        "raw_file_path": storage_path,
        "parsed_content": {},
    }).execute()

    parse_linkedin_export_task.delay(evidence.data[0]["id"], user.id, storage_path)

    return {"data": {"evidence_id": evidence.data[0]["id"], "status": "parsing"}}


class GitHubRepoPayload(BaseModel):
    owner:      str
    repo:       str
    is_private: bool = False


@router.post("/github")
async def add_github_repo(payload: GitHubRepoPayload, user=Depends(get_current_user)):
    # Check if already connected — use limit(1) to avoid maybe_single() returning None
    existing_res = supabase_admin.table("github_repos").select("id") \
                  .eq("user_id", user.id) \
                  .eq("owner", payload.owner) \
                  .eq("repo", payload.repo).limit(1).execute()
    existing = existing_res.data[0] if existing_res.data else None

    if existing:
        # Re-sync
        ingest_github_repo.delay(existing["id"], user.id)
        return {"data": {"repo_id": existing["id"], "status": "resync_queued"}}

    repo = supabase_admin.table("github_repos").insert({
        "user_id":    user.id,
        "owner":      payload.owner,
        "repo":       payload.repo,
        "is_private": payload.is_private,
    }).execute()

    ingest_github_repo.delay(repo.data[0]["id"], user.id)
    return {"data": {"repo_id": repo.data[0]["id"], "status": "ingestion_queued"}}


@router.post("/discover")
async def trigger_discovery(user=Depends(get_current_user)):
    """Queue a full job discovery run. Can be called from the Settings page."""
    from app.workers.tasks import discover_and_normalize_jobs
    discover_and_normalize_jobs.delay()
    return {"data": {"status": "discovery_queued"}}


@router.get("/evidence")
async def list_evidence(user=Depends(get_current_user)):
    result = supabase_admin.table("raw_evidence").select(
        "id, source_type, source_label, parse_confidence, created_at"
    ).eq("user_id", user.id).order("created_at", desc=True).execute()
    return {"data": result.data}
