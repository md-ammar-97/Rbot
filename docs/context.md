# RBot — Project Context

## What is RBot?

RBot is an **AI Job Application Co-Pilot for Product Managers**. It helps PM job seekers discover relevant roles, recover and strengthen weak resumes, assess fit honestly, tailor application materials without fabricating experience, identify smarter networking paths, and track the full search lifecycle from discovery to offer.

The core thesis: **quality over volume**. Better decision-making and stronger baseline materials — not submission count — is what drives interview callbacks.

## Current Status

| Item | Status |
|---|---|
| Deep research report | Done |
| PRD | Done |
| Architecture design | Done |
| Data model | Done |
| Design system | Done |
| Implementation | Done |
| Supabase project + migrations | Done |
| Storage buckets | Done |
| Google OAuth | Done |
| Backend .env | Done (service_key filled) |
| Frontend .env.local | Done |
| GitHub push | Ready — waiting to execute |
| Render deploy | Pending GitHub push |
| Vercel deploy | Pending Render deploy |
| n8n workflow | Built + Dockerfile ready |

**Active phase:** Ready to push to GitHub and deploy. Run `DEPLOYMENT.md` steps in order.

### Infrastructure
- **Supabase project:** `ogecgrhzretnkgehyifi` (ap-south-1 / Mumbai)
- **URL:** `https://ogecgrhzretnkgehyifi.supabase.co`
- **Migrations applied:** 001–005 (all 17 tables, enums, RLS, seed, profile trigger)
- **Storage:** `resume-uploads` (10MB), `linkedin-exports` (50MB), `artifacts` (10MB)

## Key Decisions (Already Made)

These are settled — do not re-litigate without a strong reason:

- **PM-only product.** No engineering, design, or other job tracks in scope.
- **Quality-first, not volume-first.** Interview callback rate per qualified application is the primary metric, not total applications submitted.
- **Resume Quality Recovery is a mandatory gate.** No job matching or application work starts until the user's profile passes quality diagnosis.
- **Auth: Google OAuth only.** Login via `supabase.auth.signInWithOAuth({ provider: 'google' })`. Scopes: `openid email profile` only. No password login, no magic link in Phase 1. New users auto-redirected to `/onboarding`; returning users to `/dashboard`. Each user's data is 100% isolated via Supabase RLS (`user_id = auth.uid()` on every table) — no application-layer logic needed for isolation.
- **LinkedIn: no scraping.** Accept user-downloaded LinkedIn export `.zip`. Block all LinkedIn scraping and autonomous LinkedIn messaging at the architecture level.
- **GitHub is the best evidence source.** Integrate via Contents API (public repos, no auth) or OAuth (private repos). Extract `README.md`, `CONTEXT.md`, `CLAUDE.md`, `/docs` directory files to build richer project evidence.
- **Greenhouse and Lever first for job discovery.** Both expose public structured job board APIs. These are the Phase 1 discovery layer. General web crawling is not in scope for Phase 1.
- **Three-tier application workflow.** Manual Apply (always) → Assisted Apply (schema known, user consents) → Auto-Apply (Greenhouse/Lever only, explicit user enablement, all eligibility conditions met).
- **Three-output fit model.** Never call it an ATS score. Output: Fit Score (0–100) + Evidence Confidence (Low/Medium/High) + Automation Eligibility (Eligible/Restricted/Manual Only).
- **No autonomous outbound actions.** Outreach drafts are generated for the user to send; the system never sends messages autonomously.
- **Playwright for assisted apply, not universal auto-submit.** Browser automation is a controlled assistant — prefill, inspection, DOM snapshot — not a universal form-submitter.
- **Gmail/Calendar connectors are Phase 2.** Not a Phase 1 dependency.

## What This Product Is NOT

- Not a "spray-and-pray" auto-apply bot
- Not a generic job board or aggregator
- Not a tool for non-PM job seekers (in scope for Phase 1)
- Not an ATS score predictor or resume keyword stuffer
- Not a LinkedIn scraper or outreach automaton

## Core Concepts / Terminology

