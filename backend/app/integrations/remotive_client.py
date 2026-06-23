import httpx
from typing import Iterator

REMOTIVE_URL = "https://remotive.com/api/remote-jobs"
PM_KEYWORDS  = ["product manager", " pm ", "head of product", "product lead", "group pm"]


def _is_pm(title: str) -> bool:
    t = title.lower()
    return any(kw in t for kw in PM_KEYWORDS)


def fetch_jobs() -> Iterator[dict]:
    """Fetch remote PM listings from Remotive's public API."""
    try:
        resp = httpx.get(REMOTIVE_URL, params={"category": "product"}, timeout=30)
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException):
        return

    for job in resp.json().get("jobs", []):
        title = job.get("title", "")
        if not _is_pm(title):
            continue
        yield {
            "source":          "remotive_api",
            "source_job_id":   str(job.get("id", "")),
            "source_url":      job.get("url", ""),
            "company_raw":     job.get("company_name", ""),
            "title_raw":       title,
            "raw_title":       title,
            "raw_description": job.get("description", ""),
            "raw_location":    job.get("candidate_required_location", "Remote"),
            "location_raw":    job.get("candidate_required_location", "Remote"),
            "raw_payload":     job,
            "board_category":  "remote_first",
            "source_region":   "global",
        }
