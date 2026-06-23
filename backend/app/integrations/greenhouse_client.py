import httpx
from typing import Iterator

GREENHOUSE_BASE = "https://boards-api.greenhouse.io/v1/boards"
PM_KEYWORDS = ["product manager", " pm ", "product lead", "head of product", "group pm", "staff pm"]

# (board_category, source_region) overrides — everything else defaults to ("general_tech", "us")
_META: dict[str, tuple[str, str]] = {
    "anthropic":      ("startup",      "us"),
    "weights-biases": ("startup",      "us"),
    "covariant":      ("startup",      "us"),
    "linear":         ("startup",      "global"),
    "palantir":       ("enterprise",   "us"),
    "uipath":         ("enterprise",   "global"),
    "celonis":        ("enterprise",   "eu"),
    "atlassian":      ("general_tech", "global"),
    "shopify":        ("general_tech", "global"),
    "gitlab":         ("general_tech", "global"),
    "deel":           ("general_tech", "global"),
    "remote":         ("general_tech", "global"),
}

def _board_meta(slug: str) -> tuple[str, str]:
    return _META.get(slug, ("general_tech", "us"))

# Greenhouse job board tokens — PM-hiring companies across all verticals
DEFAULT_BOARDS = [
    # AI / ML
    "anthropic", "palantir", "weights-biases", "covariant", "uipath",
    "c3", "samsara", "celonis",

    # Developer tools / security / infra
    "stripe", "vercel", "cloudflare", "datadog", "confluent", "pagerduty",
    "okta", "mongodb", "elastic", "crowdstrike", "tenable", "tanium",
    "vanta", "rubrik", "snyk", "launchdarkly", "harness", "postman",
    "netlify", "fastly", "newrelic", "gitlab", "sourcegraph",
    "incident-io", "rootly", "firehydrant", "cortex",

    # Design / product / collaboration
    "figma", "linear", "retool", "coda", "webflow", "loom",
    "segment", "amplitude", "mixpanel", "heap", "pendo", "gainsight",
    "fullstory", "zapier", "typeform", "contentful", "calendly",
    "productboard", "dovetail", "appcues", "userleap", "hotjar",
    "logrocket", "intercom", "notion",

    # Fintech / HR / legal
    "brex", "ramp", "rippling", "gusto", "carta", "ironclad",
    "checkr", "persona", "marqeta", "tipalti", "zenefits", "deel",
    "remote", "oysterhr", "leapsome", "lattice", "culture-amp",
    "15five", "betterworks",

    # Revenue / GTM SaaS
    "asana", "atlassian", "hubspot", "zendesk", "shopify",
    "freshworks", "gong", "outreach", "sprinklr", "sisense",
    "thoughtspot", "workato", "navan", "zip", "gem", "qualtrics",
    "salesloft", "chorus", "clari", "qualified", "drift",
    "6sense", "demandbase", "bombora", "zoominfo",

    # Consumer / marketplace / social
    "airbnb", "lyft", "doordash", "instacart", "robinhood",
    "coinbase", "reddit", "discord", "pinterest", "dropbox",
    "squarespace", "wix", "yelp", "thumbtack", "nextdoor",
    "eventbrite", "duolingo", "canva", "noom", "headspace",
    "calm", "hopin", "bumble", "hinge", "meetup",

    # Health / insurance / biotech
    "lemonade", "lyrahealth", "devoted", "benchling",
    "veeva", "flatiron", "modernhealth",

    # Logistics / mobility
    "turo", "motive", "toast", "opendoor", "offerpad",
    "sonder", "vacasa",
]


def _is_pm_role(title: str) -> bool:
    t = title.lower()
    return any(kw in t for kw in PM_KEYWORDS)


def _to_raw_job_row(job: dict, board_token: str) -> dict:
    cat, reg = _board_meta(board_token)
    return {
        "source":          "greenhouse_api",
        "source_job_id":   str(job["id"]),
        "source_url":      job.get("absolute_url", ""),
        "company_raw":     board_token,
        "title_raw":       job.get("title", ""),
        "raw_title":       job.get("title", ""),
        "raw_description": job.get("content", ""),
        "raw_location":    job.get("location", {}).get("name"),
        "location_raw":    job.get("location", {}).get("name"),
        "raw_payload":     job,
        "board_category":  cat,
        "source_region":   reg,
    }


def fetch_jobs(board_token: str) -> Iterator[dict]:
    """Fetch PM job postings from a single Greenhouse board."""
    try:
        resp = httpx.get(
            f"{GREENHOUSE_BASE}/{board_token}/jobs",
            params={"content": "true"},
            timeout=30,
        )
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException):
        return

    for job in resp.json().get("jobs", []):
        if _is_pm_role(job.get("title", "")):
            yield _to_raw_job_row(job, board_token)


def submit_application(job: dict, user_id: str, artifact_id: str) -> dict:
    """Submit via Greenhouse Job Board API. Phase 1 stub — returns mock confirmation."""
    # TODO: Implement actual Greenhouse Apply API submission
    # Requires: https://developers.greenhouse.io/job-board.html#submit-an-application
    return {
        "status":          "submitted",
        "confirmation_id": f"gh_mock_{user_id[:8]}",
        "message":         "Application submitted via Greenhouse API (stub)",
    }
