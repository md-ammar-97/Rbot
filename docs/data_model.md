# PMFit — Data Model

**Version:** 1.1  
**Date:** 2026-06-21  
**Database:** Supabase (PostgreSQL 15)  

---

## 1. Entity Relationship Overview

```
auth.users (Supabase managed)
    │
    ▼ 1:1
profiles ──────────────────────────────────────────────────────────┐
    │                                                               │
    │ 1:many                                                        │
    ├──▶ raw_evidence                                               │
    │       └── triggers ──▶ profile_graph (JSONB field on profiles)│
    │                                                               │
    ├──▶ recovery_cases                                             │
    │       └── 1:many ──▶ recovery_answers                         │
    │                                                               │
    ├──▶ github_repos                                               │
    │                                                               │
    ├──▶ artifacts ◀─────────────────────────────┐                 │
    │       (baseline resume, tailored, covers)   │                 │
    │                                             │                 │
    ├──▶ job_scores ◀──── jobs ◀──── raw_jobs     │                 │
    │                       │                     │                 │
    │                       │ 1:many              │                 │
    │                       └──▶ job_sources      │                 │
    │                                             │                 │
    ├──▶ tracker_items ──▶ jobs                   │                 │
    │       └── 1:many                            │                 │
    │           └──▶ tracker_events               │                 │
    │                                             │                 │
    ├──▶ outreach_drafts ──▶ jobs                 │                 │
    │       └── linked ───────────────────────────┘                 │
    │                                                               │
    ├──▶ apply_sessions ──▶ jobs                                    │
    │                                                               │
    ├──▶ generation_log ──▶ jobs (nullable)                         │
    │                                                               │
    └──▶ policy_audit_log                                           │
                                                                    │
source_compliance (system table, no user FK) ───────────────────────┘
```

---

## 2. Enum Types

```sql
-- Evidence source types
CREATE TYPE evidence_source_type AS ENUM (
    'resume',
    'linkedin_export',
    'github',
    'manual_project',
    'portfolio_url'
);

-- Resume Quality Recovery status
CREATE TYPE recovery_status AS ENUM (
    'pending',        -- profile intake complete, not yet diagnosed
    'in_progress',    -- diagnosis done, recovery case open
    'complete'        -- baseline artifacts generated
);

-- Evidence confidence (used on profile and per job score)
CREATE TYPE evidence_confidence AS ENUM (
    'low',
    'medium',
    'high'
);

-- Auto-apply eligibility per job score
CREATE TYPE automation_eligibility AS ENUM (
    'eligible',       -- all conditions met; auto-apply allowed if user enables
    'restricted',     -- one gating condition uncertain; human review required
    'manual_only'     -- auto-apply not possible for this job
);

-- Canonical application tracker states
CREATE TYPE tracker_status AS ENUM (
    'discovered',
    'reviewing',
    'tailoring',
    'applied',
    'outreach_sent',
    'recruiter_response',
    'interview_scheduled',
    'final_round',
    'offer_received',
    'closed_accepted',
    'closed_rejected',
    'closed_withdrawn'
);

-- Who/what produced a tracker event
CREATE TYPE event_source AS ENUM (
    'user',
    'system',
    'gmail_inferred',
    'calendar_inferred'
);

-- Generated artifact types
CREATE TYPE artifact_type AS ENUM (
    'baseline_resume',
    'tailored_resume',
    'cover_letter',
    'outreach_linkedin',
    'outreach_email',
    'outreach_followup'
);

-- ATS platform families
CREATE TYPE ats_family AS ENUM (
    'greenhouse',
    'lever',
    'workday',
    'smartrecruiters',
    'icims',
    'ashby',
    'unknown'
);

-- Policy engine decision outcomes
CREATE TYPE policy_decision AS ENUM (
    'allow',
    'restrict',
    'escalate',
    'block'
);

-- Seniority levels (normalized)
CREATE TYPE seniority_level AS ENUM (
    'intern',
    'associate',
    'ic2',          -- entry PM / APM
    'ic3',          -- PM
    'ic4',          -- senior PM
    'staff',        -- staff PM
    'lead',         -- lead PM / group PM
    'director',
    'vp',
    'cpo'
);

-- User remote work preference
CREATE TYPE remote_preference AS ENUM (
    'remote_only',
    'hybrid',
    'onsite',
    'flexible'
);

-- User search intent
CREATE TYPE search_intent AS ENUM (
    'active',
    'passive',
    'exploring'
);

-- Job discovery sources
CREATE TYPE discovery_source AS ENUM (
    'greenhouse_api',
    'lever_api',
    'apify_actor',
    'manual_entry'
);
```

---

## 3. Table Definitions

### 3.1 `profiles`

Extends Supabase Auth. One row per user. Holds search preferences and the canonical profile graph JSONB.