| Term | Definition |
|---|---|
| **Resume Quality Recovery** | Mandatory pre-matching phase that diagnoses resume quality across 7 dimensions and reconstructs a stronger baseline from all available evidence sources before any matching or application work begins |
| **Profile Graph** | Internal structured representation of the user: roles → achievements → skills → tools → domains → metrics → gaps. Built from resume + LinkedIn export + GitHub + manual entries. Source of truth for all downstream tailoring. |
| **Master Baseline Resume** | The output of Resume Quality Recovery. The canonical resume from which all tailored versions are derived. Never auto-published. |
| **Fit Score** | RBot's internal match score (0–100) between a user's Profile Graph and a specific job. Not the employer's ATS score. |
| **Evidence Confidence** | How well the user's Profile Graph can back the Fit Score with real, verifiable evidence (Low / Medium / High) |
| **Automation Eligibility** | Whether auto-apply is safe for a specific job, given ATS family, schema completeness, user permissions, and policy rules (Eligible / Restricted / Manual Only) |
| **Canonical Job** | A deduplicated, normalized job record with a stable internal ID, regardless of how many sources it was discovered from |
| **Policy Engine** | The single service that governs what is allowed, restricted, escalated, or blocked before any external action fires |
| **Recovery Case** | Opened when Resume Quality Recovery detects a sub-threshold dimension; blocks downstream work until resolved |

## Automation Policy (Summary)

| Class | Examples | Rule |
|---|---|---|
| Allowed | Parsing, scoring, drafting, tracker updates | Automated with logging |
| Restricted | Resume rewriting, form prefill, status inference | Confidence checks + user review required |
| Escalated | Submitting applications, sending outreach | Explicit user approval required |
| Blocked | LinkedIn scraping, autonomous messaging, fabricated content, CAPTCHA solving | Hard disallow at architecture level |

## Phased Scope

**Phase 1 (MVP)** — profile intake, Resume Quality Recovery, GitHub evidence, job discovery (Greenhouse + Lever), fit scoring, resume/cover letter tailoring, manual + assisted + restricted auto-apply, outreach drafts, Kanban tracker, lightweight PM resource library.

**Phase 2** — Gmail/Calendar connectors, expanded ATS auto-apply, contact suggestion engine.

**Phase 3** — full RAG PM concierge, skills-gap learning, deep interview prep, offer comparison.

## Design System

- **Language:** Apple Human Interface Guidelines (web interpretation)
- **Stack:** Next.js 14 + Tailwind CSS (Apple color tokens) + shadcn/ui
- **Font:** `system-ui, -apple-system` → SF Pro on Apple, Segoe UI on Windows
- **Primary accent:** `#0071E3` (Apple blue)
- **Background:** `#FFFFFF` surface, `#F5F5F7` panels
- **Text:** `#1D1D1F` primary, `#6E6E73` secondary
- See `docs/design.md` for the full color system, type scale, component specs, and wireframes

## File Map

```
RBot/
└── docs/
    ├── context.md                      ← you are here
    ├── PRD.md                          ← full product requirements
    ├── architecture.md                 ← tech stack, services, API design, build order
    ├── data_model.md                   ← full DB schema, enums, RLS, JSONB specs
    ├── design.md                       ← Apple HIG design system, wireframes, components
    ├── edge_cases.md                   ← 60+ edge cases across all workflows, with priority
    ├── ai_evals.md                     ← LLM eval framework: per-task rubrics, test cases, red lines
    ├── implementation.md               ← step-by-step build guide: 9 sprints, code scaffolding, DoD
    └── deep-research-report (2).md     ← source research (strategy + integration analysis)
```

## Open Questions (Blocking or Near-Blocking)

1. ~~Which LLM provider and model?~~ **Resolved: Groq** (`llama-3.3-70b-versatile` primary, `llama-3.1-8b-instant` fast)
2. Fit Score model: rule-based or ML? (High priority — defaulting to rule-based for Phase 1)
3. Data retention policy for user profile and application artifacts? (High priority — legal)
4. Additional ATS families beyond Greenhouse/Lever for Phase 1 discovery? (Medium)
5. Happenstance vendor: confirmed identity and API, or removed from scope? (Medium)
6. GDPR / data residency requirements for EU-based users? (Medium — legal)
7. How is outreach contact data sourced in a compliant way? (Medium — legal)

## Non-Negotiable Risk Controls

1. Immutable audit log on all generated content and outbound actions
2. Fit Score is never labeled as employer ATS score
3. Generated content may not introduce claims unsupported by user-provided evidence
4. User authorization required at all outbound boundaries (apply, message, profile change)
5. All OAuth scopes scoped to minimum necessary permissions
6. Per-source compliance register governs discovery, outreach, and automation rules
