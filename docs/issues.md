# PMFit Platform — Issues Log

**Last updated:** 2026-06-22  
**Test run:** Live testing against https://rbot-api.onrender.com · https://rbot-mu.vercel.app  
**Test account:** mohdammar97+test@gmail.com  

---

## Summary

### Resolved
| ID | Severity | Status | Area | Title |
|----|----------|--------|------|-------|
| B-1 | Critical | ✅ Fixed | Backend Auth | All authenticated endpoints returned 401 |
| B-2 | High | ✅ Fixed | Backend | Invalid UUID path params crash with 500 instead of 404 |
| B-3 | High | ✅ Fixed | Backend | Recovery endpoints 500 when user has no profile row |
| B-4 | High | ✅ Fixed | Backend | `GET /tracker/` and `POST /tracker/note` return 500 |
| B-5 | Medium | ✅ Fixed | Backend | `GET /jobs/{id}` 500 on nonexistent job |
| D-1 | Critical | ✅ Fixed | Infra | No Celery worker deployed — all background tasks never execute |
| F-1 | Low | ✅ Fixed | Frontend/API | Missing Bearer header returns 403, not 401 |
| F-2 | High | ✅ Fixed | Frontend | Recovery step shows infinite spinner with no timeout or fallback |
| F-3 | Medium | ✅ Fixed | Frontend | Onboarding progress circles mark skipped steps as complete (✓) |
| F-OTP | High | ✅ Fixed | Frontend | OTP input converts mixed-case code to all-caps before verification |

### Recently Fixed
| ID | Severity | Status | Area | Title |
|----|----------|--------|------|-------|
| F-4 | High | ✅ Fixed | Frontend UI | Sidebar PMFit logo renders as solid white box |
| F-5 | Medium | ✅ Fixed | Frontend UI | Sidebar logo + "PMFit" text undersized relative to nav items |
| F-7 | High | ✅ Fixed | Routing | Logged-in user navigating to `/` sees landing page instead of dashboard |
| F-8 | Medium | ✅ Fixed | Frontend UX | File upload shows static "Uploading…" text — no animation or progress |
| F-9 | High | ✅ Fixed | GitHub Step | GitHub repo connection broken; single-repo only; no input format guidance |
| F-10 | High | ✅ Fixed | Recovery UX | Recovery questions: per-answer submit grays all; needs single final submit |
| F-12 | Medium | ✅ Fixed | Tracker | Kanban missing columns: Interviewing, Rejected, Ghosted |

### Open
| ID | Severity | Status | Area | Title |
|----|----------|--------|------|-------|
| F-6 | High | 🔴 Open | Auth | Session not persisting 24 hrs — set JWT Expiry to 86400 in Supabase dashboard |
| F-11 | High | 🔴 Open | Profile | Evidence source buttons route back to onboarding instead of dedicated modal |
| F-13 | High | 🔴 Open | Tracker | No way to manually add jobs applied outside PMFit to Kanban board |
| F-14 | Critical | 🔴 Open | Engine | Resume refinement + cover letter generation engine not implemented |
| F-15 | High | 🔴 Open | Settings | Settings page is blank — no profile fields, targeting, or preferences |
| F-16 | Low | 🟡 Open | Intake | LinkedIn export — storing and processing entire export; should filter to relevant fields only |
| F-17 | Medium | 🟡 Open | Integrations | Apify integration not available — limits job discovery to known company board tokens |

---

## Resolved Issues

### B-1 — All Authenticated Endpoints Returned 401 ✅ FIXED
**Severity:** Critical  
**Fixed in commit:** `c75c64a`  
**Root cause:** In `backend/app/core/security.py`, post-auth assignment `result.user.access_token = token` raised `ValueError` (Pydantic v2 rejects unknown fields on the `User` model). Caught by bare `except Exception` → returned as 401. Every request was being rejected despite the JWT being valid.  
**Fix:** Removed the invalid field assignment. No downstream handlers use `user.access_token`.

---

### B-2 — Invalid UUID Path Params Crash with 500 ✅ FIXED
**Severity:** High  
**Fixed in commit:** `b2d1ad5`, `eadeeb5`  
**Root cause:** Path params passed directly to `.eq("id", ...)` without UUID validation. PostgREST throws `APIError: invalid input syntax for type uuid` which was unhandled → 500.  
**Fix:** Replaced `.single()` with `.maybe_single()` + guard across `apply.py`, `tracker.py`, `jobs.py`.

---