```sql
CREATE TABLE profiles (
    id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Populated automatically from Google OAuth token on first sign-in
    full_name               text,               -- Google account display name
    avatar_url              text,               -- Google profile picture URL

    -- Search preferences
    target_roles            text[]              NOT NULL DEFAULT '{}',
    target_locations        text[]              NOT NULL DEFAULT '{}',
    remote_preference       remote_preference   NOT NULL DEFAULT 'flexible',
    work_authorization      text,               -- e.g. 'US citizen', 'H1B', 'EU citizen'
    sponsorship_required    bool                NOT NULL DEFAULT false,
    compensation_min        int,                -- annual, USD
    compensation_max        int,
    target_seniority        seniority_level[],
    search_intent           search_intent       NOT NULL DEFAULT 'active',

    -- Profile graph (built by Profile Graph Builder; see §5.1)
    profile_graph           jsonb,

    -- Recovery state
    recovery_status         recovery_status     NOT NULL DEFAULT 'pending',
    recovery_completed_at   timestamptz,

    -- Metadata
    onboarding_complete     bool                NOT NULL DEFAULT false,
    created_at              timestamptz         NOT NULL DEFAULT now(),
    updated_at              timestamptz         NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE INDEX idx_profiles_recovery_status ON profiles(recovery_status);
```

---

### 3.2 `raw_evidence`

One row per evidence source per user. Stores the parsed-but-unmerged content from each intake source. Immutable after creation.

```sql
CREATE TABLE raw_evidence (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    source_type     evidence_source_type NOT NULL,
    source_url      text,               -- GitHub repo URL, portfolio URL, etc.
    source_label    text,               -- human display label (e.g. "LinkedIn Export – Jun 2026")

    -- Parsed content (see §5.2 for shape per source_type)
    parsed_content  jsonb           NOT NULL DEFAULT '{}',

    -- Parsing metadata
    raw_file_path   text,               -- Supabase Storage path for uploaded file
    parse_model     text,               -- LLM model used for extraction (if any)
    parse_confidence float,             -- 0–1; low = route to recovery

    created_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_raw_evidence_user ON raw_evidence(user_id);
CREATE INDEX idx_raw_evidence_source_type ON raw_evidence(user_id, source_type);
```

---

### 3.3 `github_repos`

Tracks GitHub repositories connected by the user, and which evidence files were extracted.

```sql
CREATE TABLE github_repos (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    owner           text        NOT NULL,
    repo            text        NOT NULL,
    is_private      bool        NOT NULL DEFAULT false,
    oauth_token_ref text,           -- reference to Supabase Vault secret (never stored plain)

    -- Extracted evidence files (see §5.3)
    extracted_files jsonb       NOT NULL DEFAULT '[]',
    last_synced_at  timestamptz,

    created_at      timestamptz NOT NULL DEFAULT now(),

    UNIQUE (user_id, owner, repo)
);

CREATE INDEX idx_github_repos_user ON github_repos(user_id);
```

---

### 3.4 `recovery_cases`

One active recovery case per user at a time. Tracks the quality diagnosis and resolution progress.

```sql
CREATE TABLE recovery_cases (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Quality diagnosis (see §5.4)
    diagnosis       jsonb           NOT NULL DEFAULT '{}',

    -- Clarifying questions generated for the user
    open_questions  jsonb           NOT NULL DEFAULT '[]',   -- array of question objects
    questions_answered_count int   NOT NULL DEFAULT 0,

    status          recovery_status NOT NULL DEFAULT 'in_progress',
    resolved_at     timestamptz,

    created_at      timestamptz     NOT NULL DEFAULT now(),
    updated_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE TRIGGER recovery_cases_updated_at
    BEFORE UPDATE ON recovery_cases
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Only one open case per user
CREATE UNIQUE INDEX idx_recovery_cases_active
    ON recovery_cases(user_id)
    WHERE status != 'complete';

CREATE INDEX idx_recovery_cases_user ON recovery_cases(user_id);
```

---

### 3.5 `recovery_answers`

Stores user answers to targeted clarifying questions generated by the Recovery Engine.

```sql
CREATE TABLE recovery_answers (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         uuid        NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    question_id     text        NOT NULL,   -- stable ID from open_questions array
    question_text   text        NOT NULL,   -- snapshot of question at answer time
    answer          text        NOT NULL,
    answer_applied  bool        NOT NULL DEFAULT false,  -- has Profile Graph Builder consumed this

    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recovery_answers_case ON recovery_answers(case_id);
```

---

### 3.6 `artifacts`

All generated documents: baseline resume, tailored resumes, cover letters, outreach drafts. File content lives in Supabase Storage; this table is the metadata record.

```sql
CREATE TABLE artifacts (
    id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id              uuid            REFERENCES jobs(id) ON DELETE SET NULL,

    type                artifact_type   NOT NULL,
    version             int             NOT NULL DEFAULT 1,

    -- Supabase Storage
    storage_path        text,               -- null until file is generated
    storage_bucket      text            NOT NULL DEFAULT 'artifacts',

    -- Evidence provenance (array of source identifiers)
    evidence_sources    jsonb           NOT NULL DEFAULT '[]',
    -- e.g. ["raw_evidence:uuid", "github:owner/repo/README.md", "recovery_answers:uuid"]

    -- Generation metadata
    generated_by_model  text,
    generation_log_id   uuid            REFERENCES generation_log(id),

    -- User approval gate
    user_approved       bool            NOT NULL DEFAULT false,
    approved_at         timestamptz,

    -- Soft delete (artifacts are never hard-deleted; they may be superseded)
    superseded_by       uuid            REFERENCES artifacts(id),
    created_at          timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_artifacts_user ON artifacts(user_id);
CREATE INDEX idx_artifacts_job ON artifacts(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_artifacts_type ON artifacts(user_id, type);
CREATE INDEX idx_artifacts_approved ON artifacts(user_id, user_approved);
```

---

### 3.7 `raw_jobs`

Raw job postings as received from discovery adapters, before normalization. Append-only.

