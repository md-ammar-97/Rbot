from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.supabase import supabase_admin

router = APIRouter()


@router.get("/")
async def get_profile(user=Depends(get_current_user)):
    result = supabase_admin.table("profiles").select("*").eq("id", user.id).single().execute()
    return {"data": result.data}


class ProfileUpdate(BaseModel):
    target_roles:         list[str] | None = None
    target_locations:     list[str] | None = None
    remote_preference:    str | None       = None
    work_authorization:   str | None       = None
    sponsorship_required: bool | None      = None
    compensation_min:     int | None       = None
    compensation_max:     int | None       = None
    search_intent:        str | None       = None
    auto_apply_enabled:   bool | None      = None
    apify_api_key:        str | None       = None


@router.patch("/")
async def update_profile(payload: ProfileUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        return {"data": {"status": "no_changes"}}
    result = supabase_admin.table("profiles").update(updates).eq("id", user.id).execute()
    return {"data": result.data}


@router.patch("/onboarding/complete")
async def complete_onboarding(user=Depends(get_current_user)):
    """Mark onboarding as complete — called after recovery finishes."""
    supabase_admin.table("profiles").update({
        "onboarding_complete": True,
    }).eq("id", user.id).execute()
    return {"data": {"status": "onboarding_complete"}}
