from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.supabase import supabase_admin
from app.services.tracker import advance_tracker, add_note

router = APIRouter()


@router.get("/")
async def get_tracker(user=Depends(get_current_user)):
    """Return all tracker items with job info and fit score."""
    result = supabase_admin.table("tracker_items").select(
        "id, current_status, last_updated, stale_flag, auto_apply_enabled, created_at, "
        "jobs(id, title, company, location, seniority_level, ats_family, remote_eligible), "
        "job_scores(fit_score, evidence_confidence, automation_eligibility)"
    ).eq("user_id", user.id).order("last_updated", desc=True).execute()
    return {"data": result.data}


class StatusUpdate(BaseModel):
    job_id:     str
    new_status: str
    note:       str | None = None


@router.patch("/{item_id}/status")
async def update_status(item_id: str, payload: StatusUpdate, user=Depends(get_current_user)):
    """Manually advance a tracker item to a new status."""
    # Verify ownership
    item = supabase_admin.table("tracker_items").select("user_id") \
           .eq("id", item_id).single().execute().data
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
