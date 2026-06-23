import httpx
from typing import Iterator

BREEZY_BASE = "https://{slug}.breezy.hr/json"
PM_KEYWORDS = ["product manager", " pm ", "head of product", "product lead", "group pm"]

# EU/Nordic SMBs using Breezy HR
DEFAULT_COMPANIES = [
    "klarna", "spotify-se", "king", "kahoot", "schibsted",
    "funcom", "monzo", "onfido", "cleo", "nested",
    "curve", "peanut", "n26", "mambu", "raisin",
    "scalable-capital", "trade-republic", "auxmoney", "smava", "solaris",
    "finleap", "billie-eu", "moss-eu", "penta", "vg",
]

# Per-slug region overrides; default ("uk_eu_focused", "eu")
_META: dict[str, tuple[str, str]] = {
    "klarna":       ("nordic",        "nordics"),
    "spotify-se":   ("nordic",        "nordics"),
    "king":         ("general_tech",  "eu"),
    "kahoot":       ("nordic",        "nordics"),
    "schibsted":    ("nordic",        "nordics"),
    "funcom":       ("general_tech",  "nordics"),
    "monzo":        ("uk_eu_focused", "uk"),
    "onfido":       ("uk_eu_focused", "uk"),
    "cleo":         ("uk_eu_focused", "uk"),
    "nested":       ("uk_eu_focused", "uk"),
    "curve":        ("uk_eu_focused", "uk"),
    "peanut":       ("uk_eu_focused", "uk"),
}

def _breezy_meta(slug: str) -> tuple[str, str]:
    return _META.get(slug, ("uk_eu_focused", "eu"))


def _is_pm(title: str, department: str) -> bool:
    t = title.lower()
    if any(kw in t for kw in PM_KEYWORDS):
        return True
    if "product" in department.lower():
        return True
    return False


def fetch_jobs(company_slug: str) -> Iterator[dict]:
    """Fetch PM job postings from a Breezy HR company career page."""
    url = BREEZY_BASE.format(slug=company_slug)
    try:
        resp = httpx.get(url, timeout=30)
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException):
        return

    data = resp.json()
    jobs = data if isinstance(data, list) else []

    for job in jobs:
        title      = job.get("name", "")
        department = job.get("department", "")
        if not _is_pm(title, department):
            continue
        loc = (job.get("location") or {}).get("name", "")
        cat, reg = _breezy_meta(company_slug)
        yield {
            "source":          "breezy_api",
            "source_job_id":   job.get("id", ""),
            "source_url":      job.get("url", f"https://{company_slug}.breezy.hr"),
            "company_raw":     company_slug,
            "title_raw":       title,
            "raw_title":       title,
            "raw_description": job.get("description", ""),
            "raw_location":    loc,
            "location_raw":    loc,
            "raw_payload":     job,
            "board_category":  cat,
            "source_region":   reg,
        }