```sql
CREATE TABLE raw_jobs (
    id              uuid                PRIMARY KEY DEFAULT gen_random_uuid(),

    source          discovery_source    NOT NULL,
    source_job_id   text                NOT NULL,   -- ID from the originating API
    source_url      text                NOT NULL,
    company_raw     text                NOT NULL,
    title_raw       text                NOT NULL,
    location_raw    text,
    posting_date    timestamptz,
    raw_payload     jsonb               NOT NULL DEFAULT '{}',  -- full API response

    -- Normalization state
    normalized      bool                NOT NULL DEFAULT false,
    canonical_job_id uuid               REFERENCES jobs(id),
    normalization_error text,

    fetched_at      timestamptz         NOT NULL DEFAULT now(),

    UNIQUE (source, source_job_id)
);

CREATE INDEX idx_raw_jobs_normalized ON raw_jobs(normalized) WHERE normalized = false;
CREATE INDEX idx_raw_jobs_canonical ON raw_jobs(canonical_job_id) WHERE canonical_job_id IS NOT NULL;
CREATE INDEX idx_raw_jobs_fetched ON raw_jobs(fetched_at DESC);
```

---

### 3.8 `jobs`

Canonical, deduplicated job postings. One row per unique (company, title, location) regardless of how many sources discovered it.

```sql
CREATE TABLE jobs (
    id                      uuid            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    title                   text            NOT NULL,
    title_normalized        text            NOT NULL,   -- lowercased, stripped of punctuation
    company                 text            NOT NULL,
    company_normalized      text            NOT NULL,

    -- Location
    location                text,
    location_normalized     text,
    remote_eligible         bool,
    sponsorship_offered     bool,

    -- Classification
    seniority_level         seniority_level,
    domains                 text[]          NOT NULL DEFAULT '{}',
    required_skills         text[]          NOT NULL DEFAULT '{}',
    preferred_skills        text[]          NOT NULL DEFAULT '{}',
    ats_family              ats_family      NOT NULL DEFAULT 'unknown',

    -- Application schema (known fields for this posting)
    -- see §5.5
    application_schema      jsonb,

    -- Source tracking
    posting_date            timestamptz,
    first_seen_at           timestamptz     NOT NULL DEFAULT now(),
    last_refreshed_at       timestamptz     NOT NULL DEFAULT now(),

    -- Quality / safety flags
    quarantine              bool            NOT NULL DEFAULT false,
    quarantine_reason       text,
    is_stale                bool            NOT NULL DEFAULT false,
    stale_flagged_at        timestamptz,

    -- Deduplication
    needs_dedup_review      bool            NOT NULL DEFAULT false,

    created_at              timestamptz     NOT NULL DEFAULT now()
);

-- Deduplication key
CREATE UNIQUE INDEX idx_jobs_dedup
    ON jobs(company_normalized, title_normalized, location_normalized)
    WHERE location_normalized IS NOT NULL;

CREATE INDEX idx_jobs_posting_date ON jobs(posting_date DESC);
CREATE INDEX idx_jobs_ats ON jobs(ats_family);
CREATE INDEX idx_jobs_quarantine ON jobs(quarantine) WHERE quarantine = true;
CREATE INDEX idx_jobs_seniority ON jobs(seniority_level);
CREATE INDEX idx_jobs_remote ON jobs(remote_eligible) WHERE remote_eligible = true;
```

---

### 3.9 `job_sources`

Maps each canonical job to all raw source records that were merged into it. Enables full audit of where a job came from.

```sql
CREATE TABLE job_sources (
    id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          uuid    NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    raw_job_id      uuid    NOT NULL REFERENCES raw_jobs(id) ON DELETE CASCADE,
    source_url      text    NOT NULL,
    source          discovery_source NOT NULL,
    linked_at       timestamptz NOT NULL DEFAULT now(),

    UNIQUE (job_id, raw_job_id)
);

CREATE INDEX idx_job_sources_job ON job_sources(job_id);
```

---

### 3.10 `job_scores`

Per-user fit scores for each canonical job. Recomputed when profile_graph changes materially.

```sql
CREATE TABLE job_scores (
    id                      uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid                    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id                  uuid                    NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

    -- Three-output model
    fit_score               smallint                NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
    evidence_confidence     evidence_confidence     NOT NULL,
    automation_eligibility  automation_eligibility  NOT NULL,

    -- Breakdown (see §5.6)
    score_breakdown         jsonb                   NOT NULL DEFAULT '{}',

    -- Human-readable explanation (LLM-generated, fast model)
    fit_explanation         text,

    -- Ineligibility reason (if any eligibility gate failed)
    ineligibility_reason    text,

    -- Automation block reason (if automation_eligibility != 'eligible')
    automation_block_reason text,

    scored_at               timestamptz             NOT NULL DEFAULT now(),

    UNIQUE (user_id, job_id)
);

CREATE INDEX idx_job_scores_user ON job_scores(user_id);
CREATE INDEX idx_job_scores_fit ON job_scores(user_id, fit_score DESC);
CREATE INDEX idx_job_scores_eligibility ON job_scores(user_id, automation_eligibility);
```

---

### 3.11 `tracker_items`

One row per user per job — the user's current state in the application pipeline for that role.

