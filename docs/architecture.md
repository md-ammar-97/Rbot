# RBot — Architecture Document

**Version:** 1.0  
**Date:** 2026-06-20  
**Status:** Draft — Pre-implementation  

---

## 1. System Overview

RBot is a quality-first AI co-pilot for PM job seekers. Architecturally it is a **Python FastAPI backend** with a **React frontend**, backed by **Supabase** (PostgreSQL + Auth + Storage), using **Groq** for all LLM inference, and **Playwright** for browser-assisted application flows.

The system is divided into discrete service modules that are called sequentially through a strict **Policy Engine** before any external action fires.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Frontend                          │
│   Onboarding · Profile · Recovery · Jobs · Apply · Tracker     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS / REST + WebSocket
┌───────────────────────────▼─────────────────────────────────────┐
│                     FastAPI  (Port 8000)                        │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Ingestion│  │ Recovery │  │Discovery │  │ Scoring       │  │
│  │ Service  │  │ Engine   │  │ Adapters │  │ Engine        │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       │              │              │                │           │
│  ┌────▼──────────────▼──────────────▼────────────────▼───────┐  │
│  │               Profile Graph Builder                        │  │
│  └────────────────────────────┬───────────────────────────────┘  │
│                               │                                 │
│  ┌──────────────┐  ┌──────────▼─────────┐  ┌───────────────┐  │
│  │ Drafting     │  │   Policy Engine    │  │ Tracker       │  │
│  │ Engine (LLM) │  │ (allow/restrict/   │  │ Service       │  │
│  └──────┬───────┘  │  escalate/block)   │  └───────────────┘  │
│         │          └──────────┬──────────┘                     │
│         │                     │                                 │
│  ┌──────▼─────────────────────▼──────────┐                     │
│  │           Execution Layer             │                     │
│  │  ATS API Submit · Playwright Assist   │                     │
│  └───────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
        │                    │                     │
┌───────▼───────┐  ┌─────────▼────────┐  ┌────────▼───────────┐
│   Supabase    │  │   Groq  API      │  │  External APIs     │
│  PostgreSQL   │  │  llama-3.3-70b   │  │  Greenhouse/Lever  │
│  Auth         │  │  llama-3.1-8b    │  │  GitHub Contents   │
│  Storage      │  └──────────────────┘  │  Gmail / GCal (P2) │
└───────────────┘                        └────────────────────┘
        │
┌───────▼────────────────────┐
│    n8n  (Back-office)      │
│  Scheduled job discovery   │
│  Enrichment queues         │
│  Email ingestion (Phase 2) │
└────────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + Next.js 14 (App Router) | Complex multi-step UI (Kanban, multi-file upload, review flows) needs a full React framework |
| Design system | Apple HIG (web) · Tailwind CSS + shadcn/ui | Apple color tokens, system-ui font, `#0071E3` accent — see `docs/design.md` |
| Backend | FastAPI (Python 3.11+) | Async-native, fast, type-safe via Pydantic; consistent with other user projects |
| LLM Inference | Groq — `llama-3.3-70b-versatile` (primary), `llama-3.1-8b-instant` (fast/cheap) | Consistent LLM choice across all user projects; low latency |
| Database | Supabase (PostgreSQL 15) | Structured relational data, Row Level Security, built-in Auth, S3-compatible Storage |
| Auth | Supabase Auth — **Google OAuth only** (Phase 1) | `signInWithOAuth({ provider: 'google' })`; scopes: `openid email profile`; data isolation via RLS on every table |
| File Storage | Supabase Storage | Resume uploads, LinkedIn export archives, generated resume artifacts |
| Background Jobs | Celery + Redis | Async tasks: resume parsing, job discovery polling, GitHub ingestion, LLM drafting |
| Browser Automation | Playwright (Python) | Assisted apply prefill, DOM snapshot for schema detection |
| Orchestration | n8n (self-hosted) | Scheduled discovery runs, enrichment pipelines, email polling (Phase 2) |
| Scraping (permitted) | Apify | Approved non-API job sources only; not a general scraping license |
| Job Discovery | Greenhouse Job Board API + Lever Postings API | Structured, compliant, low-maintenance |
| GitHub Integration | GitHub Contents API (public) + GitHub OAuth (private) | Project evidence extraction |
| Email/Calendar | Gmail API + Google Calendar API | Phase 2 only; narrow OAuth scopes |
| Deployment | Render (backend + workers) + Vercel (frontend) | Consistent with user's Render-based deployments |
| Environment | `.env` files; secrets never committed | `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GITHUB_CLIENT_ID`, etc. |

