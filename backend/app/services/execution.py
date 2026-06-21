import uuid
from app.services.policy_engine import evaluate, PolicyDecision
from app.core.supabase import supabase_admin
from app.services.tracker import advance_tracker


def execute_auto_apply(user_id: str, job_id: str, artifact_id: str) -> dict:
    """
    Attempt to auto-submit an application via ATS API.
    Policy Engine is evaluated before any network call is made.
    """
    job   = supabase_admin.table("jobs").select("*").eq("id", job_id).single().execute().data
    score = supabase_admin.table("job_scores").select("*") \
            .eq("user_id", user_id).eq("job_id", job_id).maybe_single().execute().data

    if not job or not score:
        return {"error": "Job or score record not found"}

    decision = evaluate("submit_application", user_id, {
        "job":          job,
        "job_id":       job_id,
        "fit_score":    score.get("fit_score", 0),
        "is_automation": True,
    })

    if decision == PolicyDecision.BLOCK:
        return {"error": "policy_blocked", "decision": decision.value}
    if decision == PolicyDecision.ESCALATE:
        return {"status": "requires_user_confirmation", "decision": decision.value}

    session_id = str(uuid.uuid4())
    supabase_admin.table("apply_sessions").insert({
        "id":           session_id,
        "user_id":      user_id,
        "job_id":       job_id,
        "session_type": "auto",
        "ats_family":   job.get("ats_family"),
        "status":       "in_progress",
        "steps":        [],
    }).execute()

    try:
        ats = job.get("ats_family")
        if ats == "greenhouse":
            from app.integrations.greenhouse_client import submit_application
            result = submit_application(job, user_id, artifact_id)
        else:
            raise NotImplementedError(f"Auto-apply not yet supported for ATS: {ats}")

        supabase_admin.table("apply_sessions").update({
            "status":               "completed",
            "submitted_at":         "now()",
            "confirmation_payload": result,
            "rollback_available":   True,
        }).eq("id", session_id).execute()

        advance_tracker(user_id, job_id, "applied", source="system",
                        metadata={"apply_session_id": session_id})

        return {"session_id": session_id, "status": "submitted", "result": result}

    except Exception as e:
        supabase_admin.table("apply_sessions").update({
            "status":         "failed",
            "failure_reason": str(e),
        }).eq("id", session_id).execute()
        return {"error": str(e), "session_id": session_id}


def confirm_and_submit(user_id: str, job_id: str, artifact_id: str) -> dict:
    """Called after user confirms an ESCALATE decision. Marks the policy as resolved and submits."""
    evaluate("submit_application_confirmed", user_id, {"job_id": job_id})
    return execute_auto_apply(user_id, job_id, artifact_id)
