-- Migration 003 — Row Level Security policies
-- Run after 002_tables.sql

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
ALTER TABLE jobs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_compliance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sources           ENABLE ROW LEVEL SECURITY;

-- profiles: each user sees only their own row
CREATE POLICY "users_own_data" ON profiles
    USING (id = auth.uid());

CREATE POLICY "users_insert_own" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- raw_evidence
CREATE POLICY "users_own_data" ON raw_evidence
    USING (user_id = auth.uid());

CREATE POLICY "users_insert_own" ON raw_evidence
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- github_repos
CREATE POLICY "users_own_data" ON github_repos
    USING (user_id = auth.uid());

CREATE POLICY "users_insert_own" ON github_repos
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own" ON github_repos
    FOR UPDATE USING (user_id = auth.uid());

-- recovery_cases
CREATE POLICY "users_own_data" ON recovery_cases
    USING (user_id = auth.uid());

-- recovery_answers
CREATE POLICY "users_own_data" ON recovery_answers
    USING (user_id = auth.uid());

CREATE POLICY "users_insert_own" ON recovery_answers
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- artifacts
CREATE POLICY "users_own_data" ON artifacts
    USING (user_id = auth.uid());

-- job_scores
CREATE POLICY "users_own_data" ON job_scores
    USING (user_id = auth.uid());

-- tracker_items
CREATE POLICY "users_own_data" ON tracker_items
    USING (user_id = auth.uid());

CREATE POLICY "users_insert_own" ON tracker_items
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own" ON tracker_items
    FOR UPDATE USING (user_id = auth.uid());

-- tracker_events: INSERT-only for users (immutable audit log)
CREATE POLICY "tracker_events_insert_only" ON tracker_events
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "tracker_events_select" ON tracker_events
    FOR SELECT USING (user_id = auth.uid());

-- outreach_drafts
CREATE POLICY "users_own_data" ON outreach_drafts
    USING (user_id = auth.uid());

CREATE POLICY "users_insert_own" ON outreach_drafts
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_own" ON outreach_drafts
    FOR UPDATE USING (user_id = auth.uid());

-- apply_sessions
CREATE POLICY "users_own_data" ON apply_sessions
    USING (user_id = auth.uid());

-- generation_log: INSERT-only for users (immutable)
CREATE POLICY "generation_log_insert_only" ON generation_log
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "generation_log_select" ON generation_log
    FOR SELECT USING (user_id = auth.uid());

-- policy_audit_log: SELECT by owner; INSERT by service_role only
CREATE POLICY "policy_audit_select" ON policy_audit_log
    FOR SELECT USING (user_id = auth.uid());

-- jobs: readable by all authenticated users; writable by service_role only
CREATE POLICY "jobs_readable" ON jobs
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- raw_jobs: service_role only
CREATE POLICY "raw_jobs_service_only" ON raw_jobs
    USING (auth.role() = 'service_role');

-- job_sources: readable by authenticated
CREATE POLICY "job_sources_readable" ON job_sources
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- source_compliance: read-only for authenticated
CREATE POLICY "source_compliance_readable" ON source_compliance
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