---

## 4. Service Decomposition

### 4.1 Ingestion Service

**Responsibility:** accept and parse all user-supplied evidence sources.

**Inputs:**
- Resume file (PDF / DOCX / TXT) via multipart upload → Supabase Storage
- LinkedIn export `.zip` (user-downloaded) → parse `Profile.csv`, `Positions.csv`, `Skills.csv`
- GitHub repository URL or OAuth token → Contents API fetch
- Manual project entries (JSON via API)
- Portfolio links (URL metadata fetch)

**Outputs:**
- Raw structured extracts per source stored in `raw_evidence` table
- Triggers Profile Graph Builder job

**LLM usage:** `llama-3.1-8b-instant` for PDF text extraction cleanup and LinkedIn CSV normalization. `llama-3.3-70b-versatile` for GitHub doc summarization.

**Constraints:**
- LinkedIn scraping is **blocked** at this layer — only accept user-uploaded export files
- GitHub: public repos → Contents API (no auth); private repos → OAuth + explicit user consent before any read

---

### 4.2 Profile Graph Builder

**Responsibility:** merge all raw evidence into a single canonical structured profile.

**Inputs:** all `raw_evidence` rows for a user

**Output schema (stored as `profiles.profile_graph` JSONB):**

```json
{
  "roles": [
    {
      "title": "Senior PM",
      "company": "Acme Corp",
      "start": "2021-03",
      "end": "2024-01",
      "type": "full-time",
      "achievements": ["Grew DAU 40% by launching X", "Led 0→1 product Y"],
      "tools": ["Jira", "Mixpanel", "Figma"],
      "domains": ["B2B SaaS", "Analytics"],
      "evidence_sources": ["resume", "github:acme-analytics/README.md"]
    }
  ],
  "skills": { "product_strategy": "high", "sql": "medium", ... },
  "tools": ["Jira", "Mixpanel", "Figma", "Amplitude"],
  "domains": ["B2B SaaS", "Analytics", "Mobile"],
  "metrics": ["DAU growth 40%", "Revenue +$2M ARR"],
  "gaps": ["No formal A/B testing experience mentioned", "PM metrics sparse in role 2"],
  "profile_completeness": 0.72,
  "evidence_confidence": "medium"
}
```

**LLM usage:** `llama-3.3-70b-versatile` for cross-source merging, conflict resolution, and achievement extraction.

---

### 4.3 Recovery Engine

**Responsibility:** diagnose resume quality and rebuild a stronger baseline before any matching begins.

**Triggered by:** Profile Graph Builder completion

**Step 1 — Quality Diagnosis (7 dimensions, each scored 0–1):**

| Dimension | Minimum threshold |
|---|---|
| Extractability | 1.0 (hard fail if PDF is image-only) |
| Completeness | 0.8 |
| Clarity | 0.7 |
| Achievement density | 0.6 (≥1 metric-backed outcome per role) |
| Role relevance | 0.7 |
| Timeline consistency | 0.9 |
| Evidence availability | 0.5 |

If any dimension is below threshold → open a **Recovery Case** and block downstream work.

**Step 2 — Targeted Clarifying Questions**

Generated by `llama-3.3-70b-versatile` from gap analysis. Maximum 5 questions per session. Examples:
- "What metric improved in this project?"
- "Did you lead roadmap prioritization or execution only?"
- "Was this role contract, internship, or full-time?"

**Step 3 — Baseline Artifact Generation**

Outputs (stored in Supabase Storage + `artifacts` table):
- `master_baseline_resume.pdf` — never auto-published; source of truth
- `profile.json` — structured profile for internal engine use

