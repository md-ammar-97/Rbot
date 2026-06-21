import httpx
from typing import Iterator

LEVER_BASE = "https://api.lever.co/v0/postings"
PM_TITLE_KEYWORDS = ["product manager", " pm ", "pm -", "- pm", "head of product", "group pm"]

# Known Lever company slugs
DEFAULT_COMPANIES = [
    "netflix", "coinbase", "plaid", "airtable", "miro",
    "faire", "benchling", "toast", "duolingo", "canva",
]


def _is_pm_posting(title: str, team: str) -> bool:
    """Return True if the posting is a PM role by title or team category."""
    t = title.lower()
    if any(kw in t for kw in PM_TITLE_KEYWORDS):
        return True
    if "product" in team.lower():
        return True
    return False


def fetch_jobs(company_slug: str) -> Iterator[dict]:
    """Fetch PM job postings from a single Lever company page."""
    try:
        resp = httpx.get(
            f"{LEVER_BASE}/{company_slug}",
            params={"mode": "json", "commitment": "Full-time"},
            timeout=30,
        )
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException):
        return

    for job in resp.json():
        categories = job.get("categories", {})
        team = categories.get("team") or ""
        if not _is_pm_posting(job.get("text", ""), team):
            continue
        yield {
            "source":        "lever_api",
            "source_job_id": job.get("id", ""),
            "source_url":    job.get("hostedUrl", ""),
            "company_raw":   company_slug,
            "title_raw":     job.get("text", ""),
            "raw_title":     job.get("text", ""),
            "raw_description": job.get("descriptionPlain", ""),
            "raw_location":  categories.get("location"),
            "location_raw":  categories.get("location"),
            "raw_payload":   job,
        }
