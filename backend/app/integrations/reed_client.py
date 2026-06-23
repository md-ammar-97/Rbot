import httpx
from typing import Iterator
from app.core.config import settings

REED_URL   = "https://www.reed.co.uk/api/1.0/search"
MAX_RESULTS = 500
PAGE_SIZE   = 100


def fetch_jobs() -> Iterator[dict]:
    """Fetch UK PM listings from Reed.co.uk using Basic Auth."""
    if not settings.reed_api_key:
        return

    auth    = (settings.reed_api_key, "")
    offset  = 0

    while offset < MAX_RESULTS:
        try:
            resp = httpx.get(
                REED_URL,
                auth=auth,
                params={
                    "keywords":        "product manager",
                    "resultsToTake":   PAGE_SIZE,
                    "resultsToSkip":   offset,
                },
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, httpx.TimeoutException, ValueError):
            break

        jobs = data.get("results", [])
        if not jobs:
            break

        for job in jobs:
            title = job.get("jobTitle", "")
            yield {
                "source":          "reed_api",
                "source_job_id":   str(job.get("jobId", "")),
                "source_url":      job.get("jobUrl", ""),
                "company_raw":     job.get("employerName", ""),
                "title_raw":       title,
                "raw_title":       title,
                "raw_description": job.get("jobDescription", ""),
                "raw_location":    job.get("locationName", ""),
                "location_raw":    job.get("locationName", ""),
                "raw_payload":     job,
                "board_category":  "uk_eu_focused",
                "source_region":   "uk",
            }

        offset += PAGE_SIZE
        if len(jobs) < PAGE_SIZE:
            break
