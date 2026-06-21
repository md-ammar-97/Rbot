from celery import Celery
from app.core.config import settings

celery_app = Celery("rbot", broker=settings.redis_url, backend=settings.redis_url)

celery_app.conf.task_routes = {
    "app.workers.tasks.parse_resume":               {"queue": "ingestion"},
    "app.workers.tasks.parse_linkedin_export_task": {"queue": "ingestion"},
    "app.workers.tasks.ingest_github_repo":         {"queue": "ingestion"},
    "app.workers.tasks.build_profile_graph":        {"queue": "profile"},
    "app.workers.tasks.run_recovery_diagnosis":     {"queue": "recovery"},
    "app.workers.tasks.generate_baseline":          {"queue": "recovery"},
    "app.workers.tasks.discover_and_normalize_jobs": {"queue": "discovery"},
    "app.workers.tasks.normalize_raw_job":          {"queue": "discovery"},
    "app.workers.tasks.score_jobs_for_user":        {"queue": "scoring"},
    "app.workers.tasks.score_all_jobs":             {"queue": "scoring"},
    "app.workers.tasks.generate_tailored_draft":    {"queue": "drafting"},
    "app.workers.tasks.generate_cover_letter_draft": {"queue": "drafting"},
    "app.workers.tasks.generate_outreach_draft":    {"queue": "drafting"},
}

celery_app.conf.task_serializer = "json"
celery_app.conf.result_expires = 3600
celery_app.conf.worker_prefetch_multiplier = 1
celery_app.conf.task_acks_late = True
