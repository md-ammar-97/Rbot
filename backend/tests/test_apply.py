import pytest
from unittest.mock import patch, MagicMock
from app.services.execution import execute_auto_apply, confirm_and_submit


MOCK_JOB = {
    "id":          "job-001",
    "ats_family":  "greenhouse",
    "quarantine":  False,
    "application_schema": {"custom_questions": []},
}

MOCK_SCORE = {
    "fit_score":              80,
    "evidence_confidence":    "high",
    "automation_eligibility": "eligible",
}


def _setup_mocks(mock_supa, job=MOCK_JOB, score=MOCK_SCORE):
    table_mock = MagicMock()
    mock_supa.table.return_value = table_mock
    table_mock.select.return_value.eq.return_value.single.return_value.execute.return_value.data = job
    table_mock.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = score
    table_mock.insert.return_value.execute.return_value.data = [{"id": "session-001"}]
    table_mock.update.return_value.eq.return_value.execute.return_value.data = [{}]


def test_auto_apply_policy_block():
    """Policy Engine should block low-fit auto-apply."""
    with patch("app.services.execution.supabase_admin") as mock_supa, \
         patch("app.services.execution.evaluate") as mock_eval, \
         patch("app.services.execution.advance_tracker"):

        from app.services.policy_engine import PolicyDecision
        mock_eval.return_value = PolicyDecision.BLOCK
        _setup_mocks(mock_supa, score={**MOCK_SCORE, "fit_score": 40})

        result = execute_auto_apply("user-1", "job-001", "artifact-001")

    assert result.get("error") == "policy_blocked"


def test_auto_apply_requires_confirmation():
    """Policy ESCALATE decision should return 'requires_user_confirmation'."""
    with patch("app.services.execution.supabase_admin") as mock_supa, \
         patch("app.services.execution.evaluate") as mock_eval, \
         patch("app.services.execution.advance_tracker"):

        from app.services.policy_engine import PolicyDecision
        mock_eval.return_value = PolicyDecision.ESCALATE
        _setup_mocks(mock_supa)

        result = execute_auto_apply("user-1", "job-001", "artifact-001")

    assert result.get("status") == "requires_user_confirmation"


def test_auto_apply_successful_greenhouse():
    """A high-fit Greenhouse job should trigger submit_application and advance tracker."""
    with patch("app.services.execution.supabase_admin") as mock_supa, \
         patch("app.services.execution.evaluate") as mock_eval, \
         patch("app.services.execution.advance_tracker") as mock_tracker, \
         patch("app.integrations.greenhouse_client.submit_application") as mock_submit:

        from app.services.policy_engine import PolicyDecision
        mock_eval.return_value = PolicyDecision.ALLOW
        mock_submit.return_value = {"application_id": "gh-app-001", "status": "submitted"}
        _setup_mocks(mock_supa)

        result = execute_auto_apply("user-1", "job-001", "artifact-001")

    mock_submit.assert_called_once()
    mock_tracker.assert_called_once()
    assert result.get("status") == "submitted"


def test_auto_apply_ats_failure_updates_session():
    """If ATS call raises, apply_session should be marked failed."""
    with patch("app.services.execution.supabase_admin") as mock_supa, \
         patch("app.services.execution.evaluate") as mock_eval, \
         patch("app.services.execution.advance_tracker"), \
         patch("app.integrations.greenhouse_client.submit_application",
               side_effect=RuntimeError("ATS timeout")):

        from app.services.policy_engine import PolicyDecision
        mock_eval.return_value = PolicyDecision.ALLOW
        _setup_mocks(mock_supa)

        result = execute_auto_apply("user-1", "job-001", "artifact-001")

    assert "error" in result
    assert "ATS timeout" in result["error"]


def test_confirm_and_submit_calls_execute():
    """confirm_and_submit is a thin wrapper that re-evaluates then delegates."""
    with patch("app.services.execution.execute_auto_apply") as mock_exec, \
         patch("app.services.execution.evaluate") as mock_eval:

        from app.services.policy_engine import PolicyDecision
        mock_eval.return_value = PolicyDecision.ALLOW
        mock_exec.return_value = {"status": "submitted"}

        result = confirm_and_submit("user-1", "job-001", "artifact-001")

    mock_exec.assert_called_once_with("user-1", "job-001", "artifact-001")
    assert result["status"] == "submitted"


def test_quarantined_job_is_never_applied(mock_supabase):
    """A quarantined job should be blocked at the policy check regardless of fit."""
    with patch("app.services.execution.supabase_admin") as mock_supa, \
         patch("app.services.execution.advance_tracker"):

        from app.services.policy_engine import evaluate
        _setup_mocks(mock_supa, job={**MOCK_JOB, "quarantine": True})

        with patch("app.services.policy_engine.supabase_admin") as mp:
            mp.table.return_value.insert.return_value.execute.return_value = MagicMock()
            from app.services.policy_engine import PolicyDecision
            decision = evaluate("submit_application", "user-1", {
                "job": {"quarantine": True},
                "fit_score": 90,
                "is_automation": True,
            })

    assert decision == PolicyDecision.BLOCK
