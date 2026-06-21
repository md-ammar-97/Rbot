import io
import zipfile
import pytest
from app.services.ingestion import parse_linkedin_export, _parse_li_date


def _make_zip(files: dict[str, str]) -> bytes:
    """Create an in-memory ZIP with the given files."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name, content in files.items():
            z.writestr(name, content)
    return buf.getvalue()


# R-01: Image-only PDF detected by very short extracted text — tested via parse_confidence=0.0 path
# (Full test requires actual PyMuPDF; covered in integration tests)

def test_linkedin_valid_export():
    positions_csv = (
        "Company Name,Title,Description,Location,Started On,Finished On\n"
        "Acme Corp,Senior PM,Led product strategy,San Francisco,Jan 2021,Jan 2024\n"
    )
    skills_csv  = "Name\nSQL\nJira\n"
    profile_csv = "First Name,Last Name,Headline\nJane,Smith,Senior PM\n"

    zip_bytes = _make_zip({
        "Positions.csv": positions_csv,
        "Skills.csv":    skills_csv,
        "Profile.csv":   profile_csv,
    })
    result = parse_linkedin_export(zip_bytes)

    assert len(result["positions"]) == 1
    assert result["positions"][0]["company"] == "Acme Corp"
    assert result["positions"][0]["title"] == "Senior PM"
    assert "SQL" in result["skills"]
    assert result["profile"]["First Name"] == "Jane"


def test_linkedin_missing_required_columns():
    # L-02: Schema change — Positions.csv missing required columns
    positions_csv = "Employer,Job Title,Start\nAcme,PM,2021\n"
    skills_csv    = "Name\nSQL\n"
    profile_csv   = "First Name\nJane\n"
    zip_bytes = _make_zip({
        "Positions.csv": positions_csv,
        "Skills.csv":    skills_csv,
        "Profile.csv":   profile_csv,
    })
    with pytest.raises(ValueError, match="required columns missing"):
        parse_linkedin_export(zip_bytes)


def test_linkedin_not_a_zip():
    with pytest.raises(ValueError):
        parse_linkedin_export(b"this is not a zip file")


def test_linkedin_wrong_file_structure():
    # Not a LinkedIn export — missing expected CSV files
    zip_bytes = _make_zip({"random.csv": "col1,col2\nval1,val2\n"})
    with pytest.raises(ValueError, match="Not a LinkedIn export"):
        parse_linkedin_export(zip_bytes)


def test_parse_li_date_jan_format():
    assert _parse_li_date("Jan 2021") == "2021-01"


def test_parse_li_date_full_month():
    assert _parse_li_date("January 2021") == "2021-01"


def test_parse_li_date_empty():
    assert _parse_li_date("") is None


def test_parse_li_date_unknown_format():
    assert _parse_li_date("Q1 2021") == "Q1 2021"  # preserved verbatim
