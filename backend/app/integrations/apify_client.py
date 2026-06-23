import httpx
from typing import Iterator

APIFY_BASE    = "https://api.apify.com/v2/acts"
INDEED_ACTOR  = "apify~indeed-scraper"
PM_SEARCH_TERMS = ["product manager", "head of product", "staff pm", "group product manager"]


def _run_actor(actor_id: str, api_key: str, input_payload: dict) -> dict:
    """Start an Apify actor synchronously (up to 5 minutes) and return the result."""
    resp = httpx.post(
        f"{APIFY_BASE}/{actor_id}/run-sync-get-dataset-items",
        params={"token": api_key},
        json=input_payload,
        timeout=300,
    )
    resp.raise_for_status()
    return resp.json()


def fetch_indeed_jobs(api_key: str) -> Iterator[dict]:
    """Scrape PM listings from Indeed using Apify's Indeed actor."""
    try:
        items = _run_actor(INDEED_ACTOR, api_key, {
            "queries":          PM_SEARCH_TERMS,
            "maxItems":         50,
            "country":          "US",
            "followApplyRedirects": False,
        })
    except (httpx.HTTPError, httpx.TimeoutException):
        return

    if not isinstance(items, list):
        return

    for item in items:
        title = item.get("positionName", "")
        yield {
            "source":          "apify_actor",
            "source_job_id":   item.get("externalApplyUrl", item.get("url", ""))[-80:],
            "source_url":      item.get("externalApplyUrl") or item.get("url", ""),
            "company_raw":     item.get("company", ""),
            "title_raw":       title,
            "location_raw":    item.get("location", ""),
            "raw_payload":     item,
        }
