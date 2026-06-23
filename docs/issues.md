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
| F-6 | High | ✅ Fixed | Auth | Session not persisting — middleware cookie propagation bug |
| F-7 | High | ✅ Fixed | Routing | Logged-in user navigating to `/` sees landing page instead of dashboard |
| F-8 | Medium | ✅ Fixed | Frontend UX | File upload shows static "Uploading…" text — no animation or progress |
| F-9 | High | ✅ Fixed | GitHub Step | GitHub repo connection broken; single-repo only; no input format guidance |
| F-10 | High | ✅ Fixed | Recovery UX | Recovery questions: per-answer submit grays all; needs single final submit |
| F-11 | High | ✅ Fixed | Profile | Evidence source buttons route back to onboarding instead of dedicated modal |
| F-12 | Medium | ✅ Fixed | Tracker | Kanban missing columns: Interviewing, Rejected, Ghosted |
| F-13 | High | ✅ Fixed | Tracker | No way to manually add jobs applied outside PMFit to Kanban board |
| F-14 | High | ✅ Fixed | Engine | Resume tailoring frontend trigger missing |
| F-15 | High | ✅ Fixed | Settings | Settings page is blank — no profile fields, targeting, or preferences |
| F-16 | Low | ✅ Fixed | Intake | LinkedIn export — processing entire export instead of relevant fields only |
| F-17 | Medium | ✅ Fixed | Integrations | Apify integration not available |
| F-20 | Low | ✅ Fixed | Docs | testing.md §8.1 expected behavior stale (403 → 401) |
| B-6 | Medium | ✅ Fixed | Backend | `POST /tracker/manual` inserted non-existent columns (`discovery_source`, `description`) on jobs table — caused DB insert failures |

### Open
| ID | Severity | Status | Area | Title |
|----|----------|--------|------|-------|
| F-18 | Critical | 🔴 Open | Infra | Job discovery pipeline never triggered (n8n not configured) |
| F-19 | High | 🔴 Open | Ops | Recovery completion blocked — test users must answer recovery questions |

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

### B-6 — `POST /tracker/manual` Inserted Non-Existent Columns ✅ FIXED
**Severity:** Medium  
**Fixed in commit:** `bebb2e3`  
**Root cause:** `tracker.py` insert into `jobs` table included `discovery_source` and `description` columns. Neither column exists on the canonical `jobs` table (`discovery_source` is on `raw_jobs`; `description` has no counterpart). PostgREST rejects inserts with unknown columns → 400.  
**Fix:** Removed `discovery_source` from the insert. Moved `job_description` into `application_schema: {"description": ...}` (jsonb column that accepts arbitrary data).

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

### F-4 — Sidebar PMFit Logo Renders as Solid White Box ✅ FIXED
**Observed:** The PMFit icon in the sidebar (dark navy `#111827` background) appears as a blank white box.  
**Root cause:** `Logo.tsx` applies `className="brightness-0 invert"` to `logo-icon.png` on dark backgrounds. `brightness-0` reduces all pixels to black, then `invert` turns them all white — including the white background of the PNG.  
**Fix:** Applied `mix-blend-mode: screen` on the dark sidebar variant.

---

### F-5 — Sidebar Logo + "PMFit" Text Undersized ✅ FIXED
**Fix:** Increased size presets in Logo.tsx; icon=36–40px, text=20–22px.

---

### F-6 — Session Not Persisting 24 Hours ✅ FIXED
**Root cause:** `middleware.ts` wrote refreshed token cookies to `supabaseResponse`, but returned a different `NextResponse.redirect()` on auth redirects — so the browser never received the new cookies.  
**Fixed in:** middleware rewrite (commit `c2083c4`)

---

### F-7 — Logged-In User Navigating to `/` Sees Landing Page ✅ FIXED
**Root cause:** `app/page.tsx` has no auth check; middleware did not protect `/`.  
**Fix:** Added server-side auth check at top of `app/page.tsx` — if session exists, `redirect("/dashboard")`.

