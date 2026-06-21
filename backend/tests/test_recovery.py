import pytest
from unittest.mock import patch, MagicMock
from app.services.recovery_engine import (
    diagnose_profile,
    _score_extractability,
    _score_completeness,
    _score_achievement_density,
    _score_timeline_consistency,
)


FULL_PROFILE = {
    "roles": [
        {
            "id":        "role_abc",
            "title":     "Senior PM",
            "company":   "Acme",
            "start_date": "2021-03",
            "end_date":   "2024-01",
            "is_current": False,
            "achievements": [
                {"text": "Grew DAU 40%", "metrics": ["DAU +40%"], "skills_demonstrated": ["roadmap"]},
                {"text": "Shipped 3 products", "metrics": ["3 products"], "skills_demonstrated": []},
            ],
            "skills":          ["SQL", "Jira"],
            "domains":         ["B2B SaaS"],
            "evidence_sources": ["raw_evidence:r1"],
        }
    ],
    "skills":              {"sql": {"level": "high", "evidence_count": 4}},
    "tools":               ["Jira", "SQL", "Mixpanel", "Figma"],
    "domains":             ["B2B SaaS"],
    "metrics":             ["DAU +40% (Acme, 2022)"],
    "gaps":                [],
    "profile_completeness": 0.85,
    "evidence_confidence": "high",
}

SPARSE_PROFILE = {
    "roles": [
        {
            "id":            "role_xyz",
            "title":         "PM",
            "company":       "Startup",
            "start_date":    "2019-01",
            "end_date":      "2020-01",
            "is_current":    False,
            "achievements":  [],
            "skills":        [],
            "domains":       [],
            "evidence_sources": ["raw_evidence:r2"],
        }
    ],
    "skills":              {},
    "tools":               [],
    "domains":             [],
    "metrics":             [],
    "gaps":                ["achievement_density", "evidence_availability"],
    "profile_completeness": 0.3,
    "evidence_confidence": "low",
}


def test_diagnose_full_profile_no_recovery_required():
    result = diagnose_profile(FULL_PROFILE)
    assert result["recovery_required"] is False


def test_diagnose_sparse_profile_requires_recovery():
    result = diagnose_profile(SPARSE_PROFILE)
    assert result["recovery_required"] is True
    assert len(result["failing_dimensions"]) > 0


def test_extractability_with_evidence():
    score = _score_extractability(FULL_PROFILE)
    assert score >= 0.7


def test_extractability_no_evidence():
    profile = {**FULL_PROFILE, "roles": [
        {**FULL_PROFILE["roles"][0], "evidence_sources": []}
    ]}
    score = _score_extractability(profile)
    assert score < 0.7


def test_completeness_sparse():
    score = _score_completeness(SPARSE_PROFILE)
    assert score <= 0.5


def test_completeness_full():
    score = _score_completeness(FULL_PROFILE)
    assert score > 0.6


def test_achievement_density_empty():
    score = _score_achievement_density(SPARSE_PROFILE)
    assert score < 0.5


def test_achievement_density_with_metrics():
    score = _score_achievement_density(FULL_PROFILE)
    assert score >= 0.5


def test_timeline_consistency_no_overlap():
    score = _score_timeline_consistency(FULL_PROFILE)
    assert score >= 0.8


def test_timeline_consistency_with_overlap():
    profile = {
        **FULL_PROFILE,
        "roles": [
            {**FULL_PROFILE["roles"][0], "start_date": "2020-01", "end_date": "2023-01"},
            {
                "id": "role_2",
                "title": "Advisor",
                "company": "OtherCo",
                "start_date": "2021-06",
                "end_date": "2022-06",
                "is_current": False,
                "achievements": [],
                "skills": [],
                "domains": [],
                "evidence_sources": [],
            },
        ],
    }
    score = _score_timeline_consistency(profile)
    # Overlap is allowed (advisory roles); score should not crash
    assert 0.0 <= score <= 1.0


def test_open_recovery_case(mock_supabase):
    from app.services.recovery_engine import open_recovery_case
    diagnosis = diagnose_profile(SPARSE_PROFILE)

    with patch("app.services.recovery_engine.supabase_admin", mock_supabase):
        with patch("app.services.recovery_engine.groq_chat") as mock_groq:
            mock_groq.return_value = [
                {
                    "id":          "q1",
                    "dimension":   "achievement_density",
                    "role_id":     "role_xyz",
                    "question":    "What was the biggest impact you made at Startup?",
                    "answer_type": "text",
                    "required":    True,
                }
            ]
            open_recovery_case("user-1", diagnosis)

    tables_used = [c.args[0] for c in mock_supabase.table.call_args_list]
    assert "recovery_cases" in tables_used
