import httpx
from typing import Iterator

TEAMTAILOR_BASE = "https://{slug}.teamtailor.com/jobs.json"
PM_KEYWORDS     = ["product manager", " pm ", "head of product", "product lead", "group pm"]

# Nordic-first companies using Teamtailor
DEFAULT_COMPANIES = [
    "klarna", "epidemic-sound", "einride", "northvolt", "voi-technology",
    "budbee", "matsmart", "tibber", "pleo", "planday",
    "agillic", "lunar", "cardlay", "wolt", "quinyx",
    "lime-technologies", "efecter", "fortnox", "visma", "acast",
    "storytel", "bynder", "soundtrack-your-brand", "modulr", "funnel",
]


def _is_pm(title: str, body: str) -> bool:
    t = title.lower()
    if any(kw in t for kw in PM_KEYWORDS):
        return True
    if "product manager" in body.lower()[:200]:
        return True
    return False


def fetch_jobs(company_slug: str) -> Iterator[dict]:
    """Fetch PM job postings from a Teamtailor-hosted career page."""
    url = TEAMTAILOR_BASE.format(slug=company_slug)
    try:
        resp = httpx.get(url, headers={"Accept": "application/json"}, timeout=30)
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException):
        return

    data = resp.json()
    jobs = data if isinstance(data, list) else data.get("jobs", [])

    for job in jobs:
        title = job.get("title", "")
        body  = job.get("body", "")
        if not _is_pm(title, body):
            continue
        locations = job.get("locations") or []
        loc = locations[0].get("name", "") if locations else ""
        links   = job.get("links") or {}
        job_url = links.get("careersite-job-url", f"https://{company_slug}.teamtailor.com")
        yield {
            "source":          "teamtailor_api",
            "source_job_id":   str(job.get("id", "")),
            "source_url":      job_url,
            "company_raw":     company_slug,
            "title_raw":       title,
            "raw_title":       title,
            "raw_description": body,
            "raw_location":    loc,
            "location_raw":    loc,
            "raw_payload":     job,
            "board_category":  "nordic",
            "source_region":   "nordics",
        }
