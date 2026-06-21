# Product Requirements Document
## RBot — AI Job Application Co-Pilot for Product Managers

**Version:** 1.0  
**Date:** 2026-06-20  
**Status:** Draft  

---

## 1. Overview

### 1.1 Product Vision

RBot is a **quality-first AI co-pilot for PM job seekers**. It helps Product Management candidates discover relevant roles, recover and strengthen weak resumes, assess fit honestly, tailor application materials without fabricating experience, identify smarter networking paths, and track the full search lifecycle from discovery to offer.

The central bet is **quality over volume**: better decision-making and stronger baseline materials—not robotic submission count—is what drives interview callbacks.

### 1.2 Problem Statement

Product Management job seekers operate inside a fragmented, low-signal workflow:

- Relevant roles are scattered across boards and career sites with no centralized freshness
- Fit assessment is manual, inconsistent, and based on gut feel
- Resumes are often generic, outdated, or unsupported by concrete project evidence
- Networking is ad hoc; no systematic way to identify the best contact paths
- Application tracking decays into spreadsheets and duplicated effort

Existing automation tools optimize for speed and submission volume, not relevance, truthfulness, or candidate reputation. The result: candidates either exhaust themselves on manual coordination or submit low-quality applications that underperform.

### 1.3 Product Principles

| Principle | What it means in practice |
|---|---|
| PM-first | Every feature is designed for the PM career path specifically |
| Quality-first | Interview conversion rate > total applications submitted |
| Truth-preserving | Generated content may only use evidence the user has provided |
| Workflow-complete | Covers discovery through offer, not just one slice |
| Compliance-aware | Platform ToS and legal constraints are non-negotiable guardrails |
| Human-supervised at boundaries | No outbound action (apply, message) fires without user approval |
| Modular | Each capability ships and operates independently; phased expansion is safe |

---

## 2. Target Users

### 2.1 Primary Segment

Serious PM job seekers who value **quality and relevance over submission velocity**.

### 2.2 Sub-segments

| Segment | Profile | Primary Need |
|---|---|---|
| Career transitioners | Adjacent roles (engineering, design, ops) moving into PM | Translate experience into PM language; close evidence gaps |
| Experienced PMs | 3–10 years in PM, conducting a targeted search | Prioritization, time savings, higher-quality tailoring |
| Internationally mobile candidates | Seeking remote or relocated roles; sponsorship-sensitive | Geography, remote eligibility, sponsorship filtering in discovery |

### 2.3 Non-target Users (Explicitly Excluded)

- High-volume applicants seeking to blast 200+ applications per week
- Non-PM job seekers (engineering, design, etc.) — addressed in a later phase if at all
- Recruiters or hiring managers

---

## 3. User Journey

```
Account Setup
     ↓
Profile Intake (resume + LinkedIn export + GitHub + portfolio)
     ↓
Resume Quality Recovery  ← MANDATORY GATE
     ↓
Job Discovery (approved structured sources, 24h freshness)
     ↓
Fit Scoring (Fit Score + Evidence Confidence + Automation Eligibility)
     ↓
     ├── High Fit → Surface immediately
     ├── Mid Fit  → Tailoring workflow
     └── Low Fit  → Visible but deprioritized, gap explanation shown
           ↓
Application Preparation
     ├── Manual Apply
     ├── Assisted Apply (prefill + review)
     └── Auto-Apply (Greenhouse/Lever eligible flows only, user-gated)
           ↓
Outreach Drafts + Contact Suggestions (parallel)
     ↓
Kanban Tracker (all activity logged, immutable audit trail)
     ↓
[Phase 2] Email/Calendar enrichment → Interview prep → Offer tracking
```

---

## 4. Feature Requirements

### 4.0 Homepage & Authentication

**Homepage (`/`) — public, unauthenticated:**
- Explains what RBot does: smart discovery, resume recovery, honest fit scoring, tailored applications, full tracker
- Single CTA: "Get Started Free →" → routes to `/login`
- Apple HIG design language: clean white, SF Pro system font, `#0071E3` accent
- Sections: Hero → Problem statement → 6 feature cards → How it works (3 steps) → CTA banner → Footer
- No sign-up form on homepage — authentication is handled on the login page

