from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.security import verify_internal_key
from app.api import auth, profile, intake, recovery, jobs, apply, outreach, tracker, settings

app = FastAPI(title="RBot API", version="1.0.0", docs_url="/docs")

cors_origins = [
    origin.strip()
    for origin in settings.frontend_url.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/auth",     tags=["auth"])
app.include_router(profile.router,  prefix="/profile",  tags=["profile"])
app.include_router(intake.router,   prefix="/intake",   tags=["intake"])
app.include_router(recovery.router, prefix="/recovery", tags=["recovery"])
app.include_router(jobs.router,     prefix="/jobs",     tags=["jobs"])
app.include_router(apply.router,    prefix="/apply",    tags=["apply"])
app.include_router(outreach.router, prefix="/outreach", tags=["outreach"])
app.include_router(tracker.router,  prefix="/tracker",  tags=["tracker"])
app.include_router(settings.router, prefix="/settings", tags=["settings"])


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.app_env}


@app.post("/internal/discovery/run")
async def trigger_discovery(x_internal_key: str = Header(...)):
    """Called by n8n every 4 hours to kick off job discovery."""
    if not verify_internal_key(x_internal_key):
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.workers.tasks import discover_and_normalize_jobs
    discover_and_normalize_jobs.delay()
    return {"status": "discovery_queued"}
