import httpx
from typing import Iterator

GREENHOUSE_BASE = "https://boards-api.greenhouse.io/v1/boards"
PM_KEYWORDS = ["product manager", " pm ", "product lead", "head of product", "group pm", "staff pm"]

# Known Greenhouse board tokens for PM-heavy companies
# Expand this list over time or make it configurable
DEFAULT_BOARDS = [
    "anthropic", "stripe", "figma", "linear", "notion", "vercel",
    "brex", "ramp", "rippling", "lattice", "retool", "segment",
]


def _is_pm_role(title: str) -> bool:
    t = title.lower()
    return any(kw in t for kw in PM_KEYWORDS)


def _to_raw_job_row(job: dict, board_token: str) -> dict:
    return {
        "source":        "greenhouse_api",
        "source_job_id": str(job["id"]),
        "source_url":    job.get("absolute_url", ""),
        "company_raw":   board_token,
        "title_raw":     job.get("title", ""),
        "raw_title":     job.get("title", ""),
        "raw_description": job.get("content", ""),
        "raw_location":  job.get("location", {}).get("name"),
        "location_raw":  job.get("location", {}).get("name"),
        "raw_payload":   job,
    }


def fetch_jobs(board_token: str) -> Iterator[dict]:
    """Fetch PM job postings from a single Greenhouse board."""
    try:
        resp = httpx.get(
            f"{GREENHOUSE_BASE}/{board_token}/jobs",
            params={"content": "true"},
            timeout=30,
        )
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException):
        return

    for job in resp.json().get("jobs", []):
        if _is_pm_role(job.get("title", "")):
            yield _to_raw_job_row(job, board_token)


def submit_application(job: dict, user_id: str, artifact_id: str) -> dict:
    """Submit via Greenhouse Job Board API. Phase 1 stub — returns mock confirmation."""
    # TODO: Implement actual Greenhouse Apply API submission
    # Requires: https://developers.greenhouse.io/job-board.html#submit-an-application
    return {
        "status":          "submitted",
        "confirmation_id": f"gh_mock_{user_id[:8]}",
        "message":         "Application submitted via Greenhouse API (stub)",
    }
