import uuid
import re
from app.integrations.groq_client import groq_chat
from app.core.supabase import supabase_admin


def _strip_html(html: str) -> str:
    """Remove HTML tags and collapse whitespace."""
    text = re.sub(r"<[^>]+>", " ", html or "")
    return re.sub(r"\s+", " ", text).strip()


def _deduplication_key(job: dict) -> tuple:
    return (
        (job.get("company_normalized") or "").lower().strip(),
        (job.get("title_normalized")   or "").lower().strip(),
        (job.get("location_normalized") or "").lower().strip(),
    )

NORM_PROMPT = """Normalise this job posting into a JSON object with exactly these keys:
{
  "title_normalized": "<lowercase, stripped of punctuation>",
  "company_normalized": "<lowercase, stripped>",
  "location_normalized": "<lowercase city+state or 'remote' or null>",
  "remote_eligible": true or false or null,
  "sponsorship_offered": true or false or null,
  "seniority_level": "<intern|associate|ic2|ic3|ic4|staff|lead|director|vp|null>",
  "domains": ["<domain>"],
  "required_skills": ["<skill>"],
  "preferred_skills": ["<skill>"],
  "ats_family": "<greenhouse|lever|unknown>"
}
Rules:
- Only use information present in the posting. null means unknown — do not guess.
- For seniority: 'Senior PM' → ic4, 'PM' → ic3, 'Principal PM' → staff, 'Group PM' → lead
- For domains: infer from the job description (e.g. 'fintech', 'b2b saas', 'mobile', 'platform')
- Do not add skills not mentioned in the posting."""


def normalise_raw_job(raw_job_id: str):
    """Fetch a raw_job, normalise it with the LLM, and upsert into the jobs table."""
    raw = supabase_admin.table("raw_jobs").select("*") \
          .eq("id", raw_job_id).single().execute().data

    if not raw:
        return

    try:
        norm = groq_chat(
            model="llama-3.1-8b-instant",
            system=NORM_PROMPT,
            user=(
                f"Title: {raw.get('title_raw', '')}\n"
                f"Company: {raw.get('company_raw', '')}\n"
                f"Location: {raw.get('location_raw', '')}\n"
                f"Source URL: {raw.get('source_url', '')}\n"
                f"Payload excerpt:\n{str(raw.get('raw_payload', {}))[:3000]}"
            ),
            temperature=0.1,
            json_mode=True,
        )
        if not isinstance(norm, dict):
            raise ValueError("LLM returned non-dict for normalization")
    except Exception as e:
        supabase_admin.table("raw_jobs").update({
            "normalization_error": str(e)
        }).eq("id", raw_job_id).execute()
        return

    company_norm  = (norm.get("company_normalized") or raw.get("company_raw", "")).lower().strip()
    title_norm    = (norm.get("title_normalized") or raw.get("title_raw", "")).lower().strip()
    location_norm = (norm.get("location_normalized") or "").lower().strip() or None

    # Deduplication check
    existing = None
    if location_norm:
        existing = supabase_admin.table("jobs").select("id") \
                   .eq("company_normalized", company_norm) \
                   .eq("title_normalized",   title_norm) \
                   .eq("location_normalized", location_norm) \
                   .maybe_single().execute()
    else:
        existing = supabase_admin.table("jobs").select("id") \
                   .eq("company_normalized", company_norm) \
                   .eq("title_normalized",   title_norm) \
                   .is_("location_normalized", "null") \
                   .maybe_single().execute()

    if existing and existing.data:
        canonical_id = existing.data["id"]
        supabase_admin.table("jobs").update({
            "last_refreshed_at": "now()",
            "is_stale":          False,
        }).eq("id", canonical_id).execute()
    else:
        canonical_id = str(uuid.uuid4())
        supabase_admin.table("jobs").insert({
            "id":                 canonical_id,
            "title":              raw.get("title_raw", ""),
            "title_normalized":   title_norm,
            "company":            raw.get("company_raw", ""),
            "company_normalized": company_norm,
            "location_normalized": location_norm,
            "remote_eligible":    norm.get("remote_eligible"),
            "sponsorship_offered": norm.get("sponsorship_offered"),
            "seniority_level":    norm.get("seniority_level"),
            "domains":            norm.get("domains", []),
            "required_skills":    norm.get("required_skills", []),
            "preferred_skills":   norm.get("preferred_skills", []),
            "ats_family":         norm.get("ats_family", "unknown"),
            "posting_date":       raw.get("fetched_at"),
        }).execute()

    supabase_admin.table("raw_jobs").update({
        "normalized":       True,
        "canonical_job_id": canonical_id,
    }).eq("id", raw_job_id).execute()

    supabase_admin.table("job_sources").insert({
        "job_id":     canonical_id,
        "raw_job_id": raw_job_id,
        "source_url": raw.get("source_url", ""),
        "source":     raw.get("source", "greenhouse_api"),
    }).execute()

    return canonical_id
