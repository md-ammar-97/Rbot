import uuid as _uuid
from datetime import datetime
from app.integrations.groq_client import groq_chat

MERGE_SYSTEM_PROMPT = """You are merging multiple career evidence sources into one structured profile graph for a PM job seeker.

RULES (non-negotiable):
1. Every claim in the output must be traceable to at least one input source.
2. When two sources conflict on dates for the same role, do NOT silently pick one.
   Instead, include the conflict in the 'gaps' array: "Dates for [title] at [company] differ between sources."
3. Do NOT invent roles, companies, metrics, or achievements not present in any source.
4. If a metric appears in one source (e.g. '40% DAU growth'), reproduce it exactly — never round or change it.
5. Calculate profile_completeness as a float 0-1: fraction of roles with start_date, company, and ≥1 achievement.
6. Return only valid JSON matching the schema below. Do not add commentary or explanation.

Output schema:
{
  "roles": [{
    "id": "role_<8-char hex>",
    "title": "",
    "company": "",
    "company_normalized": "",
    "start_date": "YYYY-MM or YYYY",
    "end_date": "YYYY-MM or YYYY or null",
    "is_current": false,
    "employment_type": "full-time|contract|internship|part-time",
    "location": "",
    "description": "",
    "achievements": [{"text": "", "metrics": [], "skills_demonstrated": [], "evidence_sources": []}],
    "skills": [],
    "tools": [],
    "domains": [],
    "evidence_sources": [],
    "confidence": "high|medium|low"
  }],
  "skills": {"skill_name": {"level": "high|medium|low", "evidence_count": 0}},
  "tools": [],
  "domains": [],
  "education": [{"institution": "", "degree": "", "graduation_year": null}],
  "metrics": [],
  "gaps": [],
  "profile_completeness": 0.0,
  "evidence_confidence": "low|medium|high"
}"""


def merge_evidence(user_id: str, evidence_rows: list[dict]) -> dict:
    """Merge all raw_evidence rows for a user into a canonical profile_graph."""
    source_summaries = []
    for row in evidence_rows:
        source_summaries.append({
            "source_type": row["source_type"],
            "source_id":   row["id"],
            "content":     row.get("parsed_content", {}),
        })

    raw_graph = groq_chat(
        model="llama-3.3-70b-versatile",
        system=MERGE_SYSTEM_PROMPT,
        user=f"USER_ID: {user_id}\n\nSOURCES:\n{str(source_summaries)[:12000]}",
        temperature=0.2,
        json_mode=True,
    )

    if not isinstance(raw_graph, dict):
        raw_graph = {}

    # Ensure every role has a stable ID
    for role in raw_graph.get("roles", []):
        if not role.get("id"):
            role["id"] = f"role_{_uuid.uuid4().hex[:8]}"

    raw_graph["last_built_at"] = datetime.utcnow().isoformat()
    return raw_graph