All generated content logged in `generation_log` with evidence provenance per claim.

**LLM usage:** `llama-3.3-70b-versatile` for all recovery generation.

---

### 4.4 Job Discovery Adapters

**Responsibility:** fetch fresh, structured job postings from approved sources.

**Phase 1 sources:**

| Source | API | Auth |
|---|---|---|
| Greenhouse | `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs` | None (public) |
| Lever | `GET https://api.lever.co/v0/postings/{company}` | None (public) |

**Scheduling:** n8n cron job runs every 4 hours per tracked company. Results stored in `raw_jobs` table with `fetched_at` timestamp.

**Freshness filter:** only jobs with `posting_date` within 24 hours are surfaced to users by default (configurable per user).

**Outputs:** `raw_jobs` rows → triggers Normalization Pipeline.

---

### 4.5 Normalization Pipeline

**Responsibility:** map raw job postings into canonical schema; deduplicate.

**Canonical job schema:**

```python
class CanonicalJob(BaseModel):
    job_id: str          # internal UUID, stable
    source_ids: list[str]   # all source URLs that map here
    title: str
    company: str
    location: str
    remote_eligible: bool
    sponsorship_offered: bool | None
    seniority_level: str    # "IC3" | "IC4" | "senior" | "staff" | "lead" | "director"
    domains: list[str]
    required_skills: list[str]
    preferred_skills: list[str]
    posting_date: datetime
    ats_family: str         # "greenhouse" | "lever" | "workday" | "unknown"
    application_schema: dict | None   # known fields for this posting
    quarantine: bool        # True if company validity uncertain or schema malformed
    raw_source: str
```

**Deduplication logic:**
- Primary key: `(company_normalized, title_normalized, location_normalized)`
- If match found → merge `source_ids`; update `posting_date` if newer
- If uncertain match → flag both records with `needs_review: true`; user resolves

**Quarantine triggers:** company not found in trusted business registry; posting schema malformed; apply URL 404s; salary listed as $0.

**LLM usage:** `llama-3.1-8b-instant` for title normalization and seniority classification.

---

### 4.6 Scoring Engine

**Responsibility:** produce three outputs per (user, job) pair — Fit Score, Evidence Confidence, Automation Eligibility.

**Fit Score (0–100) computation:**

```
Score = Σ(weight_i × component_score_i)

Components:
  eligibility_gates       weight: 0.30  (hard fail → score = 0 if not met)
  skill_alignment         weight: 0.25
  seniority_match         weight: 0.15
  domain_relevance        weight: 0.15
  project_evidence        weight: 0.10
  profile_completeness    weight: 0.05
```

**Eligibility gates (any fail = Fit Score 0):**
- Location: user's target geos must include job location or job must be remote
- Work authorization: job sponsorship requirement vs. user's status

**Evidence Confidence:**
- High: ≥3 skills backed by GitHub/portfolio evidence; profile_completeness ≥ 0.8
- Medium: ≥1 skill backed; profile_completeness ≥ 0.6
- Low: no external evidence; profile_completeness < 0.6

**Automation Eligibility:**
- Eligible: ATS is Greenhouse or Lever; `application_schema` is complete; Fit Score ≥ 70; Evidence Confidence ≥ Medium; user has enabled auto-apply; no custom essay questions; no ambiguous eligibility constraints
- Restricted: most conditions met but one gating condition is uncertain
- Manual Only: all other cases

**LLM usage:** none — scoring is deterministic/rule-based in Phase 1. LLM used only for generating the human-readable fit explanation.

---

### 4.7 Drafting Engine

**Responsibility:** generate tailored resume, cover letter, and outreach drafts. Every output is evidence-gated and user-reviewed before any external use.

**Resume tailoring:**
1. Select relevant roles and achievements from `profile_graph` for this specific job
2. Reorder/emphasize skills and tools matching job's `required_skills` + `preferred_skills`
3. Flag keywords in job description absent from current draft
4. Each generated section tagged with `evidence_source[]` (e.g., `["resume:role_2", "github:repo/README.md"]`)
5. Stored as draft artifact; user must approve before it is used

