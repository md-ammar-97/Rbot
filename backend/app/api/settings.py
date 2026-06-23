import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.supabase import supabase_admin

logger = logging.getLogger(__name__)
router = APIRouter()


def _one(result):
    return result.data[0] if result.data else None


@router.get("/blacklist")
async def get_blacklist(user=Depends(get_current_user)):
    result = supabase_admin.table("blacklisted_companies").select("*") \
             .eq("user_id", user.id).order("created_at", desc=True).execute()
    return {"data": result.data}


class BlacklistEntry(BaseModel):
    company_name:    str
    company_website: str = ""


@router.post("/blacklist")
async def add_to_blacklist(payload: BlacklistEntry, user=Depends(get_current_user)):
    if not payload.company_name.strip():
        raise HTTPException(422, "company_name is required.")
    row = supabase_admin.table("blacklisted_companies").insert({
        "user_id":         user.id,
        "company_name":    payload.company_name.strip(),
        "company_website": payload.company_website.strip(),
    }).execute()
    return {"data": row.data[0]}


@router.delete("/blacklist/{entry_id}")
async def remove_from_blacklist(entry_id: str, user=Depends(get_current_user)):
    entry = _one(
        supabase_admin.table("blacklisted_companies")
        .select("user_id").eq("id", entry_id).limit(1).execute()
    )
    if not entry or entry["user_id"] != user.id:
        raise HTTPException(403, "Entry not found or access denied.")
    supabase_admin.table("blacklisted_companies").delete().eq("id", entry_id).execute()
    return {"data": {"status": "deleted"}}
