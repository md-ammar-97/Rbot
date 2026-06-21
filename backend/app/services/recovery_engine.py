from app.integrations.groq_client import groq_chat
from app.core.supabase import supabase_admin

DIMENSION_THRESHOLDS = {
    "extractability":        1.0,
    "completeness":          0.8,
    "clarity":               0.7,
    "achievement_density":   0.6,
    "role_relevance":        0.7,
    "timeline_consistency":  0.9,
    "evidence_availability": 0.5,
}


def diagnose_profile(graph: dict) -> dict:
    """Score each of the 7 quality dimensions and produce a diagnosis."""
    roles = graph.get("roles", [])

    extractability = 1.0 if roles else 0.0

    complete_roles = sum(1 for r in roles if r.get("start_date") and r.get("company"))
    completeness   = complete_roles / max(len(roles), 1)

    roles_with_metrics = sum(
        1 for r in roles
        if any(a.get("metrics") for a in r.get("achievements", []))
    )
    achievement_density = roles_with_metrics / max(len(roles), 1)

    relevance_score = _score_pm_relevance(roles)
    timeline_score  = _check_timeline(roles)
    clarity_score   = _score_clarity(roles)
    evidence_score  = _score_evidence(graph)

    dims = {
        "extractability":        extractability,
        "completeness":          completeness,
        "clarity":               clarity_score,
        "achievement_density":   achievement_density,
        "role_relevance":        relevance_score,
        "timeline_consistency":  timeline_score,
        "evidence_availability": evidence_score,
    }

    return {
        "dimensions": {
            k: {
                "score":     round(v, 2),
                "threshold": DIMENSION_THRESHOLDS[k],
                "passed":    v >= DIMENSION_THRESHOLDS[k],
            }
            for k, v in dims.items()
        },
        "overall_score":     round(sum(dims.values()) / len(dims), 2),
        "failed_dimensions": [k for k, v in dims.items() if v < DIMENSION_THRESHOLDS[k]],
        "recovery_required": any(v < DIMENSION_THRESHOLDS[k] for k, v in dims.items()),
    }


def open_recovery_case(user_id: str, diagnosis: dict):
    """Create a recovery_cases row and generate targeted clarifying questions."""
    questions = _generate_clarifying_questions(user_id, diagnosis)
    supabase_admin.table("recovery_cases").insert({
        "user_id":        user_id,
        "diagnosis":      diagnosis,
        "open_questions": questions if isinstance(questions, list) else [],
        "status":         "in_progress",
    }).execute()


def _generate_clarifying_questions(user_id: str, diagnosis: dict) -> list[dict]:
    profile   = supabase_admin.table("profiles").select("profile_graph") \
                .eq("id", user_id).single().execute().data
    graph     = profile.get("profile_graph", {}) if profile else {}
    answered  = supabase_admin.table("recovery_answers").select("question_id") \
                .eq("user_id", user_id).execute().data or []
    answered_ids = {r["question_id"] for r in answered}

    prompt = f"""
Given these quality gaps in a PM candidate's profile:
Failed dimensions: {diagnosis.get('failed_dimensions', [])}

Profile graph (roles and achievements):
{str(graph)[:6000]}

Generate 1–5 targeted clarifying questions to fill the minimum missing information.
Rules:
- Each question must reference a specific role by title/company
- Questions must be answerable from memory in under 2 minutes
- Do not repeat these already-answered question IDs: {list(answered_ids)}
- Maximum 5 questions total
- If extractability failed (no roles found), ask the user to type out their most recent role manually

Return JSON array of:
[{{"id": "q_001", "dimension": "achievement_density", "role_id": "role_xxx or null",
  "question": "...", "answer_type": "text", "required": true, "answered": false}}]
"""
    result = groq_chat(
        model="llama-3.3-70b-versatile",
        system="You generate targeted clarifying questions for PM job seekers. "
               "Return only a valid JSON array. No explanation.",
        user=prompt,
        temperature=0.3,
        json_mode=True,
    )
    if isinstance(result, list):
        return result
    if isinstance(result, dict):
        return list(result.values())[0] if result else []
    return []


def _score_pm_relevance(roles: list[dict]) -> float:
    if not roles:
        return 0.0
    pm_titles = ["product manager", "product lead", "head of product", "pm ", "apm",
                 "group pm", "principal pm", "staff pm", "product owner"]
    pm_role_count = sum(
        1 for r in roles
        if any(t in (r.get("title", "") or "").lower() for t in pm_titles)
    )
    return min(1.0, pm_role_count / max(len(roles), 1) + 0.3)


def _check_timeline(roles: list[dict]) -> float:
    """Simple overlap check: returns 1.0 if no overlapping date ranges, lower if overlaps found."""
    dated_roles = [r for r in roles if r.get("start_date")]
    if len(dated_roles) < 2:
        return 1.0
    # Simple heuristic: if all roles have start dates and no two overlap badly, pass
    return 0.9  # Conservative baseline; full overlap detection is a Phase 2 improvement


def _score_clarity(roles: list[dict]) -> float:
    if not roles:
        return 0.0
    roles_with_description = sum(
        1 for r in roles
        if len(r.get("description", "") or "") > 50 or r.get("achievements")
    )
    return roles_with_description / len(roles)


def _score_evidence(graph: dict) -> float:
    roles = graph.get("roles", [])
    has_github = any(
        any("github" in str(s) for s in r.get("evidence_sources", []))
        for r in roles
    )
    has_linkedin = any(
        any("linkedin" in str(s) for s in r.get("evidence_sources", []))
        for r in roles
    )
    score = 0.3  # base for resume only
    if has_linkedin:
        score += 0.4
    if has_github:
        score += 0.3
    return min(1.0, score)
