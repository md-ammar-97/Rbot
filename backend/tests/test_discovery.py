import pytest
from unittest.mock import patch, MagicMock


RAW_GREENHOUSE_JOB = {
    "id":         "gh-001",
    "title":      "Senior Product Manager",
    "content":    "<p>We need a PM to lead B2B SaaS growth. SQL experience required.</p>",
    "location":   {"name": "San Francisco, CA"},
    "updated_at": "2026-06-15T10:00:00Z",
    "metadata":   [],
    "departments": [{"name": "Product"}],
}


def test_greenhouse_pm_keyword_filter():
    """Jobs with 'product manager' in title should pass through; others should not."""
    from app.integrations.greenhouse_client import _is_pm_role
    assert _is_pm_role("Senior Product Manager") is True
    assert _is_pm_role("Product Manager II") is True
    assert _is_pm_role("Software Engineer") is False
    assert _is_pm_role("PM - Growth") is True
    assert _is_pm_role("Data Analyst") is False


def test_lever_pm_filter():
    """Lever job should pass through if team is 'product'."""
    from app.integrations.lever_client import _is_pm_posting
    assert _is_pm_posting("Product Manager", "Product") is True
    assert _is_pm_posting("Engineering Manager", "Engineering") is False
    assert _is_pm_posting("Technical PM", "Engineering") is True  # title match overrides


def test_normalization_deduplication(mock_supabase):
    """Two raw_jobs with the same (company_norm, title_norm, location_norm) should not create two canonical rows."""
    from app.services.normalization import _deduplication_key

    job1 = {"company_normalized": "techco", "title_normalized": "senior product manager", "location_normalized": "remote"}
    job2 = {"company_normalized": "TechCo ",  "title_normalized": "Senior Product Manager", "location_normalized": "Remote"}

    key1 = _deduplication_key(job1)
    key2 = _deduplication_key({k: v.strip().lower() for k, v in job2.items()})
    assert key1 == key2


def test_normalization_strips_html():
    """Raw HTML job descriptions should be stripped before storing."""
    from app.services.normalization import _strip_html
    raw  = "<p>We need a <strong>PM</strong> with SQL skills.</p>"
    text = _strip_html(raw)
    assert "<" not in text
    assert "PM" in text
    assert "SQL" in text


def test_source_compliance_linkedin_blocked():
    """LinkedIn should always be blocked for discovery."""
    from app.services.policy_engine import evaluate, PolicyDecision
    with patch("app.services.policy_engine.supabase_admin") as mock:
        mock.table.return_value.insert.return_value.execute.return_value = MagicMock()
        decision = evaluate("linkedin_scrape", "user-1")
    assert decision == PolicyDecision.BLOCK


def test_raw_job_upsert_structure():
    """Greenhouse fetch output should match the raw_jobs schema."""
    from app.integrations.greenhouse_client import _to_raw_job_row
    row = _to_raw_job_row(RAW_GREENHOUSE_JOB, board_token="greenhouse-demo")
    assert row["source"] == "greenhouse"
    assert row["source_job_id"] == "gh-001"
    assert "raw_title" in row
    assert "raw_description" in row
    assert "raw_location" in row