**Login page (`/login`):**
- Single auth method in Phase 1: **Google OAuth** via `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Google scopes requested: `openid email profile` (minimum — no calendar, Drive, or Gmail access)
- Data extracted from Google token: name, email, profile picture — stored in `profiles.full_name` and `profiles.avatar_url`
- On successful auth: check if `profiles.onboarding_complete = true`
  - Yes → redirect to `/dashboard`
  - No → redirect to `/onboarding`
- Each Google account maps to exactly one RBot account (matched by email)
- No password reset, no email magic link, no account linking in Phase 1

**Data isolation guarantee:**
- Every user's data is isolated at the PostgreSQL level via Supabase Row Level Security
- The policy `user_id = auth.uid()` is applied to every user-scoped table
- `auth.uid()` is derived from the verified Supabase JWT — it cannot be spoofed by application code
- No user can access another user's jobs, scores, artifacts, tracker items, recovery cases, or generated documents — even if the API has a bug

---

### 4.1 Account & Onboarding

**User inputs at setup (4-step onboarding flow):**
- Target role(s) and seniority level
- Target geographies and remote/on-site preference
- Compensation range
- Work authorization status and sponsorship requirement
- Job-search intent (active, passive, exploring)

**System behavior:**
- Persist preferences as a structured profile; all downstream matching references this
- Allow updates at any time; trigger re-scoring on material changes
- Mark `profiles.onboarding_complete = true` only after Resume Quality Recovery is complete

---

### 4.2 Profile Intake

**Accepted inputs:**
- Resume file (PDF, DOCX, or plain text)
- LinkedIn export (user-downloaded `.zip` artifact — no scraping)
- GitHub repository URL or OAuth connection
- Portfolio links (personal site, Notion, etc.)
- Manual project entries (form-based)

**Processing:**
- Parse and extract structured work history, skills, tools, metrics, domains
- Ingest GitHub `README.md`, `CONTEXT.md`, `CLAUDE.md`, and `/docs` directory files
- Convert GitHub documentation into project summaries and achievement evidence
- Merge all sources into a unified **Profile Graph**: roles → achievements → skills → tools → domains → metrics → gaps

**Constraints:**
- LinkedIn scraping is **blocked**; only user-exported artifacts are accepted
- GitHub public repos accessed via GitHub Contents API (no auth required for public); private repos via OAuth with explicit user consent

---

### 4.3 Resume Quality Recovery (Mandatory Gate)

This is the most important workflow in the product. No job matching or application work begins until recovery is complete.

**Step 1 — Quality Diagnosis**

Evaluate the uploaded resume across seven dimensions:

| Dimension | What is checked |
|---|---|
| Extractability | Is the file parseable? (Not image-only PDF, not corrupt) |
| Completeness | Are all roles, dates, and companies present? |
| Clarity | Are accomplishments stated in clear language? |
| Achievement density | Does each role have ≥1 metric-backed outcome? |
| Role relevance | Does the content connect to the PM career path? |
| Timeline consistency | Are dates coherent and gap-free (or gaps explained)? |
| Evidence availability | Are project claims verifiable via GitHub, portfolio, or metrics? |

**Step 2 — Recovery Case (if triggered)**

If any dimension scores below threshold, a recovery case is opened. The system does not proceed to matching.

Recovery actions:
- Reconstruct a stronger baseline from all available sources (resume + LinkedIn export + GitHub + manual entries)
- Build the **baseline profile graph** with all evidence mapped
- If critical fields are still missing, ask targeted clarifying questions:
  - "What metric improved in this project?"
  - "Did you lead roadmap prioritization or execution only?"
  - "Was this role contract, internship, or full-time?"
  - "What tools did you use for experimentation or analytics?"
- Limit clarifying questions to minimum missing fields needed for a trustworthy baseline

**Step 3 — Baseline Artifacts**

Output of recovery:
- **Master Baseline Resume** (source-of-truth document; never auto-published)
- **Structured Profile JSON** (used internally by matching, drafting, and scoring engines)

**UX rules:**
- Show the user their quality diagnosis with scores and specific gaps
- Surface recovery progress as a checklist, not a wall of text
- Allow users to accept or reject any suggested improvement; no silent rewrites
- Log every change with the evidence source that justified it

---

### 4.4 Job Discovery

**Sources (Phase 1):**
- Greenhouse Job Board API (public GET endpoints; no auth required)
- Lever Postings API (structured postings, application question schemas)
- Other approved ATS-native public APIs added iteratively

**Freshness constraint:** all discovered jobs must be ≤ 24 hours old at time of surfacing (or flagged clearly with posting date).

**Normalization:** every job is mapped into a canonical schema:

```
job_id (canonical, deduplicated)
title | company | location | remote_eligible | sponsorship_offered
seniority_level | domain | required_skills[] | preferred_skills[]
posting_date | source | source_url | ats_family
application_schema (if known)
```

**Deduplication:** if the same role appears from multiple sources, merge into a single canonical record; preserve all source URLs. Flag if uncertain.

**Quarantine:** jobs where company validity is uncertain or the posting schema is malformed are quarantined from auto-apply and flagged for human review.

**What is not in scope for Discovery:**
- LinkedIn scraping
- General web crawling of arbitrary career pages
- CAPTCHA-solving or session hijacking

---

### 4.5 Fit Scoring

**Three-output model** (never claim to expose employer ATS score):

| Output | Definition |
|---|---|
| **Fit Score** (0–100) | Internal assessment of conceptual match between user profile and role |
| **Evidence Confidence** (Low / Medium / High) | How well the profile can back the Fit Score with real evidence |
| **Automation Eligibility** (Eligible / Restricted / Manual Only) | Whether auto-apply is safe given source policy, schema completeness, and user permissions |

**Fit Score components:**
- Eligibility gates (location, work authorization) — hard fail if not met
- Evidence-backed skill and experience alignment
- Role and seniority match
- Domain and tool relevance
- Project evidence quality (GitHub, portfolio)
- Profile completeness and confidence

**Thresholds:**
- ≥ 85: Strong Fit — surface at top, eligible for fast-track tailoring
- 70–84: Good Fit — standard tailoring workflow, manual or assisted apply
- 50–69: Moderate Fit — visible with explicit gap explanation; user decides
- < 50: Low Fit — deprioritized; shown only if user requests

**UX rule:** always show the user *why* a score was assigned: which skills matched, which gaps drove it down, and what evidence was used.

---

### 4.6 Resume & Cover Letter Tailoring

**Resume tailoring:**
- Select the most relevant subset of the master baseline resume for the specific role
- Reorder and emphasize skills, tools, and achievements that align to job requirements
- Flag keywords present in the job description that are absent from the current draft
- Every edit must reference a source claim from the profile graph — no invented content
- User must review and approve before any tailored version is used externally

**Cover letter generation:**
- Produce a role-specific, evidence-grounded cover letter draft
- Clearly label as a draft; user edits before any send
- Do not include unsupported superlatives or fabricated experience

**Hard constraints:**
- Generated content may not introduce claims unsupported by user-provided evidence
- Every generated section includes a "source" annotation visible to the user during review
- Immutable log of all generated content and user edits is retained

---

### 4.7 Application Workflows

Three tiers based on risk and eligibility:

| Tier | Name | When | What happens |
|---|---|---|---|
| 1 | Manual Apply | Always available | System provides tailored resume, cover letter, and prefill suggestions; user applies themselves |
| 2 | Assisted Apply | When schema is known and user consents | System prefills form fields, pauses for user review at each section, user submits |
| 3 | Auto-Apply | Only when: ATS is Greenhouse/Lever, schema is complete, eligibility is confirmed, user has enabled it | System prepares and submits; confirmation shown immediately; rollback window offered |

**Eligibility engine for Auto-Apply — all conditions must be true:**
- ATS family supports structured application submission via official API
- All required fields can be populated from the profile graph with High confidence
- No custom essay questions requiring judgment calls
- No ambiguous eligibility constraints (sponsorship, clearance, etc.)
- Fit Score ≥ 70 and Evidence Confidence ≥ Medium
- User has explicitly enabled auto-apply for this role or rule set

**What is blocked in all tiers:**
- Submitting applications without user awareness
- Solving CAPTCHAs
- Bypassing explicit knock-out questions
- Applying to roles with Fit Score < 50 through automation

---

### 4.8 Outreach & Networking

**What the system generates:**
- Ranked list of relevant contacts at target company (sourced from user's network data or public sources)
- Draft LinkedIn connection request or cold email message
- Follow-up message templates (post-application, post-interview)

**What the system does not do:**
- Send messages autonomously on any platform
- Scrape LinkedIn for contacts
- Send bulk outreach without explicit per-message user approval

**User flow:** system surfaces a draft → user reviews and edits → user sends through their own account.

---

### 4.9 Application Tracker (Kanban)

**Canonical states:**

```
Discovered → Reviewing → Tailoring → Applied → Outreach Sent
     → Recruiter Response → Interview Scheduled → Final Round → Offer → Closed
