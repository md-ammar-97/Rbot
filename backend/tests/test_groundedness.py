import pytest
from app.services.groundedness import check_groundedness, check_prohibited_patterns


GRAPH = {
    "roles": [
        {
            "company": "Acme Corp",
            "title":   "Senior PM",
            "start_date": "2021-03",
            "achievements": [{"text": "Grew DAU 40% in 6 months", "metrics": ["DAU +40%", "6 months"]}],
        }
    ],
    "tools": ["Jira", "Mixpanel"],
    "metrics": ["DAU +40% (Acme, 2022)"],
}


def test_pass_when_all_grounded():
    output = "As Senior PM at Acme Corp, grew DAU 40% in 6 months using Jira and Mixpanel."
    result = check_groundedness(output, GRAPH)
    assert result["verdict"] == "pass"
    assert result["score"] >= 0.95


def test_fail_on_fabricated_metric():
    output = "Increased revenue by $10M ARR at GlobalBank over 18 months using Salesforce."
    result = check_groundedness(output, GRAPH)
    assert result["verdict"] in ("warn", "fail")
    assert len(result["ungrounded_claims"]) > 0


def test_no_claims_returns_pass():
    output = "A product manager with experience in cross-functional team leadership."
    result = check_groundedness(output, GRAPH)
    assert result["verdict"] == "pass"
    assert result["total_claims"] == 0


def test_prohibited_pattern_ats_score():
    text = "This resume has been optimised for ATS score compatibility."
    found = check_prohibited_patterns(text)
    assert "ATS score" in found


def test_prohibited_pattern_keyword_score():
    text = "Your keyword score is 92/100."
    found = check_prohibited_patterns(text)
    assert len(found) > 0


def test_known_company_name_passes():
    output = "Led product strategy at Acme Corp from 2021 to 2024."
    result = check_groundedness(output, GRAPH)
    assert result["verdict"] == "pass"
