from supabase import create_client, Client
from app.core.config import settings

# Service client — bypasses RLS; use only in backend workers and internal routes
supabase_admin: Client = create_client(settings.supabase_url, settings.supabase_service_key)


def get_user_client(jwt: str) -> Client:
    """Return a Supabase client scoped to a specific user's JWT (RLS-filtered)."""
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    client.postgrest.auth(jwt)
    return client
