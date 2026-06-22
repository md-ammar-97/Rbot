import logging
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.supabase import supabase_admin


class _StrictBearer(HTTPBearer):
    async def __call__(self, request: Request):
        try:
            return await super().__call__(request)
        except HTTPException:
            raise HTTPException(status_code=401, detail="Not authenticated")


bearer = _StrictBearer()
logger = logging.getLogger(__name__)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    """Validate Supabase JWT and return the user object."""
    token = credentials.credentials
    try:
        result = supabase_admin.auth.get_user(token)
        if not result.user:
            logger.error("auth.get_user returned no user (token prefix: %s...)", token[:20])
            raise HTTPException(status_code=401, detail="Invalid token")
        return result.user
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Auth validation failed — %s: %s (token prefix: %s...)",
                     type(exc).__name__, exc, token[:20])
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def verify_internal_key(key: str) -> bool:
    """Verify the internal API key used by n8n and scheduled workers."""
    from app.core.config import settings
    return key == settings.internal_api_key
