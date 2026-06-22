from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.supabase import supabase_admin
from app.workers.tasks import build_profile_graph

router = APIRouter()


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
        .select("id, status, diagnosis, questions_answered_count, created_at")
        .eq("user_id", user.id).neq("status", "complete").limit(1).execute()
    )

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
        return {"data": {"questions": [], "case_id": None}}

    return {
        "data": {
            "case_id":   case["id"],
            "questions": case["open_questions"],
            "answered":  case["questions_answered_count"],
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
        .select("id, user_id")
        .eq("id", payload.case_id).limit(1).execute()
    )
    if not case or case["user_id"] != user.id:
        raise HTTPException(403, "Case not found or access denied.")

    supabase_admin.table("recovery_answers").insert({
        "case_id":       payload.case_id,
        "user_id":       user.id,
        "question_id":   payload.question_id,
        "question_text": payload.question_text,
        "answer":        payload.answer,
    }).execute()

    supabase_admin.table("recovery_cases").update({
        "questions_answered_count": supabase_admin.rpc(
            "increment", {"table_name": "recovery_cases", "column": "questions_answered_count",
                          "id": payload.case_id}
        )
    }).eq("id", payload.case_id).execute()

    build_profile_graph.delay(user.id)

    return {"data": {"status": "answer_saved", "rebuild_queued": True}}


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
