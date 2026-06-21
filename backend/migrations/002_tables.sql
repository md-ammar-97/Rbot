-- Migration 002 — Core tables
-- Run after 001_enums.sql

-- 1. profiles
CREATE TABLE profiles (
    id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name               text,
    avatar_url              text,
    target_roles            text[]              NOT NULL DEFAULT '{}',
    target_locations        text[]              NOT NULL DEFAULT '{}',
    remote_preference       remote_preference   NOT NULL DEFAULT 'flexible',
    work_authorization      text,
    sponsorship_required    bool                NOT NULL DEFAULT false,
    compensation_min        int,
    compensation_max        int,
    target_seniority        seniority_level[],
    search_intent           search_intent       NOT NULL DEFAULT 'active',
    profile_graph           jsonb,
    recovery_status         recovery_status     NOT NULL DEFAULT 'pending',
    recovery_completed_at   timestamptz,
    onboarding_complete     bool                NOT NULL DEFAULT false,
    auto_apply_enabled      bool                NOT NULL DEFAULT false,
    created_at              timestamptz         NOT NULL DEFAULT now(),
    updated_at              timestamptz         NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE INDEX idx_profiles_recovery_status ON profiles(recovery_status);

-- 2. raw_evidence
CREATE TABLE raw_evidence (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    source_type     evidence_source_type NOT NULL,
    source_url      text,
    source_label    text,
    parsed_content  jsonb           NOT NULL DEFAULT '{}',
    raw_file_path   text,
    parse_model     text,
    parse_confidence float,
    created_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_raw_evidence_user ON raw_evidence(user_id);
CREATE INDEX idx_raw_evidence_source_type ON raw_evidence(user_id, source_type);

-- 3. github_repos
CREATE TABLE github_repos (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    owner           text        NOT NULL,
    repo            text        NOT NULL,
    is_private      bool        NOT NULL DEFAULT false,
    oauth_token_ref text,
    extracted_files jsonb       NOT NULL DEFAULT '[]',
    last_synced_at  timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, owner, repo)
);

CREATE INDEX idx_github_repos_user ON github_repos(user_id);

-- 4. recovery_cases
CREATE TABLE recovery_cases (
    id                      uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    diagnosis               jsonb           NOT NULL DEFAULT '{}',
    open_questions          jsonb           NOT NULL DEFAULT '[]',
    questions_answered_count int            NOT NULL DEFAULT 0,
    status                  recovery_status NOT NULL DEFAULT 'in_progress',
    resolved_at             timestamptz,
    created_at              timestamptz     NOT NULL DEFAULT now(),
    updated_at              timestamptz     NOT NULL DEFAULT now()
);

CREATE TRIGGER recovery_cases_updated_at
    BEFORE UPDATE ON recovery_cases
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE UNIQUE INDEX idx_recovery_cases_active
    ON recovery_cases(user_id)
    WHERE status != 'complete';

CREATE INDEX idx_recovery_cases_user ON recovery_cases(user_id);

-- 5. recovery_answers
CREATE TABLE recovery_answers (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         uuid        NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    question_id     text        NOT NULL,
    question_text   text        NOT NULL,
    answer          text        NOT NULL,
    answer_applied  bool        NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recovery_answers_case ON recovery_answers(case_id);

-- 6. jobs (shared — no user FK)
CREATE TABLE jobs (
    id                      uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   text            NOT NULL,
    title_normalized        text            NOT NULL,
    company                 text            NOT NULL,
    company_normalized      text            NOT NULL,
    location                text,
    location_normalized     text,
    remote_eligible         bool,
    sponsorship_offered     bool,
    seniority_level         seniority_level,
    domains                 text[]          NOT NULL DEFAULT '{}',
    required_skills         text[]          NOT NULL DEFAULT '{}',
    preferred_skills        text[]          NOT NULL DEFAULT '{}',
    ats_family              ats_family      NOT NULL DEFAULT 'unknown',
    application_schema      jsonb,
    posting_date            timestamptz,
    first_seen_at           timestamptz     NOT NULL DEFAULT now(),
    last_refreshed_at       timestamptz     NOT NULL DEFAULT now(),
    quarantine              bool            NOT NULL DEFAULT false,
    quarantine_reason       text,
    is_stale                bool            NOT NULL DEFAULT false,
    stale_flagged_at        timestamptz,
    needs_dedup_review      bool            NOT NULL DEFAULT false,
    created_at              timestamptz     NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_jobs_dedup
    ON jobs(company_normalized, title_normalized, location_normalized)
    WHERE location_normalized IS NOT NULL;

CREATE INDEX idx_jobs_posting_date ON jobs(posting_date DESC);
CREATE INDEX idx_jobs_ats ON jobs(ats_family);
CREATE INDEX idx_jobs_quarantine ON jobs(quarantine) WHERE quarantine = true;
CREATE INDEX idx_jobs_seniority ON jobs(seniority_level);
CREATE INDEX idx_jobs_remote ON jobs(remote_eligible) WHERE remote_eligible = true;

-- 7. raw_jobs
CREATE TABLE raw_jobs (
    id              uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
    source          discovery_source    NOT NULL,
    source_job_id   text                NOT NULL,
    source_url      text                NOT NULL,
    company_raw     text                NOT NULL,
    title_raw       text                NOT NULL,
    location_raw    text,
    posting_date    timestamptz,
    raw_payload     jsonb               NOT NULL DEFAULT '{}',
    normalized      bool                NOT NULL DEFAULT false,
    canonical_job_id uuid               REFERENCES jobs(id),
    normalization_error text,
    fetched_at      timestamptz         NOT NULL DEFAULT now(),
    UNIQUE (source, source_job_id)
);

CREATE INDEX idx_raw_jobs_normalized ON raw_jobs(normalized) WHERE normalized = false;
CREATE INDEX idx_raw_jobs_canonical ON raw_jobs(canonical_job_id) WHERE canonical_job_id IS NOT NULL;
CREATE INDEX idx_raw_jobs_fetched ON raw_jobs(fetched_at DESC);

-- 8. job_sources
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

-- 9. job_scores
CREATE TABLE job_scores (
    id                      uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid                    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id                  uuid                    NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    fit_score               smallint                NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
    evidence_confidence     evidence_confidence     NOT NULL,
    automation_eligibility  automation_eligibility  NOT NULL,
    score_breakdown         jsonb                   NOT NULL DEFAULT '{}',
    fit_explanation         text,
    ineligibility_reason    text,
    automation_block_reason text,
    scored_at               timestamptz             NOT NULL DEFAULT now(),
    UNIQUE (user_id, job_id)
);

CREATE INDEX idx_job_scores_user ON job_scores(user_id);
CREATE INDEX idx_job_scores_fit ON job_scores(user_id, fit_score DESC);
CREATE INDEX idx_job_scores_eligibility ON job_scores(user_id, automation_eligibility);

-- 10. tracker_items
CREATE TABLE tracker_items (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id          uuid            NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    current_status  tracker_status  NOT NULL DEFAULT 'discovered',
    last_updated    timestamptz     NOT NULL DEFAULT now(),
    stale_flag      bool            NOT NULL DEFAULT false,
    stale_since     timestamptz,
    needs_merge_review  bool        NOT NULL DEFAULT false,
    merge_candidate_id  uuid        REFERENCES tracker_items(id),
    auto_apply_enabled  bool        NOT NULL DEFAULT false,
    auto_apply_locked   bool        NOT NULL DEFAULT false,
    created_at      timestamptz     NOT NULL DEFAULT now(),
    UNIQUE (user_id, job_id)
);

CREATE INDEX idx_tracker_items_user ON tracker_items(user_id);
CREATE INDEX idx_tracker_items_status ON tracker_items(user_id, current_status);
CREATE INDEX idx_tracker_items_stale ON tracker_items(stale_flag) WHERE stale_flag = true;

-- 11. tracker_events (immutable)
CREATE TABLE tracker_events (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    tracker_item_id uuid            NOT NULL REFERENCES tracker_items(id) ON DELETE CASCADE,
    user_id         uuid            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type      text            NOT NULL,
    from_status     tracker_status,
    to_status       tracker_status,
    source          event_source    NOT NULL DEFAULT 'user',
    confidence_score float          CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 1),
    metadata        jsonb           NOT NULL DEFAULT '{}',
    created_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracker_events_item ON tracker_events(tracker_item_id);
CREATE INDEX idx_tracker_events_user ON tracker_events(user_id);
CREATE INDEX idx_tracker_events_created ON tracker_events(created_at DESC);
CREATE INDEX idx_tracker_events_source ON tracker_events(source, user_id);

-- 12. generation_log (immutable)
CREATE TABLE generation_log (
    id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id              uuid    REFERENCES jobs(id) ON DELETE SET NULL,
    generation_type     text    NOT NULL,
    model               text    NOT NULL,
    prompt_hash         text    NOT NULL,
    output_hash         text    NOT NULL,
    evidence_sources    jsonb   NOT NULL DEFAULT '[]',
    prompt_tokens       int,
    completion_tokens   int,
    user_approved       bool    NOT NULL DEFAULT false,
    approved_at         timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_generation_log_user ON generation_log(user_id);
CREATE INDEX idx_generation_log_type ON generation_log(user_id, generation_type);
CREATE INDEX idx_generation_log_approved ON generation_log(user_id, user_approved);

-- 13. artifacts (references generation_log)
CREATE TABLE artifacts (
    id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id              uuid            REFERENCES jobs(id) ON DELETE SET NULL,
    type                artifact_type   NOT NULL,
    version             int             NOT NULL DEFAULT 1,
    storage_path        text,
    storage_bucket      text            NOT NULL DEFAULT 'artifacts',
    evidence_sources    jsonb           NOT NULL DEFAULT '[]',
    generated_by_model  text,
    generation_log_id   uuid            REFERENCES generation_log(id),
    user_approved       bool            NOT NULL DEFAULT false,
    approved_at         timestamptz,
    superseded_by       uuid            REFERENCES artifacts(id),
    created_at          timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_artifacts_user ON artifacts(user_id);
CREATE INDEX idx_artifacts_job ON artifacts(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_artifacts_type ON artifacts(user_id, type);
CREATE INDEX idx_artifacts_approved ON artifacts(user_id, user_approved);

-- 14. outreach_drafts
CREATE TABLE outreach_drafts (
    id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id              uuid            NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    artifact_id         uuid            REFERENCES artifacts(id),
    draft_type          artifact_type   NOT NULL,
    recipient_name      text,
    recipient_role      text,
    recipient_company   text,
    subject             text,
    body                text            NOT NULL,
    character_count     int,
    evidence_sources    jsonb           NOT NULL DEFAULT '[]',
    user_sent           bool            NOT NULL DEFAULT false,
    sent_at             timestamptz,
    user_discarded      bool            NOT NULL DEFAULT false,
    generation_log_id   uuid            REFERENCES generation_log(id),
    created_at          timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_user ON outreach_drafts(user_id);
CREATE INDEX idx_outreach_job ON outreach_drafts(job_id);
CREATE INDEX idx_outreach_unsent ON outreach_drafts(user_id, user_sent) WHERE user_sent = false AND user_discarded = false;

-- 15. apply_sessions
CREATE TABLE apply_sessions (
    id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id              uuid    NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    session_type        text    NOT NULL,
    ats_family          ats_family,
    status              text    NOT NULL DEFAULT 'in_progress',
    failure_reason      text,
    steps               jsonb   NOT NULL DEFAULT '[]',
    submitted_at        timestamptz,
    confirmation_payload jsonb,
    rollback_available  bool    NOT NULL DEFAULT false,
    rollback_deadline   timestamptz,
    rolled_back_at      timestamptz,
    started_at          timestamptz NOT NULL DEFAULT now(),
    completed_at        timestamptz
);

CREATE INDEX idx_apply_sessions_user ON apply_sessions(user_id);
CREATE INDEX idx_apply_sessions_job ON apply_sessions(job_id);
CREATE INDEX idx_apply_sessions_status ON apply_sessions(status) WHERE status = 'in_progress';

-- 16. policy_audit_log (immutable)
CREATE TABLE policy_audit_log (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid            REFERENCES profiles(id) ON DELETE SET NULL,
    action          text            NOT NULL,
    decision        policy_decision NOT NULL,
    rule_matched    text            NOT NULL,
    reason          text            NOT NULL,
    job_id          uuid            REFERENCES jobs(id) ON DELETE SET NULL,
    metadata        jsonb           NOT NULL DEFAULT '{}',
    created_at      timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_policy_audit_user ON policy_audit_log(user_id);
CREATE INDEX idx_policy_audit_decision ON policy_audit_log(decision);
CREATE INDEX idx_policy_audit_action ON policy_audit_log(action, decision);
CREATE INDEX idx_policy_audit_created ON policy_audit_log(created_at DESC);

-- 17. source_compliance (system table)
CREATE TABLE source_compliance (
    id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    source_key              text    NOT NULL UNIQUE,
    discovery_allowed       bool    NOT NULL DEFAULT false,
    scraping_allowed        bool    NOT NULL DEFAULT false,
    auto_apply_allowed      bool    NOT NULL DEFAULT false,
    outreach_allowed        bool    NOT NULL DEFAULT false,
    profile_extract_allowed bool    NOT NULL DEFAULT false,
    max_requests_per_minute int,
    max_requests_per_day    int,
    tos_url                 text,
    tos_last_reviewed       date,
    tos_notes               text,
    block_reason            text,
    updated_at              timestamptz NOT NULL DEFAULT now()
);
