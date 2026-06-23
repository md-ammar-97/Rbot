import httpx
from typing import Iterator

JAZZHR_BASE = "https://{slug}.applytojob.com/apply/jobs/index.json"
PM_KEYWORDS = ["product manager", " pm ", "head of product", "product lead", "group pm"]

# US general tech companies using JazzHR
DEFAULT_COMPANIES = [
    "hubspot", "mimecast", "egnyte", "iherb", "cargurus",
    "brightcove", "rapid7", "bazaarvoice", "clicksoftware", "invoca",
    "conductor", "adzerk", "yext", "brafton", "demandbase",
]


def _region_from_country(country: str) -> str:
    c = (country or "").lower()
    if c in ("gb", "uk", "united kingdom"):
        return "uk"
    if c in ("de", "fr", "nl", "es", "it", "pl", "se", "no", "dk", "fi", "be", "at", "ch"):
        return "eu"
    if c in ("in", "india"):
        return "india"
    return "us"


def _is_pm(title: str) -> bool:
    t = title.lower()
    return any(kw in t for kw in PM_KEYWORDS)


def fetch_jobs(company_slug: str) -> Iterator[dict]:
    """Fetch PM job postings from a JazzHR company page."""
    url = JAZZHR_BASE.format(slug=company_slug)
    try:
        resp = httpx.get(url, timeout=30)
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException):
        return

    data = resp.json()
    jobs = data if isinstance(data, list) else data.get("jobs", [])

    for job in jobs:
        title = job.get("title", "")
        if not _is_pm(title):
            continue
        city    = job.get("city", "")
        state   = job.get("state", "")
        country = job.get("country", "US")
        loc     = ", ".join(filter(None, [city, state, country]))
        yield {
            "source":          "jazzhr_api",
            "source_job_id":   job.get("id", ""),
            "source_url":      job.get("apply_url", f"https://{company_slug}.applytojob.com"),
            "company_raw":     company_slug,
            "title_raw":       title,
            "location_raw":    loc,
            "raw_payload":     job,
            "board_category":  "general_tech",
            "source_region":   _region_from_country(country),
        }
