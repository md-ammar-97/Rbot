import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.supabase import supabase_admin
from app.services.tracker import advance_tracker, add_note

logger = logging.getLogger(__name__)

router = APIRouter()


def _one(result):
    return result.data[0] if result.data else None


@router.get("/")
async def get_tracker(user=Depends(get_current_user)):
    """Return all tracker items with job info and fit score."""
    result = supabase_admin.table("tracker_items").select(
        "id, job_id, current_status, last_updated, stale_flag, auto_apply_enabled, created_at, "
        "jobs(id, title, company, location, seniority_level, ats_family, remote_eligible)"
    ).eq("user_id", user.id).order("last_updated", desc=True).execute()

    items = result.data or []
    if not items:
        return {"data": []}

    job_ids = [item["job_id"] for item in items if item.get("job_id")]
    scores_result = supabase_admin.table("job_scores").select(
        "job_id, fit_score, evidence_confidence, automation_eligibility"
    ).eq("user_id", user.id).in_("job_id", job_ids).execute()

    scores_by_job = {s["job_id"]: s for s in (scores_result.data or [])}
    for item in items:
        item["job_scores"] = scores_by_job.get(item["job_id"])

    return {"data": items}


class StatusUpdate(BaseModel):
    job_id:     str
    new_status: str
    note:       str | None = None


@router.patch("/{item_id}/status")
async def update_status(item_id: str, payload: StatusUpdate, user=Depends(get_current_user)):
    """Manually advance a tracker item to a new status."""
    item = _one(
        supabase_admin.table("tracker_items").select("user_id")
        .eq("id", item_id).limit(1).execute()
    )
    if not item or item["user_id"] != user.id:
        raise HTTPException(403, "Item not found or access denied.")

    advance_tracker(
        user.id, payload.job_id, payload.new_status,
        source="user", metadata={"note": payload.note or ""}
    )
    return {"data": {"status": "updated", "new_status": payload.new_status}}


class ManualJobPayload(BaseModel):
    title:           str
    company:         str
    application_date: str           # ISO date, e.g. "2026-06-23"
    job_description: str | None = None


@router.post("/manual")
async def add_manual_job(payload: ManualJobPayload, user=Depends(get_current_user)):
    """Create a jobs row + tracker_items row for a job applied to outside PMFit."""
    import uuid
    job_id = str(uuid.uuid4())

    supabase_admin.table("jobs").insert({
        "id":                 job_id,
        "title":              payload.title.strip(),
        "company":            payload.company.strip(),
        "title_normalized":   payload.title.strip().lower(),
        "company_normalized": payload.company.strip().lower(),
        "posting_date":       payload.application_date,
        "ats_family":         "unknown",
        # Store description in application_schema (jobs table has no description column)
        "application_schema": {"description": payload.job_description} if payload.job_description else None,
    }).execute()

    item = supabase_admin.table("tracker_items").insert({
        "user_id":        user.id,
        "job_id":         job_id,
        "current_status": "applied",
    }).execute()

    item_id = item.data[0]["id"]
    return {"data": {"item_id": item_id, "job_id": job_id, "current_status": "applied"}}


class NotePayload(BaseModel):
    job_id: str
    note:   str


@router.post("/note")
async def add_tracker_note(payload: NotePayload, user=Depends(get_current_user)):
    add_note(user.id, payload.job_id, payload.note)
    return {"data": {"status": "note_saved"}}


@router.get("/{item_id}/events")
async def get_events(item_id: str, user=Depends(get_current_user)):
    """Return the full immutable event history for a tracker item."""
    result = supabase_admin.table("tracker_events").select("*") \
             .eq("tracker_item_id", item_id).eq("user_id", user.id) \
             .order("created_at", desc=True).execute()
    return {"data": result.data}