---

### F-8 — File Upload Shows Static "Uploading…" Text ✅ FIXED
**Fix:** Replaced static text with Framer Motion spinner + animated text in ResumeUploadStep.tsx and LinkedInStep.tsx.

---

### F-9 — GitHub Repo Connection Broken; Single Repo; No Input Format Guidance ✅ FIXED
**Fix:** `GitHubStep.tsx` replaced two-field form with a single URL input field + `parseGitHubUrl()` helper (strips protocol/domain, splits on `/`). Clear instructions added. Multiple repos supported via "Connect" → shows connected list → continue.

---

### F-10 — Recovery Questions: Per-Answer Submit Grays All ✅ FIXED
**Fix:** Single "Submit All & Build Profile" button replaces per-question submits. `saving` state is now a single global flag. Backend increments `questions_answered_count` correctly.

---

### F-11 — Evidence Source Buttons Route to Onboarding Instead of Modal ✅ FIXED
**Severity:** High  
**Fixed in commit:** `bebb2e3`  
**Root cause:** Evidence source buttons in `/profile` navigated to `/onboarding?force=true&step=X`, sending post-onboarding users back into the wizard.  
**Fix:** Created `frontend/components/profile/EvidenceSourceButtons.tsx` — a self-contained client component with inline modals for each source type (Resume, LinkedIn, GitHub). Server component imports it as a leaf node; no navigation required. Upload uses existing intake endpoints.

---

### F-12 — Kanban Board Missing Columns ✅ FIXED
**Fix:** Removed the `i < 5` filter from `KanbanBoard.tsx`. All 10 columns rendered (`COLUMNS.slice(0, 5)` used only in loading skeleton). Added Rejected, Ghosted, Interviewing columns to COLUMNS constant. DB tracker_status ENUM confirmed to have `rejected` and `ghosted` values.

---

### F-13 — No Way to Manually Add Jobs to Kanban Board ✅ FIXED
**Severity:** High  
**Fixed in commit:** `bebb2e3`  
**Root cause:** Kanban only showed jobs fetched from discovery pipeline. No manual entry.  
**Fix:**
- Backend: `POST /tracker/manual` in `tracker.py` — creates a `jobs` row (ats_family=unknown) + `tracker_items` row (status=applied). Description stored in `application_schema` jsonb field.
- Frontend: `AddJobModal.tsx` — form with Title (required), Company (required), Application Date (required, defaults today), Description (optional). Optimistic update: calls `onAdded` callback immediately for instant Kanban update.
- "Add Job" button added to Kanban header.

---

### F-14 — Resume Tailoring Frontend Trigger Missing ✅ FIXED
**Severity:** High  
**Fixed in commit:** `bebb2e3`  
**Root cause:** No "Generate Tailored Resume" button existed on JobCard.tsx.  
**Fix:**
- `JobCard.tsx`: full tailoring state machine (`idle → queuing → generating → done/timeout/error`)
- Recovery gate: disabled Lock button with tooltip when recovery not complete
- Polling: 3s interval, 60s max, polls `GET /jobs/{id}/artifacts` until tailored_resume or cover_letter appear
- Download: calls `GET /jobs/{id}/artifacts/{artifactId}/url` → 5-minute signed URL → creates `<a>` element
- Backend: `GET /jobs/{id}/artifacts/{artifactId}/url` endpoint added to `jobs.py`

---

### F-15 — Settings Page Is Blank ✅ FIXED
**Severity:** High  
**Fixed in commit:** `bebb2e3`  
**Root cause:** No `app/settings/page.tsx` existed; navigation item pointed to empty page.  
**Fix:**
- Server component `frontend/app/settings/page.tsx`: fetches profile + blacklist, passes to client
- `frontend/components/settings/SettingsClient.tsx`: 4 sections — Profile (name, avatar), Job Targeting (roles, locations, remote pref, auth, sponsorship, compensation), Blacklisted Companies (add/remove with company name + website), Integrations (Apify API key with show/hide toggle)
- Backend: `backend/app/api/settings.py` — GET/POST/DELETE `/settings/blacklist`; registered in `main.py`

