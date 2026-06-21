"""
Shared Pydantic schemas for request/response models.
Each router file also defines inline models; this module holds cross-cutting types.
"""
from pydantic import BaseModel
from typing import Any


class HealthResponse(BaseModel):
    status:  str
    version: str
    env:     str


class DiscoveryTriggerResponse(BaseModel):
    status: str
    queued: bool


class ArtifactOut(BaseModel):
    id:                   str
    user_id:              str
    job_id:               str | None
    type:                 str
    version:              int
    storage_path:         str
    storage_bucket:       str
    evidence_sources:     list[str]
    generated_by_model:   str
    groundedness_score:   float | None
    user_approved:        bool
    approved_at:          str | None
    created_at:           str


class FitScoreOut(BaseModel):
    fit_score:              int
    evidence_confidence:    str   # low | medium | high
    automation_eligibility: str   # eligible | restricted | manual_only
    fit_explanation:        str
    score_breakdown:        dict[str, Any]
    ineligibility_reason:   str | None
    automation_block_reason: str | None
    scored_at:              str


class TrackerItemOut(BaseModel):
    id:                 str
    current_status:     str
    last_updated:       str
    stale_flag:         bool
    auto_apply_enabled: bool
    job_id:             str


class PolicyLogOut(BaseModel):
    id:          str
    user_id:     str
    action:      str
    decision:    str
    rule_matched: str | None
    reason:      str | None
    context_snapshot: dict[str, Any] | None
    created_at:  str