```sql
CREATE TABLE tracker_items (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id          uuid            NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

    current_status  tracker_status  NOT NULL DEFAULT 'discovered',
    last_updated    timestamptz     NOT NULL DEFAULT now(),

    -- Stale detection
    stale_flag      bool            NOT NULL DEFAULT false,
    stale_since     timestamptz,

    -- Deduplication flag
    needs_merge_review  bool        NOT NULL DEFAULT false,
    merge_candidate_id  uuid        REFERENCES tracker_items(id),

    -- Auto-apply state
    auto_apply_enabled  bool        NOT NULL DEFAULT false,
    auto_apply_locked   bool        NOT NULL DEFAULT false,  -- locked after submission

    created_at      timestamptz     NOT NULL DEFAULT now(),

    UNIQUE (user_id, job_id)
);

CREATE INDEX idx_tracker_items_user ON tracker_items(user_id);
CREATE INDEX idx_tracker_items_status ON tracker_items(user_id, current_status);
CREATE INDEX idx_tracker_items_stale ON tracker_items(stale_flag) WHERE stale_flag = true;
```

---

### 3.12 `tracker_events`

**Immutable, append-only.** Every state transition, note, artifact attachment, and inferred update is a new row. Never updated or deleted.

```sql
CREATE TABLE tracker_events (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    tracker_item_id uuid            NOT NULL REFERENCES tracker_items(id) ON DELETE CASCADE,
    user_id         uuid            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    event_type      text            NOT NULL,
    -- 'status_change' | 'note' | 'artifact_attached' | 'auto_apply_submitted'
    -- 'inferred_status' | 'outreach_drafted' | 'outreach_sent' | 'stale_flagged'

    from_status     tracker_status,
    to_status       tracker_status,

    source          event_source    NOT NULL DEFAULT 'user',

    -- For inferred events only
    confidence_score float          CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 1),

    -- Freeform payload (note text, artifact_id, email thread ID, etc.)
    metadata        jsonb           NOT NULL DEFAULT '{}',

    created_at      timestamptz     NOT NULL DEFAULT now()

    -- No updated_at — this table is immutable
);

-- Enforce append-only via RLS (see §6)
CREATE INDEX idx_tracker_events_item ON tracker_events(tracker_item_id);
CREATE INDEX idx_tracker_events_user ON tracker_events(user_id);
CREATE INDEX idx_tracker_events_created ON tracker_events(created_at DESC);
CREATE INDEX idx_tracker_events_source ON tracker_events(source, user_id);
```

---

### 3.13 `outreach_drafts`

Generated outreach messages (LinkedIn, email, follow-up). Stored until user sends or discards.

```sql
CREATE TABLE outreach_drafts (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id          uuid            NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    artifact_id     uuid            REFERENCES artifacts(id),

    draft_type      artifact_type   NOT NULL,
    -- outreach_linkedin | outreach_email | outreach_followup

    recipient_name  text,
    recipient_role  text,
    recipient_company text,

    subject         text,           -- for email drafts
    body            text            NOT NULL,
    character_count int,

    evidence_sources jsonb          NOT NULL DEFAULT '[]',

    -- User action
    user_sent       bool            NOT NULL DEFAULT false,
    sent_at         timestamptz,
    user_discarded  bool            NOT NULL DEFAULT false,

    generation_log_id uuid          REFERENCES generation_log(id),
    created_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_user ON outreach_drafts(user_id);
CREATE INDEX idx_outreach_job ON outreach_drafts(job_id);
CREATE INDEX idx_outreach_unsent ON outreach_drafts(user_id, user_sent) WHERE user_sent = false AND user_discarded = false;
```

---

### 3.14 `apply_sessions`

Records of Playwright-assisted apply sessions. Stores per-step snapshots for audit and retry.

```sql
CREATE TABLE apply_sessions (
    id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id          uuid    NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

    session_type    text    NOT NULL,  -- 'assisted' | 'auto'
    ats_family      ats_family,

    status          text    NOT NULL DEFAULT 'in_progress',
    -- 'in_progress' | 'completed' | 'paused_for_review' | 'failed' | 'cancelled'

    failure_reason  text,

    -- Step-by-step snapshots (see §5.7)
    steps           jsonb   NOT NULL DEFAULT '[]',

    -- Submission result
    submitted_at    timestamptz,
    confirmation_payload jsonb,        -- ATS API response or screenshot of confirm page

    -- Rollback
    rollback_available  bool        NOT NULL DEFAULT false,
    rollback_deadline   timestamptz,
    rolled_back_at      timestamptz,

    started_at      timestamptz     NOT NULL DEFAULT now(),
    completed_at    timestamptz
);

CREATE INDEX idx_apply_sessions_user ON apply_sessions(user_id);
CREATE INDEX idx_apply_sessions_job ON apply_sessions(job_id);
CREATE INDEX idx_apply_sessions_status ON apply_sessions(status) WHERE status = 'in_progress';
```

---

### 3.15 `generation_log`

Audit trail for every LLM call that produces user-facing content. Immutable after creation.