---

### F-16 — LinkedIn Export Stores/Processes Entire Archive ✅ FIXED
**Severity:** Low  
**Fixed in commit:** `bebb2e3`  
**Root cause:** Entire LinkedIn ZIP was processed; irrelevant files (messages, connections, ads) parsed.  
**Fix:** `EXPECTED_LINKEDIN_FILES = {"Positions.csv", "Skills.csv", "Profile.csv", "Education.csv"}` — only these 4 files are parsed. ZIP is deleted from storage after successful parse.

---

### F-17 — No Apify Integration ✅ FIXED
**Severity:** Medium  
**Fixed in commit:** `bebb2e3`  
**Root cause:** Discovery only covered companies with known ATS board tokens.  
**Fix:**
- `apify_client.py` — `fetch_indeed_jobs(api_key)` using Apify's Indeed actor
- Settings page "Integrations" section — users paste their own Apify API key (stored in `profiles.apify_api_key`)
- `tasks.py` — discovery queries all users with `apify_api_key` set; runs Indeed scraping per user

---

### F-20 — testing.md §8.1 Expected Behavior Stale ✅ FIXED
**Fix:** F-1 was fixed in a previous commit (StrictBearer returns 401 not 403). testing.md §8.1 now states "Missing Authorization header → 401". Confirmed live: `GET /profile/` with no auth header → 401 "Not authenticated".

---

## Open Issues

### F-18 — Job Discovery Pipeline Never Triggered 🔴 CRITICAL

**Observed:** `jobs`, `raw_jobs`, and `job_scores` tables all have 0 rows. No PM jobs have ever been fetched from any board. Users with complete recovery would see an empty jobs page.  
**Root cause:** `/internal/discovery/run` endpoint exists and is functional. `INTERNAL_API_KEY` is confirmed set on Render (non-default value — 403 returned on default key attempt). However, n8n has not been deployed/configured to call the endpoint on a scheduled 4-hour interval.  
**Files:** [backend/app/main.py](backend/app/main.py), [backend/app/core/config.py](backend/app/core/config.py)  
**Fix needed:**
1. Configure n8n (or any cron service) to POST `https://rbot-api.onrender.com/internal/discovery/run` with the correct `X-Internal-Key` header every 4 hours
2. OR: trigger manually via `POST https://rbot-api.onrender.com/internal/discovery/run -H "X-Internal-Key: <value from Render env vars>"`
3. After first discovery run: verify `raw_jobs` rows appear, then normalization queues, then scoring runs for any user with `recovery_status = complete`

---

### F-19 — Recovery Completion Blocked for All Users 🔴 HIGH

**Observed:** Both existing users have `recovery_status: in_progress`. Evidence is parsed (7 rows, confidence ≥ 0.85), profile graph has been built, and 5 recovery questions are generated for each user. But neither user has answered the questions, so recovery never transitions to `complete`. Since job scoring only runs after `recovery_status = complete`, no jobs can ever be scored.  
**Root cause:** Not a bug — expected behavior. Users need to answer recovery questions in the onboarding flow.  
**Fix needed (operational):** Complete the recovery question-answering flow for the primary test user at https://rbot-mu.vercel.app/onboarding. Once `recovery_status = complete` AND F-18 is resolved (discovery triggered), scoring will run automatically.

---

## Confirmed Passing Tests (as of 2026-06-22 — full test run)

### Auth & Security (§8)
- ✅ CORS allows `rbot-mu.vercel.app` → 200, correct `Access-Control-Allow-Origin` header
- ✅ CORS blocks `evil-site.com` → 400
- ✅ §8.1 Missing Authorization → 401 "Not authenticated" (StrictBearer, F-1 fixed)
- ✅ §8.2 Empty Bearer (`Bearer `) → 401 "Not authenticated"
- ✅ §8.3 Fake JWT (`eyJfake.token.here`) → 401 "Invalid or expired token"
- ✅ Token validated against Supabase project `ogecgrhzretnkgehyifi`
- ✅ RLS enabled on all 18 user-scoped tables

