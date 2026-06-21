import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture
def mock_supabase():
    """Mock Supabase admin client for unit tests."""
    with patch("app.core.supabase.supabase_admin") as mock:
        mock.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {}
        mock.table.return_value.insert.return_value.execute.return_value.data = [{"id": "test-uuid"}]
        mock.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{}]
        yield mock


@pytest.fixture
def mock_groq():
    """Mock Groq client to avoid real LLM calls in tests."""
    with patch("app.integrations.groq_client._client") as mock:
        mock.chat.completions.create.return_value.choices = [
            MagicMock(message=MagicMock(content='{"roles": [], "skills": {}, "tools": [], "domains": [], "metrics": [], "gaps": [], "profile_completeness": 0.5, "evidence_confidence": "low"}'))
        ]
        yield mock


@pytest.fixture
def sample_profile_graph():
    return {
        "roles": [
            {
                "id": "role_abc123",
                "title": "Senior Product Manager",
                "company": "Acme Corp",
                "company_normalized": "acme corp",
                "start_date": "2021-03",
                "end_date": "2024-01",
                "is_current": False,
                "achievements": [
                    {
                        "text": "Grew DAU 40% in 6 months",
                        "metrics": ["DAU +40%", "6 months"],
                        "skills_demonstrated": ["roadmap prioritization"],
                        "evidence_sources": ["raw_evidence:test-uuid"],
                    }
                ],
                "skills": ["roadmap prioritization", "SQL"],
                "tools": ["Jira", "Mixpanel"],
                "domains": ["B2B SaaS"],
                "evidence_sources": ["raw_evidence:test-uuid"],
            }
        ],
        "skills": {"roadmap_prioritization": {"level": "high", "evidence_count": 3}},
        "tools": ["Jira", "Mixpanel", "Figma"],
        "domains": ["B2B SaaS"],
        "metrics": ["DAU +40% (Acme, 2022)"],
        "gaps": [],
        "profile_completeness": 0.8,
        "evidence_confidence": "medium",
    }


@pytest.fixture
def sample_job():
    return {
        "id": "job-uuid-001",
        "title": "Senior Product Manager",
        "title_normalized": "senior product manager",
        "company": "TechCo",
        "company_normalized": "techco",
        "location_normalized": "remote",
        "remote_eligible": True,
        "sponsorship_offered": None,
        "seniority_level": "ic4",
        "ats_family": "greenhouse",
        "domains": ["B2B SaaS"],
        "required_skills": ["roadmap prioritization", "SQL", "Mixpanel"],
        "preferred_skills": ["Amplitude"],
        "quarantine": False,
        "application_schema": {"custom_questions": []},
    }
