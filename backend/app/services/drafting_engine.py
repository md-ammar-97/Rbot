from app.integrations.groq_client import groq_chat
from app.services.groundedness import check_groundedness, check_prohibited_patterns

BASELINE_SYSTEM = """You are creating a master baseline resume for a PM job seeker from their verified profile graph.

RULES (non-negotiable):
1. Only use roles, achievements, skills, tools, and metrics present in the PROFILE GRAPH.
2. Do NOT change any numbers, percentages, or dates — reproduce them exactly as given.
3. Do NOT add roles, companies, or achievements not in the profile graph.
4. Format as clean, professional resume text: name, contact info, summary, experience, skills, education.
5. Each experience entry: company, title, dates, then 2–5 achievement bullets starting with action verbs.
6. Achievement bullets MUST include at least one metric if any metric is available in the profile graph for that role.
7. Do NOT include any ATS score, keyword density, or template markers."""

TAILORING_SYSTEM = """You are tailoring a PM candidate's baseline resume for a specific job.

RULES (non-negotiable):
1. You may ONLY use roles, achievements, skills, and metrics from the BASELINE RESUME provided.
2. Do NOT change any numbers, percentages, or dates — reproduce them exactly.
3. Do NOT add roles, companies, or achievements not in the baseline.
4. Re-order bullet points to lead with the most relevant experience for this job.
5. If a required skill is absent from the baseline, add a placeholder: [NEEDS USER INPUT: <skill>]
6. Return the full tailored resume text. Do not summarise or truncate."""

COVER_LETTER_SYSTEM = """Write a tailored PM cover letter (150–380 words, 4 paragraphs).

RULES:
1. Only reference skills, roles, and metrics present in the PROFILE GRAPH.
2. Do NOT invent experience, metrics, or company knowledge not provided.
3. Paragraph 1: compelling hook referencing the company's product or specific challenge.
4. Paragraph 2: why this company — two specific reasons from the job description.
5. Paragraph 3: evidence paragraph with at least one metric from the profile graph.
6. Paragraph 4: confident, direct call to action.
7. Do NOT open with 'I am excited to apply' or similar filler phrases.
8. Never call anything an 'ATS score' or 'keyword match'."""

OUTREACH_SYSTEM = """Write a PM networking outreach message for LinkedIn ({max_chars} character limit).

RULES:
1. Only reference skills and experience from the PROFILE GRAPH.
2. Be specific about why you are reaching out to this particular person.
3. One clear ask: a 15-minute conversation, no commitments implied.
4. Do NOT fabricate shared connections, common interests, or experience not in the profile.
5. No attachments, no resumes, no requests for referrals in the first message."""


def generate_baseline_resume(graph: dict, answers: list[dict]) -> str:
    answer_context = ""
    if answers:
        answer_context = "\n\nADDITIONAL CONTEXT FROM USER (answers to recovery questions):\n"
        for a in answers:
            answer_context += f"Q: {a.get('question_text', '')}\nA: {a.get('answer', '')}\n\n"

    output = groq_chat(
        model="llama-3.3-70b-versatile",
        system=BASELINE_SYSTEM,
        user=f"PROFILE GRAPH:\n{str(graph)[:8000]}{answer_context}",
        temperature=0.2,
        max_tokens=3000,
    )
    return output or ""


def generate_tailored_resume(baseline_text: str, job: dict, graph: dict) -> dict:
    output = groq_chat(
        model="llama-3.3-70b-versatile",
        system=TAILORING_SYSTEM,
        user=(
            f"JOB TITLE: {job.get('title')} at {job.get('company')}\n"
            f"REQUIRED SKILLS: {job.get('required_skills', [])}\n"
            f"PREFERRED SKILLS: {job.get('preferred_skills', [])}\n"
            f"JOB DOMAIN: {job.get('domains', [])}\n\n"
            f"BASELINE RESUME:\n{baseline_text}"
        ),
        temperature=0.3,
        max_tokens=3000,
    )
    groundedness = check_groundedness(output or "", graph)
    prohibited   = check_prohibited_patterns(output or "")
    return {
        "text":         output or "",
        "groundedness": groundedness,
        "prohibited":   prohibited,
    }


def generate_cover_letter(graph: dict, job: dict) -> dict:
    jd_excerpt = str(job.get("raw_payload") or "")[:2000]
    output = groq_chat(
        model="llama-3.3-70b-versatile",
        system=COVER_LETTER_SYSTEM,
        user=(
            f"JOB: {job.get('title')} at {job.get('company')}\n"
            f"JOB DESCRIPTION EXCERPT:\n{jd_excerpt}\n\n"
            f"PROFILE GRAPH:\n{str(graph)[:5000]}"
        ),
        temperature=0.6,
        max_tokens=1500,
    )
    groundedness = check_groundedness(output or "", graph)
    prohibited   = check_prohibited_patterns(output or "")
    return {
        "text":         output or "",
        "groundedness": groundedness,
        "prohibited":   prohibited,
    }


def generate_outreach(graph: dict, job: dict, recipient: dict, max_chars: int = 300) -> dict:
    system = OUTREACH_SYSTEM.format(max_chars=max_chars)
    output = groq_chat(
        model="llama-3.3-70b-versatile",
        system=system,
        user=(
            f"RECIPIENT: {recipient.get('name')} ({recipient.get('role')} at {recipient.get('company')})\n"
            f"JOB I AM INTERESTED IN: {job.get('title')} at {job.get('company')}\n\n"
            f"MY PROFILE GRAPH:\n{str(graph)[:4000]}"
        ),
        temperature=0.7,
        max_tokens=500,
    )
    groundedness = check_groundedness(output or "", graph)
    return {
        "text":           output or "",
        "character_count": len(output or ""),
        "groundedness":   groundedness,
    }


def text_to_pdf(text: str) -> bytes:
    """Convert plain text to a minimal PDF using reportlab."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        import io

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        margin   = 72  # 1 inch
        y        = height - margin
        line_h   = 14

        for line in text.splitlines():
            if y < margin:
                c.showPage()
                y = height - margin
            c.setFont("Helvetica", 11)
            # Word-wrap long lines
            max_chars = 90
            while len(line) > max_chars:
                c.drawString(margin, y, line[:max_chars])
                line = line[max_chars:]
                y -= line_h
                if y < margin:
                    c.showPage()
                    y = height - margin
            c.drawString(margin, y, line)
            y -= line_h

        c.save()
        return buffer.getvalue()
    except Exception:
        # Fallback: return text as bytes if PDF generation fails
        return text.encode("utf-8")
