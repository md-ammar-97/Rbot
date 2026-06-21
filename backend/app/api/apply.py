from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.supabase import supabase_admin

router = APIRouter()


class AutoApplyRequest(BaseModel):
    job_id:      str
    artifact_id: str


@router.post("/auto")
async def auto_apply(payload: AutoApplyRequest, user=Depends(get_current_user)):
    """Attempt auto-apply via ATS API. Policy Engine gates the attempt."""
    from app.services.execution import execute_auto_apply
    result = execute_auto_apply(user.id, payload.job_id, payload.artifact_id)
    return {"data": result}


@router.post("/confirm")
async def confirm_apply(payload: AutoApplyRequest, user=Depends(get_current_user)):
    """User confirms an ESCALATE decision and proceeds with submission."""
    from app.services.execution import confirm_and_submit
    result = confirm_and_submit(user.id, payload.job_id, payload.artifact_id)
    return {"data": result}


@router.get("/sessions")
async def list_sessions(user=Depends(get_current_user)):
    result = supabase_admin.table("apply_sessions").select(
        "id, job_id, session_type, status, ats_family, submitted_at, "
        "failure_reason, rollback_available, started_at"
    ).eq("user_id", user.id).order("started_at", desc=True).execute()
    return {"data": result.data}


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user=Depends(get_current_user)):
    result = supabase_admin.table("apply_sessions").select("*") \
             .eq("id", session_id).eq("user_id", user.id).single().execute()
    if not result.data:
        raise HTTPException(404, "Session not found.")
    return {"data": result.data}


@router.post("/sessions/{session_id}/rollback")
async def rollback_session(session_id: str, user=Depends(get_current_user)):
    """Rollback an auto-apply submission within the 60-second window."""
    session = supabase_admin.table("apply_sessions").select("*") \
              .eq("id", session_id).eq("user_id", user.id).single().execute().data

    if not session:
        raise HTTPException(404, "Session not found.")
    if not session.get("rollback_available"):
        raise HTTPException(409, "Rollback window has closed.")

    # TODO: Implement actual ATS API rollback (Greenhouse: DELETE /applications/{id})
    supabase_admin.table("apply_sessions").update({
        "rollback_available": False,
        "rolled_back_at":     "now()",
        "status":             "cancelled",
    }).eq("id", session_id).execute()

    return {"data": {"status": "rolled_back"}}
