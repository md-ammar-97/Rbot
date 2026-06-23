from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.supabase import supabase_admin
from app.services.policy_engine import evaluate, PolicyDecision

router = APIRouter()


class OutreachRequest(BaseModel):
    job_id:           str
    recipient_name:   str
    recipient_role:   str
    recipient_company: str


@router.post("/generate")
async def generate_outreach(payload: OutreachRequest, user=Depends(get_current_user)):
    """Queue outreach draft generation. Policy Engine evaluated before queueing."""
    decision = evaluate("send_outreach", user.id, {"job_id": payload.job_id})

    if decision == PolicyDecision.BLOCK:
        return {"error": "policy_blocked"}

    from app.workers.tasks import generate_outreach_draft
    generate_outreach_draft.delay(
        user.id, payload.job_id,
        {
            "name":    payload.recipient_name,
            "role":    payload.recipient_role,
            "company": payload.recipient_company,
        }
    )
    return {"data": {"status": "outreach_queued", "requires_confirmation": True}}


@router.get("/")
async def list_outreach(user=Depends(get_current_user)):
    result = supabase_admin.table("outreach_drafts").select(
        "id, job_id, draft_type, recipient_name, recipient_company, "
        "body, character_count, user_sent, sent_at, created_at"
    ).eq("user_id", user.id).eq("user_sent", False).eq("user_discarded", False) \
     .order("created_at", desc=True).execute()
    return {"data": result.data}


@router.patch("/{draft_id}/discard")
async def discard_draft(draft_id: str, user=Depends(get_current_user)):
    supabase_admin.table("outreach_drafts").update({"user_discarded": True}) \
    .eq("id", draft_id).eq("user_id", user.id).execute()
    return {"data": {"status": "discarded"}}


@router.patch("/{draft_id}/send")
async def mark_sent(draft_id: str, user=Depends(get_current_user)):
    supabase_admin.table("outreach_drafts").update({
        "user_sent": True, "sent_at": "now()"
    }).eq("id", draft_id).eq("user_id", user.id).execute()
    return {"data": {"status": "marked_sent"}}
