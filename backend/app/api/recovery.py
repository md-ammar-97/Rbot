from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.supabase import supabase_admin

router = APIRouter()


def _complete_recovery(user_id: str, case_id: str) -> None:
    """Mark case complete, profile complete, queue baseline generation."""
    supabase_admin.table("recovery_cases").update({
        "status": "complete",
        "resolved_at": "now()",
    }).eq("id", case_id).execute()
    supabase_admin.table("profiles").update({
        "recovery_status": "complete",
    }).eq("id", user_id).execute()
    from app.workers.tasks import generate_baseline
    generate_baseline.delay(user_id)


def _one(result):
    """Return result.data[0] if a row exists, else None."""
    return result.data[0] if result.data else None


@router.get("/status")
async def recovery_status(user=Depends(get_current_user)):
    profile = _one(
        supabase_admin.table("profiles")
        .select("recovery_status, recovery_completed_at, onboarding_complete")
        .eq("id", user.id).limit(1).execute()
    )
    if not profile:
        raise HTTPException(404, "Profile not found.")

    case = _one(
        supabase_admin.table("recovery_cases")
        .select("id, status, diagnosis, open_questions, questions_answered_count, created_at")
        .eq("user_id", user.id).eq("status", "in_progress").limit(1).execute()
    )

    # Auto-recheck: if answers already cover all questions but completion wasn't triggered
    if case and profile["recovery_status"] == "in_progress":
        all_answers = supabase_admin.table("recovery_answers").select("question_id") \
                      .eq("case_id", case["id"]).execute().data or []
        answered_count = len({a["question_id"] for a in all_answers})
        total_questions = len(case.get("open_questions") or [])
        if total_questions > 0 and answered_count >= total_questions:
            _complete_recovery(user.id, case["id"])
            profile["recovery_status"] = "complete"
            case = None

    return {
        "data": {
            "recovery_status":    profile["recovery_status"],
            "onboarding_complete": profile["onboarding_complete"],
            "active_case":        case,
        }
    }


@router.get("/questions")
async def get_questions(user=Depends(get_current_user)):
    case = _one(
        supabase_admin.table("recovery_cases")
        .select("id, open_questions, questions_answered_count")
        .eq("user_id", user.id).eq("status", "in_progress").limit(1).execute()
    )

    if not case:
        return {"data": {"questions": [], "case_id": None, "answered": 0, "total": 0}}

    # Cross-reference recovery_answers so frontend knows which are done + can pre-fill
    saved = supabase_admin.table("recovery_answers").select("question_id, answer") \
            .eq("case_id", case["id"]).execute().data or []
    answered_map = {a["question_id"]: a["answer"] for a in saved}

    questions = case.get("open_questions") or []
    for q in questions:
        q["answered"]     = q["id"] in answered_map
        q["saved_answer"] = answered_map.get(q["id"], "")

    return {
        "data": {
            "case_id":   case["id"],
            "questions": questions,
            "answered":  len(answered_map),
            "total":     len(questions),
        }
    }


@router.get("/diagnosis")
async def get_diagnosis(user=Depends(get_current_user)):
    case = _one(
        supabase_admin.table("recovery_cases")
        .select("diagnosis")
        .eq("user_id", user.id)
        .order("created_at", desc=True).limit(1).execute()
    )

    if not case:
        raise HTTPException(404, "No diagnosis found. Upload a resume first.")

    return {"data": case["diagnosis"]}


class AnswerPayload(BaseModel):
    question_id:   str
    question_text: str
    answer:        str
    case_id:       str


@router.post("/answer")
async def submit_answer(payload: AnswerPayload, user=Depends(get_current_user)):
    case = _one(
        supabase_admin.table("recovery_cases")
        .select("id, user_id, open_questions")
        .eq("id", payload.case_id).limit(1).execute()
    )
    if not case or case["user_id"] != user.id:
        raise HTTPException(403, "Case not found or access denied.")

    # Upsert answer — avoid duplicates if the user re-submits a question
    existing = _one(
        supabase_admin.table("recovery_answers").select("id")
        .eq("case_id", payload.case_id).eq("question_id", payload.question_id)
        .limit(1).execute()
    )
    if existing:
        supabase_admin.table("recovery_answers").update({
            "answer": payload.answer,
        }).eq("id", existing["id"]).execute()
    else:
        supabase_admin.table("recovery_answers").insert({
            "case_id":        payload.case_id,
            "user_id":        user.id,
            "question_id":    payload.question_id,
            "question_text":  payload.question_text,
            "answer":         payload.answer,
            "answer_applied": False,
        }).execute()

    # Count distinct answered questions (real count, not a broken RPC)
    all_answers = supabase_admin.table("recovery_answers").select("question_id") \
                  .eq("case_id", payload.case_id).execute().data or []
    answered_count = len({a["question_id"] for a in all_answers})
    total_questions = len(case.get("open_questions") or [])

    supabase_admin.table("recovery_cases").update({
        "questions_answered_count": answered_count,
    }).eq("id", payload.case_id).execute()

    # All questions answered → complete recovery and queue baseline (skip re-diagnosis,
    # which would re-examine the raw profile graph and falsely reopen the case)
    if total_questions > 0 and answered_count >= total_questions:
        _complete_recovery(user.id, payload.case_id)
        return {"data": {"status": "recovery_complete", "answered": answered_count, "total": total_questions}}

    return {"data": {"status": "answer_saved", "answered": answered_count, "total": total_questions}}


@router.get("/baseline")
async def get_baseline_artifact(user=Depends(get_current_user)):
    artifact = _one(
        supabase_admin.table("artifacts").select("*")
        .eq("user_id", user.id).eq("type", "baseline_resume")
        .order("created_at", desc=True).limit(1).execute()
    )

    if not artifact:
        raise HTTPException(404, "No baseline resume generated yet.")

    return {"data": artifact}
