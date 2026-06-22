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
