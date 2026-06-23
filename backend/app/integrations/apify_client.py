"""
Apify-powered job scrapers for Indeed and LinkedIn.
Each `fetch_*` function yields raw_job dicts ready for raw_jobs upsert.
"""
import re
import httpx
from datetime import datetime, timedelta
from typing import Iterator

APIFY_BASE     = "https://api.apify.com/v2/acts"
INDEED_ACTOR   = "apify~indeed-scraper"
LINKEDIN_ACTOR = "bebity~linkedin-jobs-scraper"

# Comprehensive PM title coverage — passed as individual queries
PM_QUERIES = [
    "product manager",
    "senior product manager",
    "principal product manager",
    "director of product",
    "head of product",
    "VP product",
    "group product manager",
    "staff product manager",
    "associate product manager",
]

# Regions to scrape on Indeed
INDEED_REGIONS = [
    {"country": "US", "source_region": "us"},
    {"country": "GB", "source_region": "uk"},
    {"country": "CA", "source_region": "canada"},
    {"country": "IN", "source_region": "india"},
]

# LinkedIn search URLs: one per major locale, sorted by date, last 14 days
LINKEDIN_SEARCH_URLS = [
    "https://www.linkedin.com/jobs/search/?keywords=product+manager&location=United+States&f_TPR=r1209600&sortBy=DD",
    "https://www.linkedin.com/jobs/search/?keywords=senior+product+manager&location=United+States&f_TPR=r1209600&sortBy=DD",
    "https://www.linkedin.com/jobs/search/?keywords=director+of+product&location=United+States&f_TPR=r1209600&sortBy=DD",
    "https://www.linkedin.com/jobs/search/?keywords=head+of+product&location=United+States&f_TPR=r1209600&sortBy=DD",
    "https://www.linkedin.com/jobs/search/?keywords=product+manager&location=United+Kingdom&f_TPR=r1209600&sortBy=DD",
    "https://www.linkedin.com/jobs/search/?keywords=product+manager&location=Canada&f_TPR=r1209600&sortBy=DD",
    "https://www.linkedin.com/jobs/search/?keywords=product+manager&location=India&f_TPR=r1209600&sortBy=DD",
]

LINKEDIN_REGION_MAP = {
    "United States": "us",
    "United Kingdom": "uk",
    "Canada":        "canada",
    "India":         "india",
}


def _run_actor(actor_id: str, api_key: str, payload: dict) -> list:
    """Run an Apify actor synchronously and return the dataset items."""
    resp = httpx.post(
        f"{APIFY_BASE}/{actor_id}/run-sync-get-dataset-items",
        params={"token": api_key},
        json=payload,
        timeout=300,
    )
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else []


def _parse_date(raw: str | None) -> str | None:
    """
    Convert various date formats to YYYY-MM-DD.
    Handles ISO dates, and relative strings like '5 days ago', '2 weeks ago'.
    """
    if not raw:
        return None
    s = str(raw).strip()
    # ISO / date-only
    try:
        return datetime.fromisoformat(s[:10]).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        pass
    # Relative: "X days/hours/weeks/months ago"
    s_lower = s.lower()
    if "just now" in s_lower or "today" in s_lower or "hour" in s_lower or "minute" in s_lower:
        return datetime.utcnow().strftime("%Y-%m-%d")
    m = re.search(r"(\d+)\s*(day|week|month)", s_lower)
    if m:
        n, unit = int(m.group(1)), m.group(2)
        delta = timedelta(days=n if unit == "day" else n * 7 if unit == "week" else n * 30)
        return (datetime.utcnow() - delta).strftime("%Y-%m-%d")
    return None


# ─── Indeed ───────────────────────────────────────────────────────────────────

def fetch_indeed_jobs(api_key: str) -> Iterator[dict]:
    """
    Scrape PM listings from Indeed across US, UK, Canada, and India.
    Runs one actor call per region (all PM queries bundled) → ~200 jobs each.
    """
    for region in INDEED_REGIONS:
        try:
            items = _run_actor(INDEED_ACTOR, api_key, {
                "queries":              PM_QUERIES,
                "maxItems":             200,
                "country":              region["country"],
                "followApplyRedirects": False,
                "saveOnlyUniqueItems":  True,
            })
        except (httpx.HTTPError, httpx.TimeoutException, Exception):
            continue

        for item in items:
            title = item.get("positionName", "")
            if not title:
                continue

            raw_date = item.get("datePosted") or item.get("postedAt")
            yield {
                "source":          "apify_actor",
                "source_job_id":   (item.get("externalApplyUrl") or item.get("url", ""))[-80:],
                "source_url":      item.get("externalApplyUrl") or item.get("url", ""),
                "company_raw":     item.get("company", ""),
                "title_raw":       title,
                "location_raw":    item.get("location", ""),
                "posting_date":    _parse_date(raw_date),
                "raw_payload":     item,
                "board_category":  "general_tech",
                "source_region":   region["source_region"],
            }


# ─── LinkedIn ─────────────────────────────────────────────────────────────────

def fetch_linkedin_jobs(api_key: str) -> Iterator[dict]:
    """
    Scrape PM listings from LinkedIn using bebity~linkedin-jobs-scraper.
    Runs one actor call per search URL (role × region combos).
    """
    for url in LINKEDIN_SEARCH_URLS:
        try:
            items = _run_actor(LINKEDIN_ACTOR, api_key, {
                "urls":  [url],
                "count": 100,
            })
        except (httpx.HTTPError, httpx.TimeoutException, Exception):
            continue

        # Infer source_region from the URL
        source_region = "global"
        for locale, reg in LINKEDIN_REGION_MAP.items():
            if locale.lower().replace(" ", "+") in url.lower():
                source_region = reg
                break

        for item in items:
            title = item.get("title", "")
            if not title:
                continue

            raw_date = (
                item.get("publishedAt")
                or item.get("postedAt")
                or item.get("listedAt")
                or item.get("datePosted")
            )
            apply_url = item.get("applyUrl") or item.get("jobUrl") or item.get("url", "")

            yield {
                "source":        "apify_actor",
                "source_job_id": apply_url[-80:] if apply_url else "",
                "source_url":    apply_url,
                "company_raw":   item.get("companyName", ""),
                "title_raw":     title,
                "location_raw":  item.get("location", ""),
                "posting_date":  _parse_date(raw_date),
                "raw_payload":   item,
                "board_category": "general_tech",
                "source_region":  source_region,
            }
