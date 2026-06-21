import pytest
from unittest.mock import patch, MagicMock
from app.services.scoring import (
    _skill_alignment, _seniority_match, _domain_relevance,
    _evidence_confidence, _automation_eligibility, _check_location,
    _check_work_auth, _infer_user_seniority,
)


GRAPH = {
    "roles": [{"title": "Senior Product Manager", "start_date": "2021-03",
               "evidence_sources": ["raw_evidence:1"]}],
    "skills": {"roadmap_prioritization": {"level": "high", "evidence_count": 3}},
    "tools":   ["Jira", "Mixpanel", "SQL"],
    "domains": ["B2B SaaS"],
    "profile_completeness": 0.8,
}

JOB = {
    "required_skills": ["SQL", "Mixpanel", "Amplitude"],
    "seniority_level": "ic4",
    "domains":         ["B2B SaaS", "Fintech"],
    "ats_family":      "greenhouse",
    "quarantine":      False,
    "application_schema": {"custom_questions": []},
    "location_normalized": "remote",
    "remote_eligible": True,
}


def test_skill_alignment_partial():
    score = _skill_alignment(GRAPH, JOB)
    assert 0.0 < score < 1.0  # SQL and Mixpanel match, Amplitude doesn't


def test_skill_alignment_no_requirements():
    score = _skill_alignment(GRAPH, {**JOB, "required_skills": []})
    assert score == 0.6  # neutral


def test_seniority_exact_match():
    score = _seniority_match(GRAPH, JOB)
    assert score == 1.0  # ic4 inferred from "Senior PM", job requires ic4


def test_seniority_one_level_off():
    score = _seniority_match(GRAPH, {**JOB, "seniority_level": "ic3"})
    assert score == 0.75  # 1 level diff → 1.0 - 0.25


def test_domain_relevance_partial():
    score = _domain_relevance(GRAPH, JOB)
    assert score == 0.5  # "B2B SaaS" matches 1 of 2 job domains


def test_evidence_confidence_no_github():
    conf = _evidence_confidence(GRAPH)
    assert conf == "medium"  # completeness 0.8 but no github


def test_automation_eligibility_no_auto_apply_enabled():
    profile = {"auto_apply_enabled": False, "sponsorship_required": False, "target_locations": []}
    elig, reason = _automation_eligibility(JOB, 80, "medium", profile)
    assert elig == "restricted"
    assert reason == "auto_apply_not_enabled"


def test_automation_eligibility_fit_too_low():
    profile = {"auto_apply_enabled": True, "sponsorship_required": False, "target_locations": []}
    elig, reason = _automation_eligibility(JOB, 65, "high", profile)
    assert elig == "manual_only"
    assert reason == "fit_score_below_70"


def test_automation_eligibility_unsupported_ats():
    profile = {"auto_apply_enabled": True, "sponsorship_required": False, "target_locations": []}
    elig, reason = _automation_eligibility({**JOB, "ats_family": "workday"}, 80, "high", profile)
    assert elig == "manual_only"
    assert reason == "unsupported_ats"


def test_location_gate_remote_eligible():
    profile = {"target_locations": ["New York"], "sponsorship_required": False}
    assert _check_location(profile, {**JOB, "remote_eligible": True}) is True


def test_location_gate_mismatch():
    profile = {"target_locations": ["New York"], "sponsorship_required": False}
    assert _check_location(profile, {**JOB, "remote_eligible": False,
                                     "location_normalized": "san francisco"}) is False


def test_work_auth_blocks_when_no_sponsorship():
    profile = {"sponsorship_required": True}
    assert _check_work_auth(profile, {"sponsorship_offered": False}) is False


def test_work_auth_passes_when_sponsorship_unknown():
    profile = {"sponsorship_required": True}
    assert _check_work_auth(profile, {"sponsorship_offered": None}) is True


def test_infer_seniority_from_title():
    graph = {"roles": [{"title": "Senior PM", "start_date": "2022-01"}]}
    assert _infer_user_seniority(graph) == "ic4"