**Cover letter generation:**
- Role-specific, grounded in profile evidence
- Labeled as `[DRAFT — requires review]` in UI until user approves
- Maximum 350 words; structured as: hook → why this company → evidence → call to action

**Outreach drafts:**
- LinkedIn connection request (≤ 300 characters)
- Cold email (≤ 200 words)
- Follow-up message
- Generated for user to send through their own account; never sent autonomously

**Hard constraint enforcement (system prompt level):**
```
You may only reference skills, achievements, tools, and metrics
that appear in the user's profile_graph. Do not invent, infer,
or extrapolate claims. If evidence is missing, say so explicitly
and mark the section [NEEDS USER INPUT].
```

**LLM usage:** `llama-3.3-70b-versatile` for all drafting.

**Generation log:** every LLM call writes to `generation_log`:
```
generation_id | user_id | job_id | type | model | prompt_hash | output_hash
            | evidence_sources[] | user_approved | approved_at
```

---

### 4.8 Policy Engine

**Responsibility:** the single decision authority for what any service is allowed to do before an external action fires.

**Called before:** application submission, outreach handoff, profile mutation, any write to an external API.

**Decision table:**

```python
class PolicyDecision(Enum):
    ALLOW = "allow"
    RESTRICT = "restrict"    # proceed but require confidence check + user review
    ESCALATE = "escalate"    # require explicit user approval before proceeding
    BLOCK = "block"          # hard stop; log reason; surface to user
```

**Block rules (hard-coded, not configurable):**
- Action involves LinkedIn scraping → BLOCK
- Action involves autonomous message sending → BLOCK
- Generated content contains claims not in `evidence_sources` → BLOCK
- Application submission to role with Fit Score < 50 via automation → BLOCK
- CAPTCHA solving detected → BLOCK
- `quarantine: true` on job + automation requested → BLOCK

**Escalate rules:**
- Application submission (any ATS) → ESCALATE (user must confirm)
- Outreach send → ESCALATE (user must confirm per message)
- Profile field change that would affect external artifacts → ESCALATE

**All Policy Engine decisions are written to `policy_audit_log` (immutable, append-only).**

---

### 4.9 Execution Layer

**Responsibility:** carry out approved external actions.

**ATS API Submit (Greenhouse/Lever):**
- Only fires after Policy Engine returns ALLOW with user confirmation
- Constructs payload from `profile_graph` + tailored resume artifact
- Sends via Greenhouse Job Board API or Lever Application API
- Receives and stores confirmation response
- Opens rollback window: 60 seconds to cancel (if ATS API supports DELETE)

**Playwright Assisted Apply:**
- Launched in headful mode for user visibility (or headed Electron shell in desktop app)
- Pre-fills known fields from `profile_graph`; pauses at every section for user review
- Screenshots DOM state at each step; stores to `session_snapshots` table
- If schema changes mid-session → stops immediately; surfaces "Review Required" state
- Does not submit without explicit user action on the final confirmation step

---

### 4.10 Tracker Service

**Responsibility:** maintain canonical job search state with immutable history.

**State machine:**

```
Discovered → Reviewing → Tailoring → Applied
  → Outreach Sent → Recruiter Response → Interview Scheduled
  → Final Round → Offer Received → Closed (Accepted | Rejected | Withdrawn)
```

**Rules:**
- User-entered status always overrides system-inferred status
- Every state transition writes a new row to `tracker_events` (immutable; never deleted)
- Stale jobs (no event in 30+ days) auto-flagged `needs_review`
- Duplicate canonical jobs: merge suggestion surfaced to user; user decides

**Phase 2 enrichment:** Gmail API polling adds `inferred_events` with `confidence_score`. These are shown separately until user promotes them to canonical state.

---

## 5. Database Schema (Supabase PostgreSQL)

### Core Tables