### B-3 — Recovery Endpoints Return 500 When User Has No Profile Row ✅ FIXED
**Severity:** High  
**Fixed in commit:** `b2d1ad5`  
**Root cause:** `.single()` on profiles table throws `APIError` when 0 rows returned (new OTP users with no profile trigger).  
**Fix:** Replaced `.single()` with `.maybe_single()` + 404 guard across all recovery endpoints.

---

### B-4 — `GET /tracker/` and `POST /tracker/note` Return 500 ✅ FIXED
**Severity:** High  
**Fixed in commit:** `eadeeb5`  
**Root cause:** PostgREST foreign table join query failed when `tracker_items`/`jobs`/`job_scores` FK relationships not set up, or migrations not run. Fixed by migration verification + query restructuring.

---

### B-5 — `GET /jobs/{id}` Returns 500 on Nonexistent Job ✅ FIXED
**Severity:** Medium  
**Fixed in commit:** `b2d1ad5`  
**Root cause:** `.single()` on jobs table threw `APIError` for nonexistent `job_id`.  
**Fix:** Replaced with `.maybe_single()` + `HTTPException(404, "Job not found.")`.

---

### D-1 — No Celery Worker Deployed ✅ FIXED
**Severity:** Critical  
**Fixed in commit:** `1a64c5b`  
**Root cause:** Celery requires a separate worker process + Redis broker, neither available on Render free tier. All background tasks silently stalled.  
**Fix:** Replaced `celery_app.py` with in-process threading. Public API (`.delay()`, `bind=True`, `self.retry()`) preserved; tasks now run as daemon threads. Removed `celery[redis]` and `redis` from `requirements.txt`.  
**Tradeoff:** No retry persistence across API process restarts (acceptable for MVP — tasks complete in seconds).

---

### F-1 — Missing Bearer Header Returns 403, Not 401 ✅ FIXED
**Severity:** Low  
**Fixed in commit:** `7be0406`  
**Root cause:** FastAPI's `HTTPBearer` returns 403 for missing scheme (RFC-compliant but inconsistent).  
**Fix:** Wrapped in `StrictBearer` that catches and re-raises as 401.

---

### F-2 — Recovery Step Infinite Spinner ✅ FIXED
**Severity:** High  
**Fixed in commit:** `7be0406`  
**Root cause:** `RecoveryStep.tsx` polled every 5 s with no timeout or escape path.  
**Fix:** 120-second timeout with "Continue to Dashboard" + "Check again" buttons.

---

### F-3 — Onboarding Progress Circles Mark Skipped Steps as Complete ✅ FIXED
**Severity:** Medium  
**Fixed in commit:** `7be0406`  
**Root cause:** Progress used `i < stepIndex` to determine completion — any past step showed ✓ regardless of whether it was skipped.  
**Fix:** Added `completed: Set<Step>` state; only `onComplete()` (not `onNext()`) marks a step green.

---

### F-OTP — OTP Input Converts Mixed-Case Code to All-Caps ✅ FIXED
**Severity:** High  
**Fixed in commit:** `4fa76a6`  
**Root cause:** `OTPInput.tsx` called `.toUpperCase()` on every typed character (line 25) and on paste (line 48). OTP codes are mixed-case (e.g. `lojyEflA`). The code was becoming `LOJYEFLA` before hitting verification → always failed.  
**Fix:** Removed both `.toUpperCase()` calls; case is now preserved exactly as typed or pasted.

---

## Open Issues

### F-4 — Sidebar PMFit Logo Renders as Solid White Box 🔴 HIGH

**Observed:** The PMFit icon in the sidebar (dark navy `#111827` background) appears as a blank white box.  
**Root cause:** `Logo.tsx` applies `className="brightness-0 invert"` to `logo-icon.png` on dark backgrounds. `brightness-0` reduces all pixels to black, then `invert` turns them all white — including the white background of the PNG. Since the PNG has no transparent background, the entire image becomes white.  
**File:** [frontend/components/ui/Logo.tsx](frontend/components/ui/Logo.tsx)  
**Fix needed:** Either (a) use a version of the icon with a transparent background, or (b) replace the CSS filter approach with a dedicated dark-mode logo asset, or (c) apply `mix-blend-mode: screen` instead on the dark sidebar.

---

### F-5 — Sidebar Logo + "PMFit" Text Undersized Relative to Nav Items 🟡 MEDIUM

**Observed:** The PMFit icon and "PMFit" wordmark in the sidebar feel too small; nav item labels are visually similar in weight, making the logo feel like just another item rather than the app identity.  
**File:** [frontend/components/ui/Logo.tsx](frontend/components/ui/Logo.tsx), [frontend/components/layout/Sidebar.tsx](frontend/components/layout/Sidebar.tsx)  
**Fix needed:** Increase the `md` size preset in `sizeMap` (currently icon=32, text=18px). Suggested: icon=36–40px, text=20–22px, slightly bolder weight.

