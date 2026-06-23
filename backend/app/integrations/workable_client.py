import httpx
from typing import Iterator

WORKABLE_BASE = "https://{slug}.workable.com/spi/v3/jobs"
PM_KEYWORDS   = ["product manager", " pm ", "head of product", "product lead", "group pm"]

# EU/global mid-size SaaS companies on Workable
DEFAULT_COMPANIES = [
    "typeform", "hotjar", "pipedrive", "travelperk", "personio",
    "pleo", "spendesk", "moss", "billie", "tide",
    "alan", "payfit", "vinted", "backmarket", "mirakl",
    "factorial", "kenjo", "contentsquare", "botify", "ogury",
    "marigold", "smartly", "reachdesk", "leadoo", "apsis",
    "funnel", "supermetrics", "mopinion", "squeaky", "usercentric",
]

# Per-slug classification; default ("uk_eu_focused", "eu")
_META: dict[str, tuple[str, str]] = {
    "tide":         ("uk_eu_focused", "uk"),
    "reachdesk":    ("general_tech",  "us"),
    "marigold":     ("general_tech",  "us"),
    "supermetrics": ("uk_eu_focused", "eu"),
}

def _workable_meta(slug: str) -> tuple[str, str]:
    return _META.get(slug, ("uk_eu_focused", "eu"))


def _is_pm(title: str, department: str) -> bool:
    t = title.lower()
    if any(kw in t for kw in PM_KEYWORDS):
        return True
    if "product" in department.lower():
        return True
    return False


def fetch_jobs(company_slug: str) -> Iterator[dict]:
    """Fetch PM job postings from a Workable-hosted career page."""
    url = WORKABLE_BASE.format(slug=company_slug)
    try:
        resp = httpx.get(url, params={"published": "true"}, timeout=30)
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException):
        return

    data = resp.json()
    jobs = data if isinstance(data, list) else data.get("jobs", [])

    for job in jobs:
        title      = job.get("title", "")
        department = job.get("department", "")
        if not _is_pm(title, department):
            continue
        city    = job.get("city", "")
        country = job.get("country", "")
        loc     = ", ".join(filter(None, [city, country]))
        cat, reg = _workable_meta(company_slug)
        yield {
            "source":          "workable_api",
            "source_job_id":   job.get("shortcode", job.get("id", "")),
            "source_url":      job.get("url", f"https://{company_slug}.workable.com"),
            "company_raw":     company_slug,
            "title_raw":       title,
            "location_raw":    loc,
            "raw_payload":     job,
            "board_category":  cat,
            "source_region":   reg,
        }
