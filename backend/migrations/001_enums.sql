-- Migration 001 — Enum types
-- Run this first in Supabase SQL Editor

-- Enable required extension for moddatetime trigger
CREATE EXTENSION IF NOT EXISTS moddatetime;

CREATE TYPE evidence_source_type AS ENUM (
    'resume',
    'linkedin_export',
    'github',
    'manual_project',
    'portfolio_url'
);

CREATE TYPE recovery_status AS ENUM (
    'pending',
    'in_progress',
    'complete'
);

CREATE TYPE evidence_confidence AS ENUM (
    'low',
    'medium',
    'high'
);

CREATE TYPE automation_eligibility AS ENUM (
    'eligible',
    'restricted',
    'manual_only'
);

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

CREATE TYPE event_source AS ENUM (
    'user',
    'system',
    'gmail_inferred',
    'calendar_inferred'
);

CREATE TYPE artifact_type AS ENUM (
    'baseline_resume',
    'tailored_resume',
    'cover_letter',
    'outreach_linkedin',
    'outreach_email',
    'outreach_followup'
);

CREATE TYPE ats_family AS ENUM (
    'greenhouse',
    'lever',
    'workday',
    'smartrecruiters',
    'icims',
    'ashby',
    'unknown'
);

CREATE TYPE policy_decision AS ENUM (
    'allow',
    'restrict',
    'escalate',
    'block'
);

CREATE TYPE seniority_level AS ENUM (
    'intern',
    'associate',
    'ic2',
    'ic3',
    'ic4',
    'staff',
    'lead',
    'director',
    'vp',
    'cpo'
);

CREATE TYPE remote_preference AS ENUM (
    'remote_only',
    'hybrid',
    'onsite',
    'flexible'
);

CREATE TYPE search_intent AS ENUM (
    'active',
    'passive',
    'exploring'
);

CREATE TYPE discovery_source AS ENUM (
    'greenhouse_api',
    'lever_api',
    'apify_actor',
    'manual_entry'
);
