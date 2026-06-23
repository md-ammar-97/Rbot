import httpx
from typing import Iterator

LEVER_BASE = "https://api.lever.co/v0/postings"
PM_TITLE_KEYWORDS = ["product manager", " pm ", "pm -", "- pm", "head of product", "group pm"]

# (board_category, source_region) overrides; default is ("general_tech", "us")
_META: dict[str, tuple[str, str]] = {
    "scale-ai":     ("startup",      "us"),
    "cohere":       ("startup",      "global"),
    "openai":       ("startup",      "us"),
    "huggingface":  ("startup",      "global"),
    "stability-ai": ("startup",      "global"),
    "together-ai":  ("startup",      "global"),
    "aleph-alpha":  ("startup",      "eu"),
    "deepmind":     ("general_tech", "uk"),
    "waymo":        ("general_tech", "us"),
    "nuro":         ("startup",      "us"),
    "aurora":       ("startup",      "us"),
    "xero":         ("general_tech", "global"),
    "sage":         ("general_tech", "uk"),
    "deel":         ("general_tech", "global"),
    "remote":       ("general_tech", "global"),
    "papaya-global":("general_tech", "global"),
}

def _lever_meta(slug: str) -> tuple[str, str]:
    return _META.get(slug, ("general_tech", "us"))

# Lever company slugs — PM-hiring companies across verticals
DEFAULT_COMPANIES = [
    # Entertainment / consumer
    "netflix", "duolingo", "canva", "miro", "grammarly",
    "lucidchart", "vimeo", "patreon", "quora", "remind",

    # Marketplace / logistics
    "faire", "turo", "homelight", "opendoor", "compass",
    "convoy", "flexport", "stord", "shipbob",

    # Fintech / banking
    "plaid", "coinbase", "affirm", "stash", "mercury",
    "moderntreasury", "pipe", "float", "found", "brex",
    "ramp", "bill", "tipalti", "stampli", "airbase",
    "rho", "jeeves", "tribal", "payoneer",

    # AI / ML / data
    "scale-ai", "cohere", "openai", "huggingface",
    "stability-ai", "together-ai", "aleph-alpha",
    "deepmind", "waymo", "nuro", "aurora",

    # Developer tools / data
    "airtable", "cockroachdb", "dbt-labs", "fivetran",
    "hightouch", "rudderstack", "census", "getcensus",
    "segment", "starburst", "dremio", "atlan",
    "lightdash", "metabase", "sigma-computing",

    # SaaS / GTM
    "front", "dialpad", "drift", "sendbird",
    "yotpo", "zoominfo", "zuora", "thoughtspot",
    "sisense", "sprinklr", "truework", "clearbit",
    "outreach", "gong", "salesloft", "apollo",
    "ironclad", "workato", "xero", "sage",

    # HR / compliance / legal
    "checkr", "persona", "navan", "rippling", "pilot",
    "remote", "deel", "papaya-global", "multiplier",
    "lattice", "leapsome", "culture-amp", "peakon",

    # Health / climate
    "watershed", "pachama", "patch", "terrapass",
    "wiz", "vanta", "expel", "lacework",
]


def _is_pm_posting(title: str, team: str) -> bool:
    """Return True if the posting is a PM role by title or team category."""
    t = title.lower()
    if any(kw in t for kw in PM_TITLE_KEYWORDS):
        return True
    if "product" in team.lower():
        return True
    return False


def fetch_jobs(company_slug: str) -> Iterator[dict]:
    """Fetch PM job postings from a single Lever company page."""
    try:
        resp = httpx.get(
            f"{LEVER_BASE}/{company_slug}",
            params={"mode": "json", "commitment": "Full-time"},
            timeout=30,
        )
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException):
        return

    for job in resp.json():
        categories = job.get("categories", {})
        team = categories.get("team") or ""
        if not _is_pm_posting(job.get("text", ""), team):
            continue
        cat, reg = _lever_meta(company_slug)
        yield {
            "source":          "lever_api",
            "source_job_id":   job.get("id", ""),
            "source_url":      job.get("hostedUrl", ""),
            "company_raw":     company_slug,
            "title_raw":       job.get("text", ""),
            "location_raw":    categories.get("location"),
            "raw_payload":     job,
            "board_category":  cat,
            "source_region":   reg,
        }