```sql
CREATE TABLE generation_log (
    id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id              uuid    REFERENCES jobs(id) ON DELETE SET NULL,

    -- What was generated
    generation_type     text    NOT NULL,
    -- 'profile_graph' | 'recovery_diagnosis' | 'recovery_questions' | 'baseline_resume'
    -- | 'tailored_resume' | 'cover_letter' | 'outreach_linkedin' | 'outreach_email'
    -- | 'fit_explanation' | 'job_title_norm' | 'github_summary'

    -- LLM metadata
    model               text    NOT NULL,
    prompt_hash         text    NOT NULL,   -- SHA-256 of the full prompt (not stored)
    output_hash         text    NOT NULL,   -- SHA-256 of the raw output

    -- Evidence grounding
    evidence_sources    jsonb   NOT NULL DEFAULT '[]',
    -- e.g. ["raw_evidence:uuid", "github_repos:uuid:README.md"]

    -- Token usage
    prompt_tokens       int,
    completion_tokens   int,

    -- User approval state
    user_approved       bool    NOT NULL DEFAULT false,
    approved_at         timestamptz,

    created_at          timestamptz NOT NULL DEFAULT now()

    -- No updated_at — append-only
);

CREATE INDEX idx_generation_log_user ON generation_log(user_id);
CREATE INDEX idx_generation_log_type ON generation_log(user_id, generation_type);
CREATE INDEX idx_generation_log_approved ON generation_log(user_id, user_approved);
```

---

### 3.16 `policy_audit_log`

**Immutable, append-only.** Every Policy Engine decision is recorded here before any action is taken.

```sql
CREATE TABLE policy_audit_log (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid            REFERENCES profiles(id) ON DELETE SET NULL,

    -- What action was requested
    action          text            NOT NULL,
    -- 'submit_application' | 'send_outreach' | 'scrape_linkedin' | 'auto_apply'
    -- | 'update_profile' | 'fetch_github_private' | 'send_message' | ...

    -- Policy decision
    decision        policy_decision NOT NULL,
    rule_matched    text            NOT NULL,   -- which rule triggered this decision
    reason          text            NOT NULL,

    -- Context
    job_id          uuid            REFERENCES jobs(id) ON DELETE SET NULL,
    metadata        jsonb           NOT NULL DEFAULT '{}',

    created_at      timestamptz     NOT NULL DEFAULT now()

    -- No updated_at — append-only
);

CREATE INDEX idx_policy_audit_user ON policy_audit_log(user_id);
CREATE INDEX idx_policy_audit_decision ON policy_audit_log(decision);
CREATE INDEX idx_policy_audit_action ON policy_audit_log(action, decision);
CREATE INDEX idx_policy_audit_created ON policy_audit_log(created_at DESC);
```

---

### 3.17 `source_compliance`

System table (no user FK) defining per-source automation rules and compliance posture. Managed by operators, not users.

```sql
CREATE TABLE source_compliance (
    id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    source_key              text    NOT NULL UNIQUE,  -- 'linkedin' | 'greenhouse' | 'lever' | ...

    -- What is allowed for this source
    discovery_allowed       bool    NOT NULL DEFAULT false,
    scraping_allowed        bool    NOT NULL DEFAULT false,
    auto_apply_allowed      bool    NOT NULL DEFAULT false,
    outreach_allowed        bool    NOT NULL DEFAULT false,
    profile_extract_allowed bool    NOT NULL DEFAULT false,

    -- Rate limits
    max_requests_per_minute int,
    max_requests_per_day    int,

    -- Legal/ToS reference
    tos_url                 text,
    tos_last_reviewed       date,
    tos_notes               text,

    -- Block reason (if source is fully blocked)
    block_reason            text,

    updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Seed data
INSERT INTO source_compliance (source_key, discovery_allowed, scraping_allowed, auto_apply_allowed, outreach_allowed, profile_extract_allowed, tos_url, block_reason) VALUES
('linkedin',   false, false, false, false, false, 'https://www.linkedin.com/legal/user-agreement', 'ToS §8.2 prohibits scraping and automation'),
('greenhouse', true,  false, true,  false, false,  'https://www.greenhouse.io/terms', NULL),
('lever',      true,  false, true,  false, false,  'https://www.lever.co/terms', NULL),
('github',     true,  false, false, false, true,   'https://docs.github.com/site-policy/github-terms/github-terms-of-service', NULL);
```

---

## 4. Storage Buckets (Supabase Storage)

| Bucket | Contents | Access |
|---|---|---|
| `resume-uploads` | Raw uploaded resume files (PDF, DOCX) | Private; owner only |
| `linkedin-exports` | User-downloaded LinkedIn export ZIPs | Private; owner only |
| `artifacts` | Generated baseline + tailored resumes, cover letters | Private; owner only |
| `session-snapshots` | Playwright session screenshots + DOM dumps | Private; owner only |

**File naming convention:**
```
{bucket}/{user_id}/{year}-{month}/{uuid}.{ext}
```

