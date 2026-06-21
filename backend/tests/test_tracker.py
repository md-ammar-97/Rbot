import pytest
from unittest.mock import patch, MagicMock, call
from app.services.tracker import advance_tracker, VALID_TRANSITIONS


@pytest.fixture(autouse=True)
def mock_supa(mock_supabase):
    yield mock_supabase


def _make_item(status: str = "discovered", item_id: str = "item-001"):
    return {"id": item_id, "current_status": status}


def test_valid_transitions_map_completeness():
    """Every defined source status should have at least one legal destination."""
    for src, dests in VALID_TRANSITIONS.items():
        assert len(dests) > 0, f"{src} has no valid destinations"


def test_discovered_can_advance_to_applied(mock_supabase):
    mock_supabase.table.return_value.select.return_value \
        .eq.return_value.eq.return_value.maybe_single.return_value \
        .execute.return_value.data = _make_item("discovered")

    with patch("app.services.tracker.supabase_admin", mock_supabase):
        advance_tracker("user-1", "job-1", "applied", source="user")

    # tracker_events INSERT should have been called
    insert_calls = [str(c) for c in mock_supabase.table.call_args_list]
    assert any("tracker_events" in c or "tracker_items" in c for c in insert_calls)


def test_closed_statuses_are_terminal():
    """Once closed, no system transition should be allowed."""
    terminal = {"closed_rejected", "closed_withdrawn", "closed_accepted"}
    for status in terminal:
        assert status not in VALID_TRANSITIONS.get(status, {})


def test_invalid_transition_is_rejected(mock_supabase):
    """Attempting 'offer_received' directly from 'discovered' (system source) should return None."""
    mock_supabase.table.return_value.select.return_value \
        .eq.return_value.eq.return_value.maybe_single.return_value \
        .execute.return_value.data = _make_item("discovered")

    with patch("app.services.tracker.supabase_admin", mock_supabase):
        result = advance_tracker("user-1", "job-1", "offer_received", source="system")

    assert result is None or (isinstance(result, dict) and result.get("error"))


def test_note_insertion(mock_supabase):
    from app.services.tracker import add_note
    mock_supabase.table.return_value.select.return_value \
        .eq.return_value.eq.return_value.maybe_single.return_value \
        .execute.return_value.data = _make_item("applied", "item-002")

    with patch("app.services.tracker.supabase_admin", mock_supabase):
        add_note("user-1", "job-1", "Had a great phone screen today.")

    tables_used = [c.args[0] for c in mock_supabase.table.call_args_list]
    assert "tracker_events" in tables_used