```sql
-- Users (extends Supabase Auth)
profiles
  id uuid PK references auth.users
  target_roles text[]
  target_locations text[]
  remote_preference text  -- 'remote_only' | 'hybrid' | 'onsite' | 'flexible'
  work_authorization text
  sponsorship_required bool
  compensation_min int
  compensation_max int
  search_intent text      -- 'active' | 'passive' | 'exploring'
  profile_graph jsonb     -- canonical profile (see §4.2)
  recovery_status text    -- 'pending' | 'in_progress' | 'complete'
  created_at timestamptz
  updated_at timestamptz

-- Raw evidence per source
raw_evidence
  id uuid PK
  user_id uuid FK profiles
  source_type text  -- 'resume' | 'linkedin_export' | 'github' | 'manual' | 'portfolio'
  source_url text
  raw_content jsonb
  parsed_at timestamptz

-- Resume Quality Recovery
recovery_cases
  id uuid PK
  user_id uuid FK profiles
  diagnosis jsonb         -- dimension scores
  open_questions jsonb[]  -- targeted clarifying questions
  status text             -- 'open' | 'in_progress' | 'resolved'
  created_at timestamptz
  resolved_at timestamptz

-- Generated artifacts (resumes, cover letters, outreach)
artifacts
  id uuid PK
  user_id uuid FK profiles
  job_id uuid FK jobs (nullable)
  type text       -- 'baseline_resume' | 'tailored_resume' | 'cover_letter' | 'outreach'
  storage_path text   -- Supabase Storage path
  evidence_sources jsonb[]
  user_approved bool
  approved_at timestamptz
  created_at timestamptz

-- Canonical jobs
jobs
  id uuid PK
  source_ids jsonb[]       -- all source URLs
  title text
  company text
  location text
  remote_eligible bool
  sponsorship_offered bool
  seniority_level text
  domains text[]
  required_skills text[]
  preferred_skills text[]
  posting_date timestamptz
  ats_family text
  application_schema jsonb
  quarantine bool default false
  created_at timestamptz

-- Per-user job scoring
job_scores
  id uuid PK
  user_id uuid FK profiles
  job_id uuid FK jobs
  fit_score int
  evidence_confidence text
  automation_eligibility text
  score_breakdown jsonb
  fit_explanation text     -- LLM-generated human-readable summary
  scored_at timestamptz

-- Tracker state machine
tracker_items
  id uuid PK
  user_id uuid FK profiles
  job_id uuid FK jobs
  current_status text
  last_updated timestamptz
  stale_flag bool

tracker_events
  id uuid PK
  tracker_item_id uuid FK tracker_items
  event_type text      -- 'status_change' | 'note' | 'artifact_attached' | 'inferred'
  from_status text
  to_status text
  source text          -- 'user' | 'system' | 'gmail_inferred'
  confidence_score float  -- null for user-entered
  metadata jsonb
  created_at timestamptz  -- immutable; no updates

-- LLM generation audit
generation_log
  id uuid PK
  user_id uuid FK profiles
  job_id uuid FK jobs (nullable)
  type text
  model text
  prompt_hash text
  output_hash text
  evidence_sources jsonb[]
  user_approved bool
  approved_at timestamptz
  created_at timestamptz

-- Policy engine audit (append-only)
policy_audit_log
  id uuid PK
  user_id uuid FK profiles
  action text
  decision text       -- 'allow' | 'restrict' | 'escalate' | 'block'
  reason text
  metadata jsonb
  created_at timestamptz
```

**Row Level Security:** all tables scoped to `auth.uid() = user_id`. `policy_audit_log` and `tracker_events` are insert-only for the service role; no UPDATE or DELETE.

---

## 6. API Design (FastAPI)

### Route Groups