**Upload limits:** 10 MB per file. Accepted MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`, `application/zip`.

---

## 5. JSONB Schema Definitions

### 5.1 `profiles.profile_graph`

```json
{
  "roles": [
    {
      "id": "role_uuid",
      "title": "Senior Product Manager",
      "company": "Acme Corp",
      "company_normalized": "acme corp",
      "start_date": "2021-03",
      "end_date": "2024-01",
      "is_current": false,
      "employment_type": "full-time",
      "location": "San Francisco, CA",
      "description": "Led 0→1 launch of analytics product...",
      "achievements": [
        {
          "text": "Grew DAU 40% in 6 months by launching personalized feed",
          "metrics": ["DAU +40%", "6 months"],
          "skills_demonstrated": ["roadmap prioritization", "A/B testing"],
          "evidence_sources": ["raw_evidence:uuid1", "github:acme/analytics/README.md"]
        }
      ],
      "skills": ["roadmap prioritization", "SQL", "Mixpanel", "stakeholder management"],
      "tools": ["Jira", "Mixpanel", "Figma", "Looker"],
      "domains": ["B2B SaaS", "Analytics"],
      "evidence_sources": ["raw_evidence:uuid1"],
      "confidence": "high"
    }
  ],
  "skills": {
    "product_strategy": { "level": "high", "evidence_count": 4 },
    "sql": { "level": "medium", "evidence_count": 2 },
    "a_b_testing": { "level": "high", "evidence_count": 3 },
    "stakeholder_management": { "level": "high", "evidence_count": 5 }
  },
  "tools": ["Jira", "Mixpanel", "Figma", "Looker", "Amplitude", "SQL"],
  "domains": ["B2B SaaS", "Analytics", "Mobile"],
  "education": [
    {
      "institution": "University of Michigan",
      "degree": "BSc Computer Science",
      "graduation_year": 2019
    }
  ],
  "metrics": [
    "DAU +40% (Acme, 2022)",
    "Revenue +$2M ARR (Acme, 2023)"
  ],
  "gaps": [
    "No formal A/B testing framework mentioned for role_uuid2",
    "PM metrics sparse in pre-2020 roles"
  ],
  "profile_completeness": 0.78,
  "evidence_confidence": "medium",
  "last_built_at": "2026-06-20T10:00:00Z"
}
```

---

### 5.2 `raw_evidence.parsed_content` (by source_type)

**resume:**
```json
{
  "full_text": "...",
  "sections": {
    "contact": { "name": "...", "email": "...", "linkedin": "..." },
    "summary": "...",
    "experience": [...],
    "skills": [...],
    "education": [...]
  },
  "extraction_method": "pymupdf",
  "char_count": 3200,
  "is_image_only": false
}
```

**linkedin_export:**
```json
{
  "positions": [
    { "title": "...", "company": "...", "started_on": "...", "finished_on": "...", "description": "..." }
  ],
  "skills": ["...", "..."],
  "education": [...],
  "recommendations_received": 3
}
```

**github:**
```json
{
  "repo": "owner/repo-name",
  "files_extracted": [
    {
      "path": "README.md",
      "content": "...",
      "summary": "AI-powered analytics dashboard. Built with FastAPI + React...",
      "skills_identified": ["FastAPI", "React", "PostgreSQL"],
      "achievement_hints": ["reduced query time by 60%"]
    }
  ]
}
```

**manual_project:**
```json
{
  "project_name": "Analytics Dashboard",
  "description": "Led 0→1 build of ...",
  "role": "PM",
  "duration": "6 months",
  "outcome": "Reduced customer churn by 15%",
  "tools": ["Mixpanel", "SQL"],
  "skills": ["roadmap", "stakeholder mgmt"]
}
```

---

### 5.3 `github_repos.extracted_files`

```json
[
  {
    "path": "README.md",
    "raw_storage_path": "github-content/user_id/owner-repo/README.md",
    "extracted_at": "2026-06-20T10:00:00Z",
    "included_in_evidence_id": "raw_evidence:uuid"
  },
  {
    "path": "CONTEXT.md",
    "raw_storage_path": "github-content/user_id/owner-repo/CONTEXT.md",
    "extracted_at": "2026-06-20T10:00:00Z",
    "included_in_evidence_id": "raw_evidence:uuid"
  }
]
```

---

### 5.4 `recovery_cases.diagnosis`

```json
{
  "dimensions": {
    "extractability":        { "score": 1.0, "threshold": 1.0, "passed": true,  "note": null },
    "completeness":          { "score": 0.6, "threshold": 0.8, "passed": false, "note": "Missing dates on 2 roles" },
    "clarity":               { "score": 0.8, "threshold": 0.7, "passed": true,  "note": null },
    "achievement_density":   { "score": 0.4, "threshold": 0.6, "passed": false, "note": "3 of 5 roles have no metric-backed outcomes" },
    "role_relevance":        { "score": 0.7, "threshold": 0.7, "passed": true,  "note": null },
    "timeline_consistency":  { "score": 0.9, "threshold": 0.9, "passed": true,  "note": null },
    "evidence_availability": { "score": 0.5, "threshold": 0.5, "passed": true,  "note": null }
  },
  "overall_score": 0.71,
  "failed_dimensions": ["completeness", "achievement_density"],
  "recovery_required": true,
  "diagnosed_at": "2026-06-20T10:05:00Z"
}
```

**`recovery_cases.open_questions`:**
```json
[
  {
    "id": "q_001",
    "dimension": "achievement_density",
    "role_id": "role_uuid2",
    "question": "What metric improved as a result of the feature you shipped at Acme in 2022?",
    "answer_type": "text",
    "required": true,
    "answered": false
  },
  {
    "id": "q_002",
    "dimension": "completeness",
    "role_id": "role_uuid4",
    "question": "Was your role at StartupX a contract, internship, or full-time position?",
    "answer_type": "select",
    "options": ["contract", "internship", "full-time", "part-time"],
    "required": true,
    "answered": false
  }
]
```

---

### 5.5 `jobs.application_schema`

```json
{
  "ats_family": "greenhouse",
  "apply_url": "https://boards.greenhouse.io/acme/jobs/123456",
  "api_endpoint": "https://boards-api.greenhouse.io/v1/boards/acme/jobs/123456",
  "required_files": ["resume"],
  "optional_files": ["cover_letter"],
  "standard_fields": [
    { "name": "first_name", "type": "text", "required": true },
    { "name": "last_name",  "type": "text", "required": true },
    { "name": "email",      "type": "email", "required": true },
    { "name": "phone",      "type": "phone", "required": false },
    { "name": "linkedin",   "type": "url",   "required": false }
  ],
  "custom_questions": [
    {
      "id": "q_123",
      "label": "Why do you want to work at Acme?",
      "type": "textarea",
      "required": true,
      "disqualifies_auto_apply": true
    }
  ],
  "eeo_section": true,
  "work_auth_question": true,
  "schema_captured_at": "2026-06-20T08:00:00Z",
  "schema_confidence": "high"
}
```

**Automation eligibility rules derived from this schema:**
- Any `custom_questions` with `disqualifies_auto_apply: true` → `automation_eligibility = manual_only`
- `schema_confidence` of `low` → `automation_eligibility = restricted`
- Missing `api_endpoint` → `automation_eligibility = manual_only`

---

### 5.6 `job_scores.score_breakdown`

```json
{
  "eligibility_gates": {
    "passed": true,
    "location_match": true,
    "work_auth_match": true,
    "sponsorship_required": false
  },
  "components": {
    "skill_alignment":     { "score": 0.82, "weight": 0.25, "matched": ["roadmap prioritization", "SQL", "A/B testing"], "missing": ["Amplitude"] },
    "seniority_match":     { "score": 0.90, "weight": 0.15, "user_level": "ic4", "job_level": "ic4" },
    "domain_relevance":    { "score": 0.75, "weight": 0.15, "matched": ["B2B SaaS"], "missing": ["Fintech"] },
    "project_evidence":    { "score": 0.70, "weight": 0.10, "github_repos_matched": 2 },
    "profile_completeness":{ "score": 0.78, "weight": 0.05 }
  },
  "weighted_total": 78,
  "version": "v1"
}
```

---

### 5.7 `apply_sessions.steps`

```json
[
  {
    "step": 1,
    "label": "Personal Information",
    "status": "completed",
    "fields_prefilled": ["first_name", "last_name", "email", "phone"],
    "fields_requiring_input": [],
    "screenshot_path": "session-snapshots/user_id/session_id/step_01.png",
    "completed_at": "2026-06-20T11:01:00Z"
  },
  {
    "step": 2,
    "label": "Resume Upload",
    "status": "completed",
    "artifact_id": "artifacts:uuid",
    "completed_at": "2026-06-20T11:01:30Z"
  },
  {
    "step": 3,
    "label": "Custom Questions",
    "status": "paused_for_review",
    "reason": "Custom essay question detected — requires human input",
    "paused_at": "2026-06-20T11:02:00Z"
  }
]
```

---

## 6. Row Level Security (RLS)

All tables except `source_compliance`, `policy_audit_log` (partially), and `raw_jobs` / `jobs` (shared) use user-scoped RLS.

```sql
-- Enable RLS on all user-scoped tables
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_evidence          ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_repos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_cases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_answers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_scores            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_drafts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE apply_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_audit_log      ENABLE ROW LEVEL SECURITY;