```

**Data model per job card:**
- Canonical job ID (deduplicated)
- Current state + timestamp of last transition
- All source URLs
- All generated artifacts (resume version, cover letter, outreach)
- Application submission record (method, timestamp, confirmation)
- Manual notes (user-entered)
- Status confidence (if inferred from email later: confidence score + source)

**Operational rules:**
- User-entered status always overrides system-inferred status
- Immutable activity log; edits create new log entries, not overwrites
- Duplicate detection surfaces a merge suggestion; user decides
- Stale jobs (no update in 30+ days) are flagged for manual review

**Phase 2 addition:** Gmail/Calendar connectors to enrich status automatically (interview invitations, recruiter emails, calendar events) — narrow OAuth scopes, explicit consent, confidence-scored with manual override.

---

### 4.10 PM Resource Library (Phase 1 Lightweight)

- Curated collection of PM frameworks, interview guides, and case study templates
- Surfaced contextually (e.g., interview prep links appear when a role enters "Interview Scheduled")
- Full RAG concierge behavior deferred to Phase 3 to avoid slowing core job workflow

---

## 5. Automation Policy

| Action class | Examples | Policy |
|---|---|---|
| **Allowed** | Resume parsing, GitHub ingestion, job discovery, internal scoring, draft generation, tracker updates | Automated by default with logging |
| **Restricted** | Resume rewriting, form prefill, status inference from email, contact ranking | Allowed only with confidence checks and visible user review |
| **Escalated** | Submitting applications, sending outreach, handling custom essay questions | Require explicit user approval; block if confidence is low |
| **Blocked** | LinkedIn scraping, autonomous LinkedIn messaging, fabricated experience, CAPTCHA solving, silent applications | Hard disallow at architecture level |

---

## 6. Integration Architecture

| Integration | Approach | Phase |
|---|---|---|
| LinkedIn | Sign-in only (OpenID Connect); user-exported `.zip` import; no scraping | 1 |
| GitHub | Contents API for public repos; OAuth for private; extract `README.md`, `CONTEXT.md`, `CLAUDE.md`, `/docs` | 1 |
| Greenhouse | Job Board API (public GET for discovery); authenticated POST for auto-apply (eligible flows only) | 1 |
| Lever | Postings API (discovery + application questions); authenticated apply for eligible flows | 1 |
| Playwright | Assisted-apply prefill, form inspection, DOM snapshot for schema detection; NOT universal auto-submit | 1 |
| Apify | Selective orchestration for approved non-API discovery sources; not a universal scraping license | 1–2 |
| n8n | Back-office workflow orchestration (scheduled imports, enrichment, queues); never holds primary business logic or irreversible actions | 1–2 |
| Gmail API | Inbox monitoring for recruiter threads, interview detection, status inference | 2 |
| Google Calendar API | Interview event detection, follow-up reminder generation | 2 |
| Happenstance | **Unresolved** — excluded until vendor and API/compliance are confirmed | TBD |

---

## 7. Failure Recovery

| Failure mode | Recovery action |
|---|---|
| Low parse confidence on resume | Route immediately to Resume Quality Recovery; do not proceed to matching |
| Job normalization fails | Save raw posting; queue for reprocessing; do not surface to user until normalized |
| Duplicate job detected | Preserve both records; merge in UI under a review flag; user decides |
| Form schema changes mid-prefill | Stop before submission; surface "Review Required" state |
| Email-inferred status conflicts with user status | User input wins; model recalibrated |
| Company validity uncertain | Quarantine from auto-apply; flag for human review |
| Confidence below threshold at escalated action | Block action; surface explanation; offer manual path |

---

## 8. Risk Controls (Non-Negotiable)

1. **Immutable audit log** — all generated resume edits, submitted artifacts, and outbound actions are logged and cannot be silently modified
2. **Honest fit scoring** — internal Fit Score is never labeled as or confused with employer ATS score
3. **No fabrication** — generated content is blocked from introducing claims unsupported by user evidence
4. **User authorization at all outbound boundaries** — no application, message, or profile change fires without visible confirmation
5. **Minimum-scope connectors** — all third-party OAuth scopes are scoped to the narrowest permissions required
6. **Per-source compliance register** — discovery logic, contact discovery, and automation rules are governed per source; no assumption of universal permission

---

## 9. Success Metrics

### Primary

| Metric | Definition |
|---|---|
| **Interview callback rate per qualified application** | Applications that reach recruiter/hiring-manager contact / total applications submitted at Fit Score ≥ 70 |

### Supporting

| Metric | Target (indicative) |
|---|---|
| Profile recovery completion rate | % of users who complete Resume Quality Recovery before matching |
| Strong baseline achievement rate | % of users who reach Evidence Confidence ≥ High |
| Match-to-apply conversion | % of High/Good Fit jobs that proceed to application |
| Resume suggestion acceptance rate | % of tailoring suggestions accepted without rejection |
| Job freshness rate | % of discovered jobs posted within 24 hours |
| Deduplication accuracy | % of correctly merged canonical job records |
| Time saved per week | Self-reported hours saved vs. manual search workflow |
| Outreach send rate | % of generated outreach drafts that users actually send |
| Recruiter response rate | Responses / outreach messages sent |
| Offer rate | Offers received / final-round interviews |

### Anti-metrics (things the product should NOT optimize for)

- Total applications submitted (encourages spray-and-pray behavior)
- Auto-apply volume (more automation ≠ better outcomes)

---

## 10. Phased Roadmap

### Phase 1 — Core Workflow (MVP)

**Goal:** validate that quality-first PM copilot materially improves interview conversion and user trust.

**In scope:**
- Account setup and preference capture
- Profile intake (resume, LinkedIn export, GitHub, manual projects)
- Resume Quality Recovery (full recovery flow, baseline artifact generation)
- Job discovery from Greenhouse and Lever APIs
- Canonical job normalization and deduplication
- Three-output fit scoring (Fit Score + Evidence Confidence + Automation Eligibility)
- Resume and cover letter tailoring (evidence-gated, user-approved)
- Manual apply and Assisted apply workflows
- Restricted auto-apply for Greenhouse/Lever eligible flows (user-gated)
- Outreach draft generation (no autonomous sending)
- Kanban tracker (manual status management)
- Lightweight PM resource library

**Out of scope for Phase 1:**
- Gmail/Calendar connectors
- Full RAG resource concierge
- Deep interview prep modules
- Skills-gap learning recommendations

### Phase 2 — Selective Automation

**Goal:** add controlled automation where the product has earned user trust.

**In scope:**
- Gmail integration for status enrichment (narrow OAuth, confidence-scored, manual override)
- Google Calendar integration for interview detection and reminders
- Expanded ATS auto-apply eligibility (additional ATS families after compliance review)
- Contact suggestion engine
- Richer outreach flows with per-message user approval

### Phase 3 — Intelligence Deepening

**Goal:** build a knowledge moat on top of the workflow moat.

**In scope:**
- Full RAG-powered PM resource concierge
- Skills-gap identification and learning path recommendations
- Deep interview prep (case-study, behavioral, system-design coaching)
- Offer comparison and negotiation support
- Richer tracking analytics (funnel visualization, pattern detection)

---

## 11. Technical Architecture Overview

**Service decomposition:**

| Service | Responsibility |
|---|---|
| Ingestion / Extraction | Resume parsing, LinkedIn export parsing, GitHub API client |
| Profile Graph Builder | Merges all evidence sources into structured profile JSON |
| Recovery Engine | Quality diagnosis, gap detection, clarifying question flows, baseline artifact generation |
| Job Discovery Adapters | Per-source connectors (Greenhouse, Lever, Apify-orchestrated sources) |
| Normalization Pipeline | Canonical job schema, deduplication, quarantine |
| Scoring Engine | Fit Score, Evidence Confidence, Automation Eligibility computation |
| Drafting Engine | Resume tailoring, cover letter generation, outreach drafting (LLM-backed, evidence-gated) |
| Policy Engine | Automation eligibility checks, per-source compliance rules, escalation gating |
| Execution Layer | Assisted apply (Playwright), auto-apply (ATS API), outreach handoff |
| Tracker | Canonical state machine, activity log, deduplication, status inference |

**Orchestration rule:** a thin orchestration layer (n8n or equivalent) coordinates non-critical scheduled workflows. All external actions pass through the Policy Engine and Audit Log before execution. The Policy Engine is the single source of truth for what is allowed, restricted, escalated, or blocked.

**LLM usage:** all LLM calls in the Drafting Engine and Recovery Engine include the source evidence that justifies each generated claim. Evidence provenance is logged alongside the generated output. Generated content cannot reference claims not present in the Profile Graph.

---

## 12. Open Questions

| Question | Owner | Priority |
|---|---|---|
| Which LLM provider and model for drafting and recovery? | Eng | High |
| How is the Fit Score model trained/calibrated? Rule-based or ML? | Product + Eng | High |
| What is the data retention policy for user profile and application artifacts? | Legal / Product | High |
| Which additional ATS families beyond Greenhouse/Lever qualify for Phase 1 discovery? | Product | Medium |
| What is the minimum viable PM resource library at launch (curation vs. RAG)? | Product | Medium |
| Happenstance vendor identity and API: confirmed or removed? | Product | Medium |
| GDPR / data residency requirements for EU-based users? | Legal | Medium |
| How is outreach contact data sourced in a compliant way? | Legal / Product | Medium |

---

*This PRD is based on the consolidated deep-research report synthesizing Version A (strategic framing), Version B (operational workflow), and Version C (implementation pragmatism).*
