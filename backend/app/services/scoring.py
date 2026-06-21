from app.core.supabase import supabase_admin
from app.integrations.groq_client import groq_chat

WEIGHTS = {
    "skill_alignment":      0.25,
    "seniority_match":      0.15,
    "domain_relevance":     0.15,
    "project_evidence":     0.10,
    "profile_completeness": 0.05,
}

SENIORITY_ORDER = [
    "intern", "associate", "ic2", "ic3", "ic4", "staff", "lead", "director", "vp", "cpo"
]


def score_job_for_user(user_id: str, job_id: str):
    """Compute and persist the three-output fit model for a user+job pair."""
    profile = supabase_admin.table("profiles").select("*") \
              .eq("id", user_id).single().execute().data
    job     = supabase_admin.table("jobs").select("*") \
              .eq("id", job_id).single().execute().data

    if not profile or not job:
        return

    graph = profile.get("profile_graph") or {}
    if not graph:
        return

    # Hard eligibility gates
    location_ok  = _check_location(profile, job)
    work_auth_ok = _check_work_auth(profile, job)

    if not location_ok or not work_auth_ok:
        _save_score(
            user_id, job_id, 0, "low", "manual_only", {},
            ineligibility_reason=(
                f"location_match={location_ok}, work_auth={work_auth_ok}"
            ),
        )
        return

    skill_score     = _skill_alignment(graph, job)
    seniority_score = _seniority_match(graph, job)
    domain_score    = _domain_relevance(graph, job)
    evidence_score  = _project_evidence(graph)
    completeness    = float(graph.get("profile_completeness") or 0.5)

    weighted = (
        skill_score     * WEIGHTS["skill_alignment"]      +
        seniority_score * WEIGHTS["seniority_match"]      +
        domain_score    * WEIGHTS["domain_relevance"]     +
        evidence_score  * WEIGHTS["project_evidence"]     +
        completeness    * WEIGHTS["profile_completeness"]
    )
    fit_score     = min(100, int(50 + weighted * 60))
    evidence_conf = _evidence_confidence(graph)
    auto_elig, auto_reason = _automation_eligibility(job, fit_score, evidence_conf, profile)

    breakdown = {
        "eligibility_gates":    {"location": location_ok, "work_auth": work_auth_ok},
        "skill_alignment":      {"score": round(skill_score, 2)},
        "seniority_match":      {"score": round(seniority_score, 2)},
        "domain_relevance":     {"score": round(domain_score, 2)},
        "project_evidence":     {"score": round(evidence_score, 2)},
        "profile_completeness": {"score": round(completeness, 2)},
        "weighted_total":       fit_score,
        "version":              "v1",
    }

    fit_explanation = _generate_explanation(graph, job, breakdown, fit_score)
    _save_score(user_id, job_id, fit_score, evidence_conf, auto_elig,
                breakdown, fit_explanation, auto_reason=auto_reason)


def _skill_alignment(graph: dict, job: dict) -> float:
    user_skills = set(
        s.lower() for s in
        list(graph.get("tools", [])) + list(graph.get("skills", {}).keys())
    )
    req_skills = set(s.lower() for s in job.get("required_skills", []))
    if not req_skills:
        return 0.6
    return len(user_skills & req_skills) / len(req_skills)


def _seniority_match(graph: dict, job: dict) -> float:
    user_level = _infer_user_seniority(graph)
    job_level  = job.get("seniority_level")
    if not job_level or not user_level:
        return 0.7
    u = SENIORITY_ORDER.index(user_level) if user_level in SENIORITY_ORDER else 3
    j = SENIORITY_ORDER.index(job_level)  if job_level  in SENIORITY_ORDER else 3
    diff = abs(u - j)
    return max(0.0, 1.0 - diff * 0.25)


def _domain_relevance(graph: dict, job: dict) -> float:
    user_domains = set(d.lower() for d in graph.get("domains", []))
    job_domains  = set(d.lower() for d in job.get("domains", []))
    if not job_domains:
        return 0.6
    return len(user_domains & job_domains) / len(job_domains)


def _project_evidence(graph: dict) -> float:
    github_evidence = any(
        any("github" in str(s) for s in r.get("evidence_sources", []))
        for r in graph.get("roles", [])
    )
    return 0.9 if github_evidence else 0.5


