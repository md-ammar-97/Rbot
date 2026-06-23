import httpx
from typing import Iterator

SR_BASE = "https://api.smartrecruiters.com/v1/companies"
PM_KEYWORDS = ["product manager", " pm ", "head of product", "group pm", "staff pm"]

# (board_category, source_region) per slug; default ("general_tech", "us")
_META: dict[str, tuple[str, str]] = {
    "zalando":        ("uk_eu_focused", "eu"),
    "delivery-hero":  ("uk_eu_focused", "eu"),
    "hellofresh":     ("uk_eu_focused", "eu"),
    "babbel":         ("uk_eu_focused", "eu"),
    "sumup":          ("uk_eu_focused", "eu"),
    "xing":           ("uk_eu_focused", "eu"),
    "trivago":        ("uk_eu_focused", "eu"),
    "idealo":         ("uk_eu_focused", "eu"),
    "aboutyou":       ("uk_eu_focused", "eu"),
    "gorillas":       ("startup",       "eu"),
    "flaschenpost":   ("uk_eu_focused", "eu"),
    "picnic":         ("uk_eu_focused", "eu"),
    "flink":          ("startup",       "eu"),
    "visa":           ("enterprise",    "global"),
    "mcdonalds":      ("enterprise",    "global"),
    "bosch":          ("enterprise",    "eu"),
    "compass":        ("general_tech",  "us"),
    "servicenow":     ("enterprise",    "us"),
    "sap":            ("enterprise",    "eu"),
    "autodesk":       ("enterprise",    "us"),
    "chewy":          ("general_tech",  "us"),
    "wayfair":        ("general_tech",  "us"),
    "poshmark":       ("general_tech",  "us"),
    "depop":          ("uk_eu_focused", "uk"),
    "reverb":         ("general_tech",  "us"),
    "tradesy":        ("general_tech",  "us"),
    "n26":            ("uk_eu_focused", "eu"),
    "revolut":        ("uk_eu_focused", "uk"),
    "monzo":          ("uk_eu_focused", "uk"),
    "bunq":           ("uk_eu_focused", "eu"),
    "paysafe":        ("enterprise",    "global"),
    "worldline":      ("uk_eu_focused", "eu"),
}

def _sr_meta(slug: str) -> tuple[str, str]:
    return _META.get(slug, ("general_tech", "us"))

# Companies using SmartRecruiters — skews European enterprise + US retail/finance
DEFAULT_COMPANIES = [
    # European tech / e-commerce
    "zalando", "delivery-hero", "hellofresh", "babbel",
    "sumup", "xing", "trivago", "idealo", "aboutyou",
    "gorillas", "flaschenpost", "picnic", "flink",

    # Global enterprise
    "visa", "mcdonalds", "bosch", "compass",
    "servicenow", "sap", "autodesk",

    # US consumer / retail
    "chewy", "wayfair", "poshmark", "depop",
    "reverb", "tradesy",

    # Finance / insurance
    "n26", "revolut", "monzo", "bunq",
    "paysafe", "worldline",
]


def _is_pm_role(title: str, department: str) -> bool:
    t = title.lower()
    if any(kw in t for kw in PM_KEYWORDS):
        return True
    if "product" in department.lower():
        return True
    return False


def fetch_jobs(company_slug: str) -> Iterator[dict]:
    """Fetch PM job postings from a single SmartRecruiters company."""
    try:
        resp = httpx.get(
            f"{SR_BASE}/{company_slug}/postings",
            params={"department": "product", "status": "PUBLIC"},
            timeout=30,
        )
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException):
        return

    content = resp.json()
    for job in content.get("content", []):
        title      = job.get("name", "")
        department = job.get("department", {}).get("label", "")
        if not _is_pm_role(title, department):
            continue
        loc = job.get("location", {}).get("city") or ""
        cat, reg = _sr_meta(company_slug)
        yield {
            "source":          "smartrecruiters_api",
            "source_job_id":   job.get("id", ""),
            "source_url":      job.get("ref", ""),
            "company_raw":     company_slug,
            "title_raw":       title,
            "raw_title":       title,
            "raw_description": "",
            "raw_location":    loc,
            "location_raw":    loc,
            "raw_payload":     job,
            "board_category":  cat,
            "source_region":   reg,
        }
