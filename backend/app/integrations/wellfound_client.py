import httpx
from typing import Iterator

WELLFOUND_URL = "https://wellfound.com/role/product-manager.json"
PM_KEYWORDS   = ["product manager", " pm ", "head of product", "product lead", "group pm"]
MAX_PAGES     = 20


def _is_pm(title: str) -> bool:
    t = title.lower()
    return any(kw in t for kw in PM_KEYWORDS)


def fetch_jobs() -> Iterator[dict]:
    """Fetch startup PM listings from Wellfound (paginated JSON endpoint)."""
    for page in range(1, MAX_PAGES + 1):
        try:
            resp = httpx.get(
                WELLFOUND_URL,
                params={"page": page},
                headers={"Accept": "application/json"},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, httpx.TimeoutException, ValueError):
            break

        jobs = data.get("jobs") or data.get("startupRoles") or []
        if not jobs:
            break

        for job in jobs:
            title = job.get("title", "")
            if not _is_pm(title):
                continue
            locations = job.get("locations") or []
            loc_str   = ", ".join(locations) if locations else "Remote"
            yield {
                "source":          "wellfound_api",
                "source_job_id":   str(job.get("id", "")),
                "source_url":      job.get("url", ""),
                "company_raw":     job.get("company_name", job.get("startup", {}).get("name", "")),
                "title_raw":       title,
                "raw_title":       title,
                "raw_description": job.get("description_html", job.get("description", "")),
                "raw_location":    loc_str,
                "location_raw":    loc_str,
                "raw_payload":     job,
                "board_category":  "startup",
                "source_region":   "global",
            }
