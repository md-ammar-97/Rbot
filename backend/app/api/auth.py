from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.core.supabase import supabase_admin

router = APIRouter()


@router.post("/signout")
async def signout(user=Depends(get_current_user)):
    """Sign the user out (invalidates session on Supabase side)."""
    try:
        supabase_admin.auth.admin.sign_out(user.id)
    except Exception:
        pass
    return {"status": "signed_out"}