```
/auth
  GET   /auth/callback        Supabase OAuth callback (handles Google redirect)
  POST  /auth/signout         Invalidate session

/profile
  GET   /profile              Get current user profile + graph
  PATCH /profile/preferences  Update job search preferences

/intake
  POST  /intake/resume        Upload resume file
  POST  /intake/linkedin      Upload LinkedIn export zip
  POST  /intake/github        Connect GitHub repo URL or trigger OAuth
  POST  /intake/project       Add manual project entry

/recovery
  GET   /recovery/status      Current recovery case status + diagnosis
  GET   /recovery/questions   Next batch of clarifying questions
  POST  /recovery/answer      Submit answers to clarifying questions
  GET   /recovery/baseline    Download master baseline resume

/jobs
  GET   /jobs                 List jobs scored for current user (filters: fit, status, date)
  GET   /jobs/{job_id}        Job detail + fit score breakdown
  POST  /jobs/{job_id}/save   Save/unsave a job

/apply
  POST  /apply/{job_id}/prepare      Generate tailored resume + cover letter draft
  GET   /apply/{job_id}/artifacts    List artifacts for this job
  POST  /apply/{job_id}/assisted     Start Playwright assisted-apply session
  POST  /apply/{job_id}/auto         Trigger auto-apply (Policy Engine gated)
  POST  /apply/{job_id}/manual       Mark as manually applied

/outreach
  POST  /outreach/{job_id}/draft     Generate outreach drafts
  GET   /outreach/{job_id}/drafts    List outreach drafts

/tracker
  GET   /tracker                     All tracker items (Kanban data)
  PATCH /tracker/{item_id}/status    Update status (user-entered)
  POST  /tracker/{item_id}/note      Add note

/artifacts
  GET   /artifacts/{id}              Get artifact metadata
  POST  /artifacts/{id}/approve      User approves a generated artifact
```

### Response conventions

```python
# All responses
{
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "policy_decision": "allow | restrict | escalate | block",  # on write ops
    "confidence": "high | medium | low"                         # on scored resources
  }
}

# Errors
{
  "error": {
    "code": "POLICY_BLOCKED | LOW_CONFIDENCE | RECOVERY_REQUIRED | ...",
    "message": "Human-readable explanation",
    "resolution": "What the user needs to do"
  }
}
```

---

## 7. LLM Usage Summary

| Task | Model | When |
|---|---|---|
| Resume PDF cleanup / LinkedIn CSV parse | `llama-3.1-8b-instant` | Ingestion |
| GitHub doc summarization | `llama-3.3-70b-versatile` | Ingestion |
| Profile graph merge + conflict resolution | `llama-3.3-70b-versatile` | Profile Graph Builder |
| Recovery: gap analysis + question generation | `llama-3.3-70b-versatile` | Recovery Engine |
| Recovery: baseline resume generation | `llama-3.3-70b-versatile` | Recovery Engine |
| Job title normalization + seniority classification | `llama-3.1-8b-instant` | Normalization Pipeline |
| Fit explanation (human-readable) | `llama-3.1-8b-instant` | Scoring Engine |
| Resume tailoring | `llama-3.3-70b-versatile` | Drafting Engine |
| Cover letter generation | `llama-3.3-70b-versatile` | Drafting Engine |
| Outreach draft generation | `llama-3.3-70b-versatile` | Drafting Engine |

**System prompt rules (all LLM calls in Drafting Engine):**
- Evidence-only constraint injected into every system prompt
- Output includes `evidence_sources[]` JSON block for audit
- Temperature: 0.3 for tailoring/recovery; 0.6 for cover letters/outreach

**Environment variables:**
```
GROQ_API_KEY=
GROQ_PRIMARY_MODEL=llama-3.3-70b-versatile
GROQ_FAST_MODEL=llama-3.1-8b-instant
```

---

## 8. Background Jobs (Celery + Redis)

| Job name | Trigger | Description |
|---|---|---|
| `parse_resume` | Ingestion upload | Extract text + structure from resume file |
| `parse_linkedin_export` | Ingestion upload | Parse LinkedIn export CSV files |
| `ingest_github_repo` | Ingestion request | Fetch README + docs via Contents API |
| `build_profile_graph` | All intake complete | Merge evidence sources into profile graph |
| `run_recovery_diagnosis` | Profile graph ready | Score 7 dimensions; open recovery case if needed |
| `generate_baseline` | Recovery complete | Generate master baseline resume + profile JSON |
| `discover_jobs` | n8n cron (4h) | Fetch new postings from Greenhouse/Lever adapters |
| `normalize_jobs` | New raw_jobs rows | Normalize + deduplicate into canonical jobs |
| `score_jobs` | New canonical jobs | Score all new jobs against user profiles |
| `generate_draft` | User requests | Generate tailored resume / cover letter |
| `stale_job_sweep` | n8n cron (daily) | Flag tracker items with no event in 30+ days |

