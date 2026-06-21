-- Migration 004 — Seed source_compliance table
-- Run after 003_rls.sql

INSERT INTO source_compliance (
    source_key, discovery_allowed, scraping_allowed, auto_apply_allowed,
    outreach_allowed, profile_extract_allowed, tos_url, block_reason
) VALUES
(
    'linkedin',
    false, false, false, false, false,
    'https://www.linkedin.com/legal/user-agreement',
    'ToS §8.2 prohibits scraping and automation'
),
(
    'greenhouse',
    true, false, true, false, false,
    'https://www.greenhouse.io/terms',
    NULL
),
(
    'lever',
    true, false, true, false, false,
    'https://www.lever.co/terms',
    NULL
),
(
    'github',
    true, false, false, false, true,
    'https://docs.github.com/site-policy/github-terms/github-terms-of-service',
    NULL
);
