import re


def check_groundedness(output: str, profile_graph: dict) -> dict:
    """
    Extract factual claims from generated output and verify each against profile_graph.
    Returns score (0-1), list of ungrounded claims, and verdict.

    Thresholds per ai_evals.md:
      >= 0.95 → pass
      0.80–0.95 → warn
      < 0.80 → fail
    """
    known_facts = _extract_known_facts(profile_graph)
    claims      = _extract_claims(output)

    if not claims:
        return {"score": 1.0, "total_claims": 0, "ungrounded_claims": [], "verdict": "pass"}

    ungrounded = []
    for claim in claims:
        if not any(claim.lower() in fact.lower() for fact in known_facts):
            ungrounded.append(claim)

    score = 1.0 - (len(ungrounded) / len(claims))

    return {
        "score":             round(score, 3),
        "total_claims":      len(claims),
        "ungrounded_claims": ungrounded,
        "verdict":           "pass" if score >= 0.95 else ("warn" if score >= 0.80 else "fail"),
    }


def _extract_known_facts(graph: dict) -> list[str]:
    """Flatten all string values from profile_graph into a searchable list."""
    facts = []
    for role in graph.get("roles", []):
        facts += [
            role.get("company", ""),
            role.get("title", ""),
            role.get("start_date", ""),
            role.get("end_date", "") or "",
        ]
        for achievement in role.get("achievements", []):
            facts += achievement.get("metrics", [])
            facts.append(achievement.get("text", ""))
        facts += role.get("skills", [])
        facts += role.get("tools", [])

    facts += graph.get("tools", [])
    facts += graph.get("metrics", [])
    facts += graph.get("domains", [])

    for edu in graph.get("education", []):
        facts.append(edu.get("institution", ""))
        facts.append(edu.get("degree", ""))

    return [f for f in facts if f]


def _extract_claims(text: str) -> list[str]:
    """Extract verifiable claims: percentages, dollar amounts, years, counts, proper nouns."""
    patterns = [
        r"\d+%",                                                        # percentages
        r"\$[\d,]+[KMB]?",                                             # dollar amounts
        r"\b\d{4}\b",                                                  # years
        r"\b\d+\s*(?:users?|engineers?|people|months?|weeks?|days?)\b", # counts with units
        r"\b[A-Z][a-zA-Z0-9]+(?:\s[A-Z][a-zA-Z0-9]+)+\b",            # multi-word proper nouns
        r"\b\d+x\b",                                                    # multipliers
    ]
    claims = []
    for pattern in patterns:
        claims += re.findall(pattern, text, re.MULTILINE)
    return list(set(claims))


# Red line: check for prohibited patterns (ai_evals.md §5)
PROHIBITED_PATTERNS = [
    r"ATS score",
    r"applicant tracking score",
    r"keyword score",
    r"parsed by ATS",
]


def check_prohibited_patterns(text: str) -> list[str]:
    """Return list of prohibited phrases found in the output."""
    found = []
    for pattern in PROHIBITED_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            found.append(pattern)
    return found