def _evidence_confidence(graph: dict) -> str:
    completeness = float(graph.get("profile_completeness") or 0.0)
    github_roles = sum(
        1 for r in graph.get("roles", [])
        if any("github" in str(s) for s in r.get("evidence_sources", []))
    )
    if completeness >= 0.8 and github_roles >= 2:
        return "high"
    if completeness >= 0.6 and github_roles >= 1:
        return "medium"
    return "low"


def _automation_eligibility(
    job: dict, fit_score: int, evidence_conf: str, profile: dict
) -> tuple[str, str | None]:
    schema    = job.get("application_schema") or {}
    ats       = job.get("ats_family", "unknown")
    custom    = schema.get("custom_questions", [])
    has_essay = any(q.get("disqualifies_auto_apply") for q in custom)

    if fit_score < 70:                        return "manual_only", "fit_score_below_70"
    if evidence_conf == "low":                return "restricted",  "low_evidence_confidence"
    if ats not in ("greenhouse", "lever"):    return "manual_only", "unsupported_ats"
    if has_essay:                             return "manual_only", "custom_essay_question"
    if not profile.get("auto_apply_enabled"): return "restricted",  "auto_apply_not_enabled"
    if job.get("quarantine"):                 return "manual_only", "job_quarantined"
    return "eligible", None


def _generate_explanation(graph: dict, job: dict, breakdown: dict, fit_score: int) -> str:
    try:
        return groq_chat(
            model="llama-3.1-8b-instant",
            system=(
                "Write a 2–4 sentence explanation of this PM job Fit Score. "
                "Reference specific matched skills and note any key gaps. "
                "NEVER call it an 'ATS score' or 'keyword score'. "
                "Begin with the numeric score."
            ),
            user=(
                f"Fit Score: {fit_score}/100\n"
                f"Breakdown: {breakdown}\n"
                f"Job: {job.get('title')} at {job.get('company')}\n"
                f"User skills: {list(graph.get('skills', {}).keys())[:10]}"
            ),
            temperature=0.4,
        )
    except Exception:
        return f"Fit Score: {fit_score}/100"


def _check_location(profile: dict, job: dict) -> bool:
    if job.get("remote_eligible"):
        return True
    target_locs = [loc.lower() for loc in (profile.get("target_locations") or [])]
    job_loc     = (job.get("location_normalized") or "").lower()
    if not target_locs:
        return True
    return any(t in job_loc or job_loc in t for t in target_locs)


def _check_work_auth(profile: dict, job: dict) -> bool:
    needs_sponsorship  = profile.get("sponsorship_required", False)
    offers_sponsorship = job.get("sponsorship_offered")
    if needs_sponsorship and offers_sponsorship is False:
        return False
    return True


def _infer_user_seniority(graph: dict) -> str | None:
    roles = graph.get("roles", [])
    if not roles:
        return None
    latest = max(roles, key=lambda r: r.get("start_date", ""), default=None)
    if not latest:
        return None
    title = (latest.get("title") or "").lower()
    if "cpo" in title or "chief product" in title:     return "cpo"
    if "vp" in title or "vice president" in title:     return "vp"
    if "director" in title:                            return "director"
    if "principal" in title:                           return "staff"
    if "group pm" in title or "staff pm" in title:     return "lead"
    if "senior" in title or "sr." in title or "sr " in title: return "ic4"
    if "associate" in title or "apm" in title:         return "ic2"
    return "ic3"


def _save_score(
    user_id: str,
    job_id: str,
    fit_score: int,
    evidence_conf: str,
    auto_elig: str,
    breakdown: dict,
    explanation: str | None = None,
    ineligibility_reason: str | None = None,
    auto_reason: str | None = None,
):
    supabase_admin.table("job_scores").upsert({
        "user_id":                  user_id,
        "job_id":                   job_id,
        "fit_score":                fit_score,
        "evidence_confidence":      evidence_conf,
        "automation_eligibility":   auto_elig,
        "score_breakdown":          breakdown,
        "fit_explanation":          explanation,
        "ineligibility_reason":     ineligibility_reason,
        "automation_block_reason":  auto_reason,
        "scored_at":                "now()",
    }).execute()