**Redis** used for: Celery broker + result backend; rate-limit counters for LLM calls and ATS API calls.

---

## 9. External Integration Details

### Greenhouse Job Board API
```
Base URL: https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs
Method: GET (no auth)
Params: content=true (includes job description HTML)
Rate limit: Undocumented; treat as 60 req/min per board token
```

### Lever Postings API
```
Base URL: https://api.lever.co/v0/postings/{company}
Method: GET (no auth for public postings)
Params: mode=json, commitment=full-time
Application questions: GET /v0/postings/{company}/{id}/apply
Rate limit: 100 req/min
```

### GitHub Contents API
```
Base URL: https://api.github.com/repos/{owner}/{repo}/contents/{path}
Auth: None for public repos; Bearer token for private repos (OAuth)
Target files: README.md, CONTEXT.md, CLAUDE.md, docs/ directory listing
Rate limit: 60 req/hr unauthenticated; 5000 req/hr authenticated
```

### LinkedIn (Sign-in Only)
```
OpenID Connect: https://www.linkedin.com/oauth/v2/authorization
Scopes: openid, profile, email
Returns: id, name, email, profile picture — NOT work history
User-downloaded export: parse /data/CSV_Activity.zip structure
Scraping: BLOCKED at architecture level
```

---

## 10. Security & Compliance

| Control | Implementation |
|---|---|
| Auth | Supabase Auth; all API routes require valid JWT |
| Row Level Security | `user_id = auth.uid()` on all tables |
| Secrets | `.env` file only; never committed; Supabase secret manager for production |
| Audit logs | `policy_audit_log` + `generation_log` are append-only (no UPDATE/DELETE via RLS) |
| File uploads | Supabase Storage with per-user bucket isolation; MIME type validation; 10MB limit |
| LLM prompt injection | Input sanitization before interpolation into prompts; output validation against profile graph |
| OAuth scopes | GitHub: `repo:contents` read-only; LinkedIn: `openid profile email` only; Gmail (P2): `gmail.readonly` |
| Third-party connectors | Per-source compliance register in `source_compliance` config table |
| LinkedIn policy | ToS §8.2 prohibits scraping — enforced via BLOCK policy rule |
| Data retention | User can delete account; cascading delete across all tables; Storage bucket purged |

---

## 11. Project Structure (Planned)

