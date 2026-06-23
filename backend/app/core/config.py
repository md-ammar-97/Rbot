from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    supabase_anon_key: str
    groq_api_key: str
    groq_primary_model: str = "llama-3.3-70b-versatile"
    groq_fast_model: str = "llama-3.1-8b-instant"
    app_env: str = "development"
    app_secret_key: str = "dev-secret-change-in-production"
    frontend_url: str = "http://localhost:3000"
    internal_api_key: str = "dev-internal-key"
    github_client_id: str = ""
    github_client_secret: str = ""
    playwright_headless: bool = False
    reed_api_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