---

### F-6 — Session Not Persisting 24 Hours 🔴 HIGH

**Observed:** Users are logged out before the expected 24-hour window; OTP-based sessions appear to expire earlier.  
**Root cause (suspected):** Supabase session refresh is not being triggered on page load for server-rendered pages. The `@supabase/ssr` middleware must call `supabase.auth.getUser()` on every request (not just `getSession()`) to refresh the token automatically. If `middleware.ts` only reads the cookie without refreshing, short-lived access tokens expire without a new one being issued.  
**File:** [frontend/middleware.ts](frontend/middleware.ts), [frontend/lib/supabase/](frontend/lib/supabase/)  
**Fix needed:** Ensure `middleware.ts` calls `supabase.auth.getUser()` to trigger session refresh on every navigated request, per Supabase SSR best-practice pattern. Verify Supabase project JWT expiry setting (default is 1 hour; refresh token extends this if handled correctly).

---

### F-7 — Logged-In User Navigating to `/` Sees Landing Page 🔴 HIGH

**Observed:** After login, clicking the browser back button or typing `rbot-mu.vercel.app` lands on the public marketing landing page — the same page that shows "Get Started" and "Sign in" CTAs — instead of redirecting to `/dashboard`.  
**Root cause:** `app/page.tsx` (landing page) has no auth check. The middleware only protects `/dashboard`, `/jobs`, `/tracker`, `/profile`, `/onboarding`, `/gate` — not `/`.  
**Files:** [frontend/app/page.tsx](frontend/app/page.tsx), [frontend/middleware.ts](frontend/middleware.ts)  
**Fix needed:** Add a server-side auth check at the top of `app/page.tsx` — if a valid session exists, `redirect("/dashboard")`. Alternatively, update `middleware.ts` to intercept GET `/` and redirect authenticated users to `/dashboard`.

---

### F-8 — File Upload Shows Static "Uploading…" Text — No Animation 🟡 MEDIUM

**Observed:** When uploading a resume, the drop zone shows the static text "Uploading…" with no visual progress indicator. For large files (or slow connections) this looks broken rather than in-progress.  
**File:** [frontend/components/onboarding/steps/ResumeUploadStep.tsx](frontend/components/onboarding/steps/ResumeUploadStep.tsx) (line 65)  
**Current code:** `{status === "uploading" && <p className="text-[15px] text-apple-accent">Uploading…</p>}`  
**Fix needed:** Replace static text with a Framer Motion spinner + animated text, or a fake/real progress bar (XHR upload with `onprogress` for real %). Same pattern needed in `LinkedInStep.tsx` and anywhere else files are uploaded.

---

### F-9 — GitHub Repo Connection Broken; Single Repo; No Input Format Guidance 🔴 HIGH

**Observed:** Clicking "Connect Repository" in the GitHub step produces an error (likely 401 or 500 from backend). Additionally:
1. The form only allows one owner/repo pair — no way to add multiple repos
2. There is no instruction telling the user whether to enter a full URL, just the owner, or owner + repo name separately
3. After a connection error, the form doesn't explain what went wrong

**Root cause (suspected):** The API call to `POST /intake/github` may fail because the bearer token isn't being attached properly at onboarding time, or the backend GitHub integration is hitting the D-1 threading issue. Multi-repo is not supported in the current UI or backend schema.  
**Files:** [frontend/components/onboarding/steps/GitHubStep.tsx](frontend/components/onboarding/steps/GitHubStep.tsx), [backend/app/api/intake.py](backend/app/api/intake.py)  
**Fix needed:**
- Add clear labelled instructions: "Enter the GitHub **username** (left) and **repository name** (right) separately — e.g. `md-ammar-97` / `my-project-repo`. Do not enter a full URL."
- Add "Add another repo" button to submit multiple repos in one session
- Fix the bearer token / API connectivity issue
- Show per-repo success/error state

---

### F-10 — Recovery Questions: Per-Answer Submit Grays All; Answers Not Saved to Profile 🔴 HIGH

**Observed (two separate bugs):**
1. When submitting answer for question 1, the `saving` flag is set to `true` which disables ALL "Submit Answer" buttons across all questions, not just the one being saved. The UI appears frozen until the single save completes.
2. After answering and submitting all questions, navigating to the dashboard shows 0 answered questions — the `questions_answered_count` in the profile is not being updated, or the profile page is reading from a stale/different data source.