```
RBot/
├── context.md
├── docs/
│   ├── PRD.md
│   ├── architecture.md      ← this file
│   └── deep-research-report (2).md
│
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI app init
│   │   ├── api/                 Route handlers
│   │   │   ├── auth.py
│   │   │   ├── profile.py
│   │   │   ├── intake.py
│   │   │   ├── recovery.py
│   │   │   ├── jobs.py
│   │   │   ├── apply.py
│   │   │   ├── outreach.py
│   │   │   └── tracker.py
│   │   ├── services/            Business logic (one per service module)
│   │   │   ├── ingestion.py
│   │   │   ├── profile_graph.py
│   │   │   ├── recovery_engine.py
│   │   │   ├── discovery/
│   │   │   │   ├── greenhouse.py
│   │   │   │   └── lever.py
│   │   │   ├── normalization.py
│   │   │   ├── scoring.py
│   │   │   ├── drafting.py
│   │   │   ├── policy_engine.py
│   │   │   ├── execution.py
│   │   │   └── tracker.py
│   │   ├── workers/             Celery tasks
│   │   │   └── tasks.py
│   │   ├── models/              Pydantic schemas + SQLAlchemy models
│   │   │   ├── profile.py
│   │   │   ├── job.py
│   │   │   ├── artifact.py
│   │   │   └── tracker.py
│   │   ├── integrations/        External API clients
│   │   │   ├── groq_client.py
│   │   │   ├── github_client.py
│   │   │   ├── greenhouse_client.py
│   │   │   ├── lever_client.py
│   │   │   └── playwright_runner.py
│   │   └── core/
│   │       ├── config.py        Env + settings
│   │       ├── supabase.py      Supabase client init
│   │       └── security.py      JWT validation
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/
│   ├── app/                     Next.js App Router pages
│   │   ├── (public)/            Unauthenticated routes
│   │   │   ├── page.tsx         Homepage (/)
│   │   │   └── login/page.tsx   Login page (/login)
│   │   ├── auth/
│   │   │   └── callback/route.ts  Supabase Google OAuth callback
│   │   └── (auth)/              Auth-gated routes (middleware redirects to /login)
│   │       ├── layout.tsx       Auth guard wrapper
│   │       ├── dashboard/page.tsx
│   │       ├── onboarding/page.tsx
│   │       ├── profile/page.tsx
│   │       ├── jobs/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── apply/[id]/page.tsx
│   │       ├── tracker/page.tsx
│   │       ├── artifacts/page.tsx
│   │       └── settings/page.tsx
│   ├── components/
│   │   ├── home/                Homepage sections (HeroSection, FeaturesGrid, HowItWorks, CTABanner)
│   │   ├── auth/                LoginCard, GoogleButton
│   │   ├── layout/              Navbar, Sidebar, Footer
│   │   ├── profile/
│   │   ├── recovery/
│   │   ├── jobs/                JobCard, FitScoreBadge, EvidenceTag
│   │   ├── apply/
│   │   ├── tracker/             KanbanBoard, KanbanColumn, KanbanCard
│   │   └── shared/              SkeletonCard, ProgressStepper
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        Browser Supabase client
│   │   │   └── server.ts        Server Supabase client (RSC)
│   │   └── utils.ts
│   ├── tailwind.config.js       Apple HIG color tokens + type scale
│   └── package.json
│
└── n8n/
    └── workflows/               Exported n8n workflow JSON files
        ├── job_discovery.json
        └── stale_sweep.json
```

---

## 12. Phase 1 Build Order

Build sequentially — each step unblocks the next:

1. **Supabase setup** — schema, RLS, Storage buckets, Auth providers
2. **FastAPI skeleton** — project structure, config, Supabase client, JWT middleware
3. **Ingestion Service** — resume upload + parse, LinkedIn export parse
4. **Profile Graph Builder** — merge evidence into profile JSON
5. **Recovery Engine** — quality diagnosis + clarifying questions + baseline generation
6. **Job Discovery Adapters** — Greenhouse + Lever API clients + n8n scheduling
7. **Normalization Pipeline** — canonical schema + deduplication
8. **Scoring Engine** — Fit Score + Evidence Confidence + Automation Eligibility
9. **Drafting Engine** — tailored resume + cover letter (evidence-gated)
10. **Policy Engine** — allow/restrict/escalate/block decision table + audit log
11. **Execution Layer** — Playwright assisted apply; Greenhouse/Lever auto-apply
12. **Tracker Service** — Kanban state machine + immutable event log
13. **React Frontend** — onboarding → recovery → jobs → apply → tracker flows
14. **GitHub Integration** — OAuth + Contents API evidence extraction

---

## 13. Open Architecture Questions

| Question | Impact | Default assumption |
|---|---|---|
| Self-hosted Supabase or cloud? | Data residency, cost | Cloud (supabase.com) for Phase 1 |
| n8n self-hosted or cloud? | Secrets management | Self-hosted on Render for control |
| Playwright runner: in-process or separate microservice? | Scalability, isolation | Separate Celery worker pool with display server (Xvfb on Linux) |
| Resume PDF parsing library: PyMuPDF vs. pdfplumber vs. LLM-direct? | Extractability accuracy | PyMuPDF for text extraction; LLM for structuring |
| Frontend: Next.js SSR vs. SPA? | SEO not needed; auth-gated app | SPA mode (Next.js with `output: export` or client-only pages) |
| Rate limiting strategy for Groq? | Cost control | Token bucket per user per day; `llama-3.1-8b-instant` as fallback when budget low |