-- Standard user-owns-their-data policy (apply to all user-scoped tables)
CREATE POLICY "users_own_data" ON profiles
    USING (id = auth.uid());

CREATE POLICY "users_own_data" ON raw_evidence
    USING (user_id = auth.uid());

-- (repeat pattern for all user-scoped tables)

-- tracker_events and generation_log and policy_audit_log: INSERT-only for users
-- (no UPDATE, no DELETE — enforced by withholding those permissions)
CREATE POLICY "tracker_events_insert_only" ON tracker_events
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "tracker_events_select" ON tracker_events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "generation_log_insert_only" ON generation_log
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "generation_log_select" ON generation_log
    FOR SELECT USING (user_id = auth.uid());

-- policy_audit_log: INSERT by service role only; SELECT by owner
CREATE POLICY "policy_audit_select" ON policy_audit_log
    FOR SELECT USING (user_id = auth.uid());
-- INSERT is service_role only (set via Supabase dashboard)

-- jobs and raw_jobs: readable by all authenticated users; writable by service_role only
ALTER TABLE jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_jobs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_readable" ON jobs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "raw_jobs_service_only" ON raw_jobs
    USING (auth.role() = 'service_role');

-- source_compliance: read-only for authenticated; write by service_role only
ALTER TABLE source_compliance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "source_compliance_readable" ON source_compliance
    FOR SELECT USING (auth.role() = 'authenticated');
```

---

## 7. Key Indexes Summary

| Table | Index | Purpose |
|---|---|---|
| `profiles` | `recovery_status` | Filter users awaiting recovery |
| `raw_evidence` | `(user_id, source_type)` | Fetch evidence by type for profile build |
| `raw_jobs` | `normalized = false` | Normalization worker queue |
| `raw_jobs` | `(source, source_job_id)` UNIQUE | Deduplication on ingest |
| `jobs` | `(company_norm, title_norm, location_norm)` UNIQUE | Canonical deduplication |
| `jobs` | `posting_date DESC` | Freshness-sorted job feeds |
| `jobs` | `quarantine = true` | Quarantine review queue |
| `job_scores` | `(user_id, fit_score DESC)` | Ranked job list per user |
| `job_scores` | `(user_id, automation_eligibility)` | Auto-apply candidate filter |
| `tracker_items` | `(user_id, current_status)` | Kanban column queries |
| `tracker_items` | `stale_flag = true` | Stale sweep worker |
| `tracker_events` | `tracker_item_id` | Event history per item |
| `outreach_drafts` | `(user_id, user_sent = false)` | Pending outreach feed |
| `generation_log` | `(user_id, generation_type)` | Audit by type |
| `policy_audit_log` | `(action, decision)` | Policy analytics / alerting |

---

## 8. Data Flow Summary

```
1. User uploads resume
       └──▶ raw_evidence (source_type='resume') created
               └──▶ [Celery: parse_resume] → raw_evidence.parsed_content populated

