import httpx
from typing import Iterator

ASHBY_BASE = "https://api.ashbyhq.com/posting-public/job-board"
PM_KEYWORDS = ["product manager", " pm ", "pm -", "- pm", "head of product", "group pm", "staff pm"]

# Ashby skews heavily AI-native/startup; default category for all companies
_DEFAULT_BOARD_CATEGORY = "startup"
_DEFAULT_SOURCE_REGION  = "global"

# Companies using Ashby ATS — skews toward AI-native, devtools, and modern SaaS
DEFAULT_COMPANIES = [
    # AI-native products
    "linear", "cursor", "perplexity", "adept", "runway",
    "pika", "synthesia", "elevenlabs", "descript", "suno",
    "udio", "hedra", "invideo", "captions", "opus-clip",
    "moonvalley", "krea", "ideogram", "fal",

    # AI infrastructure / LLM
    "anyscale", "mistral", "together-ai", "replicate",
    "baseten", "banana", "beam",
    "lepton", "octoai", "fireworks-ai", "groq",

    # Developer experience / tooling
    "replit", "codeium", "sourcegraph", "gitpod",
    "warp", "fig", "zed", "the-browser-company",
    "posthog", "metabase", "highlight", "logtail",

    # Cloud infra / data
    "fly-io", "modal", "neon", "planetscale", "turso",
    "supabase", "resend", "trigger-dev", "inngest",
    "upstash", "clerk", "stytch", "workos",

    # Product analytics / experimentation
    "statsig", "eppo", "growthbook", "optimizely",
    "amplitude", "mixpanel",

    # Vertical SaaS
    "cal", "lago", "dub", "papermark",
    "rally", "campsite", "height", "plane",
]


def _is_pm_role(title: str, department: str) -> bool:
    t = title.lower()
    if any(kw in t for kw in PM_KEYWORDS):
        return True
    if "product" in department.lower():
        return True
    return False


def fetch_jobs(company_slug: str) -> Iterator[dict]:
    """Fetch PM job postings from a single Ashby job board."""
    try:
        resp = httpx.get(f"{ASHBY_BASE}/{company_slug}", timeout=30)
        resp.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException):
        return

    data = resp.json()
    for job in data.get("jobPostings", []):
        title      = job.get("title", "")
        department = job.get("departmentName", "")
        if not _is_pm_role(title, department):
            continue
        loc = job.get("locationName") or ""
        yield {
            "source":          "ashby_api",
            "source_job_id":   job.get("id", ""),
            "source_url":      job.get("jobUrl", ""),
            "company_raw":     company_slug,
            "title_raw":       title,
            "raw_title":       title,
            "raw_description": job.get("descriptionSafe", ""),
            "raw_location":    loc,
            "location_raw":    loc,
            "raw_payload":     job,
            "board_category":  _DEFAULT_BOARD_CATEGORY,
            "source_region":   _DEFAULT_SOURCE_REGION,
        }
