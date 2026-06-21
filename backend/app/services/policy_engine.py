from enum import Enum
from app.core.supabase import supabase_admin


class PolicyDecision(str, Enum):
    ALLOW    = "allow"
    RESTRICT = "restrict"
    ESCALATE = "escalate"
    BLOCK    = "block"


BLOCK_RULES = {
    "linkedin_scrape":    "LinkedIn scraping is prohibited (ToS §8.2)",
    "autonomous_message": "Autonomous outbound messaging is not permitted",
    "captcha_bypass":     "CAPTCHA solving is not permitted",
    "low_fit_auto_apply": "Auto-apply blocked: Fit Score below minimum threshold (50)",
    "quarantined_job":    "Auto-apply blocked: job is quarantined pending review",
    "fabrication":        "Generated content contains ungrounded claims",
    "recovery_incomplete":"Action blocked: Resume Quality Recovery must complete first",
}


def evaluate(action: str, user_id: str, context: dict | None = None) -> PolicyDecision:
    """Evaluate a requested action and log the decision. Always logs before returning."""
    ctx      = context or {}
    decision, rule = _evaluate_raw(action, ctx)
    _log(user_id, action, decision, rule, ctx)
    return decision


def _evaluate_raw(action: str, ctx: dict) -> tuple[PolicyDecision, str]:
    # Hard blocks — never negotiable
    if action == "linkedin_scrape":
        return PolicyDecision.BLOCK, "linkedin_scrape"
    if action == "send_autonomous_message":
        return PolicyDecision.BLOCK, "autonomous_message"
    if action == "captcha_solve":
        return PolicyDecision.BLOCK, "captcha_bypass"

    # Recovery gate — must complete before downstream actions
    if ctx.get("recovery_status") not in ("complete", None) and action not in (
        "upload_resume", "upload_linkedin", "add_github_repo",
        "answer_recovery_question", "get_recovery_status",
    ):
        if ctx.get("recovery_status") == "pending" or ctx.get("recovery_status") == "in_progress":
            return PolicyDecision.BLOCK, "recovery_incomplete"

    if action == "submit_application":
        job   = ctx.get("job", {})
        score = ctx.get("fit_score", 0)
        if job.get("quarantine"):
            return PolicyDecision.BLOCK, "quarantined_job"
        if ctx.get("is_automation") and score < 50:
            return PolicyDecision.BLOCK, "low_fit_auto_apply"
        if ctx.get("groundedness_verdict") == "fail":
            return PolicyDecision.BLOCK, "fabrication"
        # All applications require explicit user confirmation
        return PolicyDecision.ESCALATE, "application_requires_confirmation"

    if action in ("send_outreach", "send_message"):
        return PolicyDecision.ESCALATE, "outreach_requires_confirmation"

    if action in ("resume_rewrite", "form_prefill", "status_inference"):
        confidence = ctx.get("confidence", "low")
        if confidence == "low":
            return PolicyDecision.RESTRICT, "low_confidence_requires_review"
        return PolicyDecision.ALLOW, "confidence_check_passed"

    # Default: internal read/write operations are allowed
    return PolicyDecision.ALLOW, "internal_operation"


def _log(user_id: str, action: str, decision: PolicyDecision, rule: str, ctx: dict):
    try:
        supabase_admin.table("policy_audit_log").insert({
            "user_id":      user_id,
            "action":       action,
            "decision":     decision.value,
            "rule_matched": rule,
            "reason":       BLOCK_RULES.get(rule, rule),
            "job_id":       ctx.get("job_id"),
            "metadata":     {k: v for k, v in ctx.items() if k not in ("job",) and isinstance(v, (str, int, float, bool, type(None)))},
        }).execute()
    except Exception:
        pass  # Policy logging must never block the action decision
