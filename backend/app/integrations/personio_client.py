import httpx
from typing import Iterator

PERSONIO_URL = "https://api.personio.de/recruiting/public-jobs"
PM_KEYWORDS  = ["product manager", " pm ", "head of product", "product lead", "group pm"]
MAX_PAGES    = 20
PAGE_LIMIT   = 100


def _is_pm(title: str, department: str) -> bool:
    t = title.lower()
    if any(kw in t for kw in PM_KEYWORDS):
        return True
    if "product" in department.lower():
        return True
    return False


def _attr(job: dict, key: str, sub: str = "name") -> str:
    """Safely pull a nested attribute from Personio's JSON:API style response."""
    return (job.get("attributes") or {}).get(key, {}).get("attributes", {}).get(sub, "") or ""


def fetch_jobs() -> Iterator[dict]:
    """Fetch EU PM listings from Personio's aggregated public jobs feed."""
    for page in range(1, MAX_PAGES + 1):
        try:
            resp = httpx.get(
                PERSONIO_URL,
                params={"page": page, "limit": PAGE_LIMIT},
                headers={"Accept": "application/json"},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, httpx.TimeoutException, ValueError):
            break

        jobs = data.get("data") or []
        if not jobs:
            break

        for job in jobs:
            attrs      = job.get("attributes") or {}
            title      = attrs.get("name", "")
            department = _attr(job, "department")
            if not _is_pm(title, department):
                continue
            company = _attr(job, "office")
            created = attrs.get("created_at", "")
            yield {
                "source":          "personio_api",
                "source_job_id":   str(job.get("id", "")),
                "source_url":      attrs.get("application_url", ""),
                "company_raw":     company,
                "title_raw":       title,
                "raw_title":       title,
                "raw_description": attrs.get("description", ""),
                "raw_location":    company,
                "location_raw":    company,
                "posting_date":    created[:10] if created else None,
                "raw_payload":     job,
                "board_category":  "uk_eu_focused",
                "source_region":   "eu",
            }

        if len(jobs) < PAGE_LIMIT:
            break
