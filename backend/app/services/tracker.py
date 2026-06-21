from app.core.supabase import supabase_admin

VALID_TRANSITIONS: dict[str, set[str]] = {
    "discovered":         {"reviewing", "tailoring", "applied", "closed_withdrawn"},
    "reviewing":          {"tailoring", "applied", "closed_withdrawn"},
    "tailoring":          {"applied", "closed_withdrawn"},
    "applied":            {"outreach_sent", "recruiter_response", "closed_rejected", "closed_withdrawn"},
    "outreach_sent":      {"recruiter_response", "closed_rejected", "closed_withdrawn"},
    "recruiter_response": {"interview_scheduled", "closed_rejected", "closed_withdrawn"},
    "interview_scheduled": {"final_round", "closed_rejected", "closed_withdrawn"},
    "final_round":        {"offer_received", "closed_rejected", "closed_withdrawn"},
    "offer_received":     {"closed_accepted", "closed_rejected", "closed_withdrawn"},
}


def advance_tracker(
    user_id: str,
    job_id: str,
    new_status: str,
    source: str = "user",
    metadata: dict | None = None,
    confidence: float | None = None,
) -> str | None:
    """
    Move a tracker_item to new_status and write an immutable tracker_event.
    Returns the tracker_item id, or None if no action was taken.
    """
    existing = supabase_admin.table("tracker_items").select("*") \
               .eq("user_id", user_id).eq("job_id", job_id).maybe_single().execute()

    if existing.data:
        item_id     = existing.data["id"]
        from_status = existing.data["current_status"]
    else:
        result = supabase_admin.table("tracker_items").insert({
            "user_id":        user_id,
            "job_id":         job_id,
            "current_status": "discovered",
        }).execute()
        item_id     = result.data[0]["id"]
        from_status = "discovered"

    # System transitions are validated; user-entered statuses bypass the machine
    if source != "user" and new_status not in VALID_TRANSITIONS.get(from_status, set()):
        return None  # Invalid system transition — ignore silently

    # Write immutable event
    supabase_admin.table("tracker_events").insert({
        "tracker_item_id": item_id,
        "user_id":         user_id,
        "event_type":      "status_change",
        "from_status":     from_status,
        "to_status":       new_status,
        "source":          source,
        "confidence_score": confidence,
        "metadata":        metadata or {},
    }).execute()

    # Update mutable state
    supabase_admin.table("tracker_items").update({
        "current_status": new_status,
        "last_updated":   "now()",
        "stale_flag":     False,
    }).eq("id", item_id).execute()

    return item_id


def add_note(user_id: str, job_id: str, note: str) -> None:
    existing = supabase_admin.table("tracker_items").select("id") \
               .eq("user_id", user_id).eq("job_id", job_id).maybe_single().execute()
    if not existing.data:
        return
    supabase_admin.table("tracker_events").insert({
        "tracker_item_id": existing.data["id"],
        "user_id":         user_id,
        "event_type":      "note",
        "source":          "user",
        "metadata":        {"note": note},
    }).execute()