### Frontend Routing (unauthenticated)
- ✅ `/dashboard` → 307 redirect → `/login`
- ✅ `/jobs` → 307 redirect → `/login`
- ✅ `/tracker` → 307 redirect → `/login`
- ✅ `/profile` → 307 redirect → `/login`
- ✅ `/onboarding` → 307 redirect → `/login`
- ✅ `/gate` → 307 redirect → `/login`
- ✅ `/settings` → 307 redirect → `/login`
- ✅ `/login` → 200

### API — unauthenticated probes (all → 401)
- ✅ `GET /profile/` → 401
- ✅ `GET /jobs/` → 401
- ✅ `GET /jobs/?board_category=startup` → 401 (new filter endpoint exists)
- ✅ `GET /jobs/?source_region=uk` → 401
- ✅ `GET /jobs/?is_startup=true` → 401
- ✅ `GET /jobs/?remote=true` → 401
- ✅ `GET /tracker/` → 401
- ✅ `GET /intake/evidence` → 401
- ✅ `GET /recovery/status` → 401
- ✅ `GET /apply/sessions` → 401
- ✅ `GET /outreach/` → 401
- ✅ `GET /health` → 200 `{"status":"ok","env":"production"}`

### Auth validation (frontend routes)
- ✅ `/api/auth/send-otp` empty email → 400 (validation error)
- ✅ `/api/auth/verify-otp` wrong access code → 400 (rejected before OTP check)

### DB State (via Supabase MCP — 2026-06-22)
- ✅ 7 `raw_evidence` rows across 2 users (resume + LinkedIn), `parse_confidence ≥ 0.85`
- ✅ 2 `recovery_cases` rows, each with 5 questions generated
- ✅ All 17 implementation guide tables exist
- ✅ `jobs` table has new columns: `board_categories[]`, `source_regions[]`, `is_startup`, `is_remote_first`
- ✅ `raw_jobs` table has new columns: `board_category`, `source_region`
- ✅ `discovery_source` ENUM has `manual_entry`, `ashby_api`, `remoteok_api`, `remotive_api`, `wellfound_api`, `workable_api`, `breezy_api`, `teamtailor_api`, `jazzhr_api`, `personio_api`, `reed_api`
- ✅ `ats_family` ENUM has `ashby`, `workable`, `breezy`, `teamtailor`, `jazzhr`, `personio`, `remoteok`, `remotive`, `wellfound`, `reed`
- ✅ `tracker_status` ENUM has `rejected`, `ghosted`, `interview_scheduled`

### API (authenticated — prior run, 2026-06-21)
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

### Pending re-test after deployment (commit `bebb2e3`)
- ⏳ `GET /settings/blacklist` → should return 401 (endpoint now deployed)
- ⏳ `POST /tracker/manual` → should return 401 (endpoint now deployed)
- ⏳ `DELETE /settings/blacklist/{id}` → should return 401
- ⏳ `POST /settings/blacklist` → should return 401

### Requires Manual Browser Verification
- ⏳ §1.1–1.2: OTP email delivery + gate flow
- ⏳ §1.3: Google OAuth round-trip
- ⏳ §1.4: Session persistence across reload
- ⏳ §2: Full onboarding UI (file pickers, drag-drop, animations)
- ⏳ §3: Dashboard rendering + recovery banner
- ⏳ §4: Job card badges, fit score colors, tailoring button, startup/remote/region badges
- ⏳ §5: Kanban drag-and-drop, AddJobModal, all 10 columns
- ⏳ §6: Profile page evidence source modals
- ⏳ §7: Settings page — all 4 sections
- ⏳ §9–11: Navigation, error states, mobile viewport
- ⏳ §12: End-to-end happy path (F-19 must be resolved first)