**UX issue (separate):** The current design asks for per-question submit buttons. The user's preference is: fill all answers freely, then one **"Submit All & Build Profile"** button at the bottom that batch-saves all answers and redirects to dashboard.

**Files:**
- [frontend/components/onboarding/steps/RecoveryStep.tsx](frontend/components/onboarding/steps/RecoveryStep.tsx) — `saving` state is shared across all buttons (line 29, line 191–196)
- [backend/app/api/recovery.py](backend/app/api/recovery.py) — `POST /recovery/answer` endpoint; check whether it increments `questions_answered_count`

**Fix needed:**
- Replace per-question submit buttons with a single "Submit All & Build Profile" button
- Change `saving` to a per-question state or a single global submit state that only blocks the final button
- Verify backend increments `questions_answered_count` and that the profile page reads from `recovery_cases.questions_answered_count`, not a stale field

---

### F-11 — Evidence Source Buttons Route to Onboarding Instead of Dedicated Modal 🔴 HIGH

**Observed:** Clicking "Upload Resume", "Add LinkedIn Export", or "Connect GitHub" on the Resume Recovery page (`/profile`) navigates the user to `/onboarding?force=true&step=X`. This sends a logged-in, post-onboarding user back through the multi-step onboarding wizard — confusing and structurally incorrect.

**Expected:** Each button should open a lightweight in-page modal or slide-over panel that handles only that specific action (resume re-upload, LinkedIn re-import, GitHub add-repo) without the full onboarding shell, progress steps, or navigation away from the profile page.

**File:** [frontend/app/profile/page.tsx](frontend/app/profile/page.tsx) (Evidence Sources section, lines ~135–152)  
**Fix needed:** Create dedicated lightweight modal components — `UploadResumeModal`, `LinkedInImportModal`, `GitHubRepoModal` — triggered by the evidence source buttons without leaving the profile page.

---

### F-12 — Kanban Board Missing Columns: Interviewing, Rejected, Ghosted 🟡 MEDIUM

**Observed:** The visible Kanban only shows 5 columns (Discovered, Reviewing, Tailoring, Applied, Outreach). The existing code defines 9 columns but only shows columns with items OR the first 5 (`i < 5` guard). The full pipeline including Interviewing, Rejected, and Ghosted is never visible.

**Additional request:** Add two new status values: `rejected` and `ghosted` (no response after N days).

**File:** [frontend/components/tracker/KanbanBoard.tsx](frontend/components/tracker/KanbanBoard.tsx) (line: `const visibleCols = COLUMNS.filter((col, i) => i < 5 || ...)`)  
**Fix needed:**
- Remove the `i < 5` filter — show all columns always (with horizontal scroll if needed)
- Add `{ status: "interviewing", label: "Interviewing", color: "#FF8C00" }` (may already exist as `interview_scheduled`)
- Add `{ status: "rejected", label: "Rejected", color: "#E63946" }`
- Add `{ status: "ghosted", label: "Ghosted", color: "#6B7280" }`
- Ensure the DB `tracker_items.current_status` enum/check constraint allows these values

---

### F-13 — No Way to Manually Add Jobs to Kanban Board 🔴 HIGH

**Observed:** The Kanban board only shows jobs fetched from the PMFit job board. Users who applied to jobs via LinkedIn, company careers pages, or referrals have no way to track those applications in PMFit.

**Required fields (per user spec):**
- Job Title *(required)*
- Company *(required)*
- Application Date *(required, shown on card)*
- Job Description *(optional note field)*
- Resume/Cover Letter upload *(optional file attachment)*

**Card display:** Only Job Title, Company, Application Date visible on card. Full details shown in click-to-expand modal.

**Fix needed:**
- "Add Job Manually" button in Kanban header
- Modal form with above fields + file attachment
- `POST /tracker/manual` endpoint on backend that creates a synthetic `jobs` row + `tracker_items` row with `source: "manual"`
- Same expand-on-click detail modal as automatically discovered jobs

---

### F-14 — Resume Refinement + Cover Letter Generation Engine Not Implemented 🔴 CRITICAL

**Observed:** The drafting engine (`POST /apply/{job_id}/prepare`) exists in the API spec but the full flow with keyword extraction, match scoring, and conditional rewriting is not implemented. No download option exists.

**Required behaviour (per spec):**
1. **Keyword extraction** — LLM reads JD and extracts top keywords/skills
2. **Match scoring** — compare against user's `profile_graph`
3. **Conditional tailoring:**
   - Match ≥ 85%: use existing resume as-is
   - Match 80–84%: inject 5 JD keywords into Skills / Experience sections
   - Match < 80%: full resume rewrite aligned to JD
