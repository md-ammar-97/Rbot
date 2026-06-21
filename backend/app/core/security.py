from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.supabase import supabase_admin

bearer = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    """Validate Supabase JWT and return the user object."""
    try:
        result = supabase_admin.auth.get_user(credentials.credentials)
        if not result.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        # Attach the raw token so downstream code can build user-scoped clients
        result.user.access_token = credentials.credentials
        return result.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def verify_internal_key(key: str) -> bool:
    """Verify the internal API key used by n8n and scheduled workers."""
    from app.core.config import settings
    return key == settings.internal_api_key
