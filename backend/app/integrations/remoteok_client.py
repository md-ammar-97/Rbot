import httpx
from typing import Iterator

REMOTEOK_URL = "https://remoteok.com/api"
PM_KEYWORDS  = ["product manager", " pm ", "head of product", "product lead", "group pm"]
HEADERS      = {"User-Agent": "RBot/1.0 (job aggregator; contact mohdammar97@gmail.com)"}


def _is_pm(title: str) -> bool:
    t = title.lower()
    return any(kw in t for kw in PM_KEYWORDS)


def fetch_jobs() -> Iterator[dict]:
    """Fetch remote PM listings from Remote OK's public JSON feed."""
    try:
        resp = httpx.get(REMOTEOK_URL, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException):
        return

    items = resp.json()
    # First element is a metadata object, not a job
    for item in items[1:]:
        title = item.get("position", "")
        if not _is_pm(title):
            continue
        slug = str(item.get("id", "")) or item.get("slug", "")
        yield {
            "source":          "remoteok_api",
            "source_job_id":   slug,
            "source_url":      item.get("url", ""),
            "company_raw":     item.get("company", ""),
            "title_raw":       title,
            "location_raw":    item.get("location", "Remote"),
            "raw_payload":     item,
            "board_category":  "remote_first",
            "source_region":   "global",
        }
