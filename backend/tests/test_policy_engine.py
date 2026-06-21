import pytest
from unittest.mock import patch, MagicMock
from app.services.policy_engine import evaluate, PolicyDecision


@pytest.fixture(autouse=True)
def mock_log():
    with patch("app.services.policy_engine.supabase_admin") as mock:
        mock.table.return_value.insert.return_value.execute.return_value = MagicMock()
        yield mock


def test_linkedin_scrape_is_blocked():
    decision = evaluate("linkedin_scrape", "user-123")
    assert decision == PolicyDecision.BLOCK


def test_autonomous_message_is_blocked():
    decision = evaluate("send_autonomous_message", "user-123")
    assert decision == PolicyDecision.BLOCK


def test_captcha_solve_is_blocked():
    decision = evaluate("captcha_solve", "user-123")
    assert decision == PolicyDecision.BLOCK


def test_low_fit_auto_apply_is_blocked():
    decision = evaluate("submit_application", "user-123", {
        "job": {"quarantine": False},
        "fit_score": 45,
        "is_automation": True,
    })
    assert decision == PolicyDecision.BLOCK


def test_quarantined_job_is_blocked():
    decision = evaluate("submit_application", "user-123", {
        "job": {"quarantine": True},
        "fit_score": 85,
        "is_automation": True,
    })
    assert decision == PolicyDecision.BLOCK


def test_fabricated_content_is_blocked():
    decision = evaluate("submit_application", "user-123", {
        "job": {"quarantine": False},
        "fit_score": 80,
        "is_automation": True,
        "groundedness_verdict": "fail",
    })
    assert decision == PolicyDecision.BLOCK


def test_valid_application_requires_escalation():
    decision = evaluate("submit_application", "user-123", {
        "job": {"quarantine": False},
        "fit_score": 80,
        "is_automation": False,
    })
    assert decision == PolicyDecision.ESCALATE


def test_outreach_requires_escalation():
    decision = evaluate("send_outreach", "user-123", {"job_id": "job-001"})
    assert decision == PolicyDecision.ESCALATE


def test_internal_operation_is_allowed():
    decision = evaluate("get_profile", "user-123")
    assert decision == PolicyDecision.ALLOW


def test_low_confidence_form_prefill_is_restricted():
    decision = evaluate("form_prefill", "user-123", {"confidence": "low"})
    assert decision == PolicyDecision.RESTRICT


def test_high_confidence_form_prefill_is_allowed():
    decision = evaluate("form_prefill", "user-123", {"confidence": "high"})
    assert decision == PolicyDecision.ALLOW