2. User uploads LinkedIn export
       └──▶ raw_evidence (source_type='linkedin_export') created
               └──▶ [Celery: parse_linkedin_export] → parsed_content populated

3. User connects GitHub repo
       └──▶ github_repos row created
               └──▶ [Celery: ingest_github_repo] → Contents API fetch → raw_evidence (source_type='github')

4. All intake sources present
       └──▶ [Celery: build_profile_graph] → profiles.profile_graph JSONB updated

5. Profile graph built
       └──▶ [Celery: run_recovery_diagnosis] → recovery_cases row created
               └── if failed dimensions: recovery_cases.status = 'in_progress'
               │       └──▶ user answers recovery_answers
               │               └──▶ [Celery: build_profile_graph] (re-run with answers)
               └── if all passed: profiles.recovery_status = 'complete'
                       └──▶ [Celery: generate_baseline] → artifacts (baseline_resume) created

6. Recovery complete
       └──▶ [n8n cron → Celery: discover_jobs] → raw_jobs rows created
               └──▶ [Celery: normalize_jobs] → jobs + job_sources rows created
                       └──▶ [Celery: score_jobs] → job_scores rows created

7. User requests tailoring for a job
       └──▶ [Celery: generate_draft] → artifacts (tailored_resume, cover_letter) created
               └──▶ generation_log row created (user_approved=false)
                       └──▶ user reviews → artifacts.user_approved = true

8. User initiates apply
       └──▶ policy_engine called → policy_audit_log row created
               └── decision=allow + user confirms → apply_sessions row created
               │       └──▶ Playwright / ATS API → apply_sessions.steps updated
               │               └──▶ on submit: tracker_events (status_change: applied)
               └── decision=block → surface reason to user; no action taken
```

---

## 9. Account Data Isolation

Every user's data is **completely isolated at the database level**. This is enforced by PostgreSQL Row Level Security, not application code — meaning a bug in the API cannot leak cross-user data.

### How it works

**Auth flow:**
1. User signs in with Google via `supabase.auth.signInWithOAuth({ provider: 'google' })`
2. Supabase creates or matches an `auth.users` row (matched by email)
3. A JWT is issued; its `sub` claim is the user's UUID (`auth.uid()`)
4. `profiles` row is created with `id = auth.uid()`, `full_name`, and `avatar_url` from Google token
5. All subsequent requests carry this JWT in the `Authorization: Bearer` header
6. Supabase evaluates `auth.uid()` on **every query** against every RLS policy

**RLS enforcement:**

```sql
-- Every user-scoped table has this policy (or equivalent)
CREATE POLICY "users_own_data" ON profiles
    USING (id = auth.uid());

-- The same pattern on all 15 user-scoped tables:
-- raw_evidence, github_repos, recovery_cases, recovery_answers,
-- artifacts, job_scores, tracker_items, tracker_events,
-- outreach_drafts, apply_sessions, generation_log, policy_audit_log
```

`auth.uid()` is derived from the verified Supabase JWT. It cannot be overridden by the application, injected via query parameters, or guessed from another user's UUID.

**What this means in practice:**
- A request authenticated as user A that queries `job_scores` will only return rows where `user_id = A`. Rows for user B are invisible — they are filtered by PostgreSQL before the result is returned.
- The `jobs`, `raw_jobs`, and `source_compliance` tables are shared (no user FK) but are read-only for users; only the service role can write to them.
- The `tracker_events`, `generation_log`, and `policy_audit_log` tables are INSERT-only for users — no UPDATE or DELETE is permitted, preserving the immutable audit trail.

**Google account mapping:**
- One Google account (identified by email) → one Supabase `auth.users` row → one `profiles` row
- All data, artifacts, tracker items, and scores belong to that single profile
- If a user signs in from a different device, they access the same account (same email → same `auth.uid()`)
- Account deletion cascades via `ON DELETE CASCADE` across all user-scoped tables and purges Supabase Storage buckets

---

## 10. Naming Conventions

| Convention | Rule |
|---|---|
| Table names | `snake_case`, plural nouns |
| Column names | `snake_case` |
| Enum types | `snake_case` |
| Primary keys | Always `id uuid DEFAULT gen_random_uuid()` |
| Foreign keys | `{referenced_table_singular}_id` |
| Timestamps | `created_at`, `updated_at`, `{event}_at` (never `createdAt`) |
| Boolean columns | `is_` prefix for state (`is_current`, `is_stale`); plain noun for flags (`quarantine`, `stale_flag`) |
| JSONB columns | Named by what they hold, not `data` or `payload` (e.g., `profile_graph`, `score_breakdown`) |
| Indexes | `idx_{table}_{columns}` |
| Immutable tables | No `updated_at` column; INSERT-only RLS |
| Normalized text | Suffix `_normalized` (e.g., `company_normalized`) — always lowercase, stripped punctuation |