4. **Cover letter generation** — based on updated resume + JD after tailoring
5. **Per-job generation trigger** — "Generate" button on each `JobCard`; not auto-run
6. **PDF download** — both resume and cover letter downloadable as PDF only
7. All generation grounded in `profile_graph` evidence (no invented claims)

**Files:** [backend/app/services/drafting.py](backend/app/services/drafting.py), [frontend/components/jobs/JobCard.tsx](frontend/components/jobs/JobCard.tsx)  
**Fix needed:** Full implementation of drafting service with keyword extraction → scoring → conditional tailoring → cover letter pipeline + frontend download buttons

---

### F-15 — Settings Page Is Blank 🔴 HIGH

**Observed:** `/settings` exists in navigation but renders an empty page (no server component, no content).

**Required sections (per spec):**
1. **Profile** — First name, Last name, Username, Country, Avatar/photo upload
2. **Job Targeting** — Target job titles, target countries/locations, remote preference, work authorization, sponsorship required, compensation range
3. **Blacklisted Companies** — Add company name + official website URL; displayed as removable cards; these companies are excluded from discovery and scoring. Both fields required per entry.
4. No password field (auth is via OTP/Google)

**Files:** No `app/settings/page.tsx` or `app/settings/` directory exists in the codebase  
**Fix needed:** Create full settings page with Supabase reads/writes to `profiles` table; blacklisted companies stored in a new `blacklisted_companies` table (user_id, company_name, company_website)

---

### F-16 — LinkedIn Export Stores/Processes Entire Archive 🟡 LOW

**Observed:** The LinkedIn export step accepts the full `.zip` export from LinkedIn, which contains dozens of CSV files (connections, messages, ads data, etc.) that are irrelevant to job matching.

**Fix needed:** At the intake layer (`POST /intake/linkedin`), extract only `Profile.csv`, `Positions.csv`, `Skills.csv`, `Education.csv` from the zip. Discard all other files without storing them. Document to the user exactly which files are used.  
**File:** [backend/app/services/ingestion.py](backend/app/services/ingestion.py)

---

### F-17 — No Apify Integration for Enhanced Job Discovery 🟡 MEDIUM

**Background:** Current discovery is limited to companies with known Greenhouse/Lever board tokens configured in the backend. Apify provides scrapers for broader job boards (Indeed, LinkedIn Jobs, etc.) that users can connect via their own API key.

**Requested behaviour:** Settings page should include an "Integrations" section where users can paste their own Apify API key. If connected, job discovery also queries the user-configured Apify actors (e.g. LinkedIn Jobs scraper) in addition to Greenhouse/Lever. PMFit never embeds a shared Apify key — users bring their own.

**Fix needed:** 
- Settings page "Integrations" section with Apify API key input (stored encrypted in Supabase)
- Backend: if `apify_api_key` is set on the profile, run the Apify actor as part of the discovery pipeline
- Document clearly that this is optional and user-provided

---

## Confirmed Passing Tests (as of 2026-06-21)

### Auth & Security
- ✅ CORS allows `rbot-mu.vercel.app` — `access-control-allow-origin`, `allow-credentials: true`
- ✅ CORS blocks `evil-site.com` → 400
- ✅ All protected endpoints return 403/401 with invalid/missing Bearer header
- ✅ Token validated against Supabase project `ogecgrhzretnkgehyifi`

### Frontend Routing (unauthenticated)
- ✅ `/dashboard`, `/onboarding`, `/jobs`, `/tracker`, `/profile`, `/gate` → 307 redirect to `/login`
- ✅ `/login` → 200

### OTP Auth Flow
- ✅ Empty email → `{"error":"Email is required"}`
- ✅ Wrong secret code → `{"error":"Invalid access code."}`
- ✅ Mixed-case OTP now verified correctly (fixed F-OTP)

### API (authenticated)
- ✅ `GET /profile/` → 200
- ✅ `PATCH /profile/` → 200
- ✅ `PATCH /profile/onboarding/complete` → 200
- ✅ `GET /jobs/` → 200
- ✅ `GET /jobs/?min_fit=70` → 200
- ✅ `GET /jobs/?min_fit=150` → 422 validation error
- ✅ `POST /jobs/{id}/tailor` (recovery incomplete) → blocked with correct error
- ✅ `GET /apply/sessions` → 200
- ✅ `GET /outreach/` → 200
- ✅ `GET /intake/evidence` → 200
- ✅ `GET /health` → 200 `{"status":"ok","env":"production"}`
