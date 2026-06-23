# RBot Platform — Master Test Plan

**Environment:** https://rbot-mu.vercel.app (frontend) · https://rbot-api.onrender.com (backend)
**Date:** 2026-06-21

---

## 1. Authentication — OTP Login Flow

### 1.1 Email Stage (send-otp)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.1.1 | Valid email send | Enter `mohdammar97@gmail.com` → click Send Code | OTP email arrives from `noreply@mohdammar.com` within 60s, UI transitions to gate stage |
| 1.1.2 | Empty email | Click Send Code with blank field | "Email is required" error, no email sent |
| 1.1.3 | Malformed email | Enter `notanemail` → Send Code | 400 error displayed, no email sent |
| 1.1.4 | Email normalization | Enter `  MOHDAMMAR97@GMAIL.COM  ` (with spaces + uppercase) → Send Code | Treated as `mohdammar97@gmail.com`, email arrives |
| 1.1.5 | Resend code | Complete stage 1 successfully, then click "Resend code" | Old unused OTP deleted, new OTP emailed, 1h expiry reset |
| 1.1.6 | New user signup | Enter an email not yet in Supabase → Send Code | User created in Supabase, OTP emailed, no crash |
| 1.1.7 | OTP email content | Open received email | Contains 8-char alphanumeric code, subject "Your RBot sign-in code", sent from `noreply@mohdammar.com` |

### 1.2 Gate Stage (verify-otp + secret code)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.2.1 | Correct OTP + correct secret | Enter valid 8-char code + `AMMAR8800206651` → Verify | Session created, `window.location.href` navigates to `/onboarding` (new user) or `/dashboard` (returning) — full page reload |
| 1.2.2 | Wrong OTP, correct secret | Enter `XXXXXXXX` + correct secret | "Invalid code." error, attempt counter incremented, session NOT created |
| 1.2.3 | Correct OTP, wrong secret | Enter valid code + `wrongsecret` | "Invalid access code." — checked before OTP, no DB lookup |
| 1.2.4 | Expired OTP | Wait 1h+ (or manually expire in DB) then submit valid code | "Invalid or expired code. Request a new one." |
| 1.2.5 | Already-used OTP | Submit same code twice (first succeeds) | Second attempt: "Invalid or expired code. Request a new one." |
| 1.2.6 | Brute-force lock | Submit wrong OTP 5 times | 5th attempt returns "Too many failed attempts. Request a new code." (HTTP 429) |
| 1.2.7 | Attempt counter increments before code check | Intercept request, confirm DB `attempts` incremented even on wrong OTP | Prevents timing attacks; each attempt costs a counter increment |
| 1.2.8 | All fields empty on verify | Click Verify with all fields blank | "Missing required fields" error, no DB call |
| 1.2.9 | Session stored in cookie | After successful login, inspect `document.cookie` in DevTools | `sb-ogecgrhzretnkgehyifi-auth-token` cookie present with valid JSON session |
| 1.2.10 | Full page reload after login | After 1.2.1 success, observe navigation method | Network tab shows full document load (not SPA navigation) — ensures singleton re-reads session from cookie |

### 1.3 Google OAuth Flow

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.3.1 | Happy path | Click "Continue with Google" → Google consent → back | Redirected to `/gate`, session active |
| 1.3.2 | Google OAuth callback route | After Google callback, check URL | Lands at `/auth/callback`, then redirects to `/gate` (not `/onboarding`) |
| 1.3.3 | Gate page — correct secret | On `/gate`, enter `AMMAR8800206651` → Continue | Redirected to `/onboarding` (new) or `/dashboard` (returning) |
| 1.3.4 | Gate page — wrong secret | Enter any other string → Continue | "Invalid access code." error, no redirect |
| 1.3.5 | Gate page — unauthenticated direct access | Visit `/gate` without session | Middleware redirects to `/login` |
| 1.3.6 | Google OAuth — cancel | Click "Continue with Google" → click Cancel on Google consent screen | Returns to `/login`, no error crash |

### 1.4 Session & Auth State

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.4.1 | Protected route unauthenticated | Visit `/dashboard` without session | Redirected to `/login` |
| 1.4.2 | Protected route authenticated | Visit `/dashboard` with valid session | Page renders, no redirect |
| 1.4.3 | Session persists on reload | Login → reload page → check session | `getSession()` returns valid session from cookie, no re-login required |
| 1.4.4 | Session auto-refresh | Wait until access token expires (1h), then make an API call | `getSession()` auto-refreshes via refresh token, API call succeeds with new token |
| 1.4.5 | Middleware enforces auth | Access any route in `PROTECTED_PREFIXES` without session | Redirected to `/login` |
| 1.4.6 | Token sent to backend | Open DevTools Network, trigger any API call | `Authorization: Bearer <token>` header present, token starts with `eyJ` |

---

## 2. Onboarding Flow

### 2.1 Step 1 — Resume Upload

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.1.1 | PDF upload — happy path | Upload a valid PDF (< 10 MB) | POST `/intake/resume` returns 200, `evidence_id` returned, status `parsing`, UI advances |
| 2.1.2 | DOCX upload | Upload a `.docx` file | Accepted (content-type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`), parsed |
| 2.1.3 | TXT upload | Upload a `.txt` file | Accepted, parsed |
| 2.1.4 | Invalid file type | Upload a `.png` or `.xlsx` | HTTP 422 "Unsupported file type. Upload PDF, DOCX, or TXT." |
| 2.1.5 | Empty file | Upload a 0-byte file | HTTP 422 "The uploaded file appears to be empty." |
| 2.1.6 | File > 10 MB | Upload file exceeding 10 MB | HTTP 422 "File too large. Maximum size is 10 MB." |
| 2.1.7 | Unauthenticated upload | Remove session cookie, attempt upload | HTTP 401, error displayed in UI |
| 2.1.8 | Storage path format | Check Supabase Storage after upload | File stored at `{user_id}/{uuid}/{filename}` in `resume-uploads` bucket |
| 2.1.9 | Evidence row created | Check `raw_evidence` table after upload | Row with `source_type=resume`, `parsed_content={}`, `raw_file_path` matching storage path |
| 2.1.10 | Celery task queued | Check Celery worker logs after upload | `parse_resume` task dispatched with `evidence_id`, `user_id`, `storage_path`, `content_type` |

### 2.2 Step 2 — LinkedIn Export

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.2.1 | Valid ZIP upload | Upload a LinkedIn export `.zip` | POST `/intake/linkedin` returns 200, status `parsing` |
| 2.2.2 | Wrong file type | Upload `.pdf` as LinkedIn export | HTTP 422 "Upload the LinkedIn export as a .zip file." |
| 2.2.3 | Empty ZIP | Upload 0-byte file | HTTP 422 "The uploaded file appears to be empty." |
| 2.2.4 | ZIP > 50 MB | Upload oversized file | HTTP 422 "File too large. Maximum size is 50 MB." |
| 2.2.5 | Skip button | Click "Skip for now →" | Advances to next step without making any API call |
| 2.2.6 | Upload + skip combo | Upload successfully, then click skip | Both paths lead to Step 3 (GitHub), no regression |
| 2.2.7 | Storage path format | Check Supabase Storage after upload | File at `{user_id}/{uuid}/linkedin_export.zip` in `linkedin-exports` bucket |

### 2.3 Step 3 — GitHub Repo

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.3.1 | Valid public repo | Enter `md-ammar-97` / `Rbot` → Connect Repository | POST `/intake/github` queues ingestion, "connected" message, auto-advances |
| 2.3.2 | Empty owner field | Leave owner blank, enter repo → Connect | "Please enter both owner and repository name." error, no API call |
| 2.3.3 | Empty repo field | Enter owner, leave repo blank → Connect | Same validation error |
| 2.3.4 | Both fields empty | Click Connect with both blank | Validation error |
| 2.3.5 | Already-connected repo | Submit same `owner/repo` again | API returns `status: resync_queued` (re-sync, not duplicate row), success message |
| 2.3.6 | Whitespace trimming | Enter `  md-ammar-97  ` / `  Rbot  ` | Trimmed before API call, no trailing spaces in DB |
| 2.3.7 | Skip button | Click "Skip for now →" | Advances to Recovery step, no API call |

### 2.4 Step 4 — Resume Quality Recovery

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.4.1 | Pending state (no resume parsed yet) | Land on Recovery step immediately after upload | Spinner + "Analysing your resume… This takes 15–30 seconds." displayed |
| 2.4.2 | Polling every 5 seconds | Wait on Recovery step | `GET /recovery/status` and `GET /recovery/questions` called every 5s, no memory leak |
| 2.4.3 | Questions appear (in_progress) | After parse completes, questions loaded | `open_questions` from `recovery_cases` rendered with dimension label, question text, textarea |
| 2.4.4 | Submit answer | Type answer → click Submit Answer | POST `/recovery/answer` returns 200, question marked `answered: true`, textarea disappears |
| 2.4.5 | Submit empty answer | Click Submit Answer with empty textarea | Button disabled (`!answers[q.id]`), no API call |
| 2.4.6 | All questions answered | Answer all questions | "Rebuilding your profile with your answers…" spinner shown, polling continues |
| 2.4.7 | Recovery complete | When `recovery_status === "complete"` | Spinner stops, "Your baseline resume is ready" card shown with "Go to Dashboard →" |
| 2.4.8 | Finish onboarding | Click "Go to Dashboard →" | PATCH `/profile/onboarding/complete` → `router.push("/dashboard")` |
| 2.4.9 | Interval cleanup | Navigate away from Recovery step | `clearInterval` called, no orphan polling in background |
| 2.4.10 | `GET /recovery/status` — no active case | User with no recovery case hits status endpoint | Returns `active_case: null` without 404 |
| 2.4.11 | `GET /recovery/questions` — no in_progress case | No active case | Returns `{ questions: [], case_id: null }` |
| 2.4.12 | `GET /recovery/diagnosis` — no case | Hits baseline endpoint with no artifact | HTTP 404 "No diagnosis found. Upload a resume first." |
| 2.4.13 | Unauthenticated recovery endpoints | Call `/recovery/status`, `/recovery/questions` without token | HTTP 401 |

### 2.5 Onboarding — Routing & Guards

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.5.1 | Completed user hits `/onboarding` | Login as user with `onboarding_complete = true` | `/onboarding` server component redirects to `/dashboard` |
| 2.5.2 | Incomplete user hits `/dashboard` | Login as user with `onboarding_complete = false` | `/dashboard` redirects to `/onboarding` |
| 2.5.3 | OnboardingFlow step progression | Complete step 1 → step 2 → step 3 → step 4 | Step counter increments, correct component rendered at each stage |

---

## 3. Dashboard

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.1 | Authenticated render | Navigate to `/dashboard` | Full name in greeting, 3 cards (Jobs, Tracker, Profile) rendered |
| 3.2 | Recovery-in-progress banner | Login as user with `recovery_status != complete` | Yellow warning banner "Resume Quality Recovery in progress" with "Continue Recovery →" CTA |
| 3.3 | Banner absent when complete | Login as user with `recovery_status = complete` | No warning banner, clean dashboard |
| 3.4 | Jobs card link | Click "Discover Roles" card | Navigates to `/jobs` |
| 3.5 | Tracker card link | Click "Application Tracker" card | Navigates to `/tracker` |
| 3.6 | Profile card link | Click "Your Profile" card | Navigates to `/profile` |
| 3.7 | Unauthenticated | Visit `/dashboard` with no session | Redirects to `/login` |
| 3.8 | Name display | Profile has `full_name = "Ammar Syed"` | Greeting shows "Welcome back, Ammar." |
| 3.9 | No name in profile | Profile has no `full_name` | Greeting shows "Welcome back." (no trailing comma) |

---

## 4. Jobs Page

### 4.1 Job Listing

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.1.1 | Load jobs | Navigate to `/jobs` | GET `/jobs/?min_fit=0` called, jobs rendered sorted by fit_score descending |
| 4.1.2 | No jobs state | User with no scored jobs | "No scored jobs yet. Discovery runs every 4 hours." card shown |
| 4.1.3 | Loading spinner | Observe page before jobs load | Spinner shown until data resolves |
| 4.1.4 | Job card fields | Inspect a job card | Title, company, location, remote label, ATS family, fit score badge, eligibility badge, confidence badge visible |
| 4.1.5 | Fit score badge colors | Jobs with scores 80+, 55-79, <55 | Badge colors differ (green/yellow/gray) per `FitScoreBadge` logic |
| 4.1.6 | Eligibility badge | Job with `automation_eligibility=eligible` | Green "eligible" badge |
| 4.1.7 | Restricted badge | Job with `automation_eligibility=restricted` | Yellow "restricted" badge |
| 4.1.8 | Confidence badge — high | `evidence_confidence=high` | Green "high confidence" badge |
| 4.1.9 | Fit explanation | Job with explanation text | Up to 2 lines shown (line-clamp-2) |

### 4.2 Filtering

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.2.1 | Min Fit Score dropdown | Change to 70+ | Re-fetches with `min_fit=70`, jobs with score < 70 excluded |
| 4.2.2 | Min Fit Score 0 | Select 0+ | All scored jobs returned |
| 4.2.3 | Min Fit Score 80 | Select 80+ | Only high-fit jobs shown |
| 4.2.4 | Filter change triggers re-fetch | Change dropdown value | `useEffect` dependency on `minFit` triggers new API call |
| 4.2.5 | Filters panel hidden by default | Load `/jobs` | Filters button visible; Remote/Startup/Region/Board controls hidden |
| 4.2.6 | Expand filters panel | Click "Filters" button | Remote Only toggle, Startup toggle, Region select, Board Type select appear |
| 4.2.7 | Remote Only toggle | Click "Remote Only" | Button turns teal/active; API called with `remote=true`; only remote-eligible jobs shown |
| 4.2.8 | Startup toggle | Click "Startup" | Button turns blue/active; API called with `is_startup=true`; only startup-sourced jobs |
| 4.2.9 | Region filter | Select "United Kingdom" | API called with `source_region=uk`; jobs from UK boards shown |
| 4.2.10 | Board Type filter | Select "Remote-First" | API called with `board_category=remote_first`; only remoteok/remotive jobs |
| 4.2.11 | Combined filters | Remote Only + Region=UK | `remote=true&source_region=uk` params sent; both filters applied |
| 4.2.12 | Clear filter | Deselect Remote Only | Button returns to inactive style; API refetches without `remote` param |
| 4.2.13 | Empty results after filter | Overly restrictive combination | "No matching roles found" empty state shown |
| 4.2.14 | Search box client-side filter | Type "product" in search | Only jobs with "product" in title or company shown; no API call |

### 4.3 Tailoring

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.3.1 | Generate tailored resume | Click "Generate Tailored Resume" on a job | POST `/jobs/{job_id}/tailor` called with auth token |
| 4.3.2 | Tailoring gate — no recovery | User with `recovery_status != complete` triggers tailor | API returns `{ error: "Resume Quality Recovery must complete before tailoring." }` |
| 4.3.3 | Tailoring gate — no baseline | Recovery complete but no baseline artifact | API returns `{ error: "No baseline resume found. Complete recovery first." }` |
| 4.3.4 | Tailoring success | Recovery complete + baseline exists | `generate_tailored_draft` and `generate_cover_letter_draft` tasks queued, alert shown |
| 4.3.5 | Unauthenticated jobs fetch | Remove session, reload page | No jobs loaded (API returns 401), no crash |
| 4.3.6 | Tailoring button — Lock when no recovery | `recovery_status != complete` | "Generate Tailored Resume" shows Lock icon, is disabled; tooltip "Complete resume recovery first" on hover |
| 4.3.7 | Tailoring — queuing state | Click button (recovery complete) | Button shows spinner + "Queuing…" text, disabled |
| 4.3.8 | Tailoring — generating state | POST succeeds | Button transitions to "Generating…" with spinner; polling starts at 3s intervals |
| 4.3.9 | Tailoring — done state | Artifact appears in poll | Download buttons for "Tailored Resume" and "Cover Letter" appear |
| 4.3.10 | Tailoring — timeout state | 60s elapsed, no artifact | "Still generating — retry" button shown |
| 4.3.11 | Artifact download | Click "Tailored Resume" download | GET `/jobs/{id}/artifacts/{id}/url` called; signed URL fetched; file download triggered |
| 4.3.12 | Score breakdown expand | Click "Score breakdown" chevron | Animated panel reveals bar chart with score components |
| 4.3.13 | Category badges — startup job | `is_startup=true` | "Startup" badge (badge-blue) shown below seniority badge |
| 4.3.14 | Category badges — remote-first job | `is_remote_first=true` | "Remote-First" badge (badge-teal) shown |
| 4.3.15 | Region badge — UK/EU/India job | `source_regions` contains `uk`/`eu`/`india` | Region badge in badge-gray shown; global/us regions suppressed |

---

## 5. Tracker Page

### 5.1 Kanban Board

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.1.1 | Load tracker | Navigate to `/tracker` | GET `/tracker/` called, kanban columns rendered |
| 5.1.2 | Ten columns rendered | Inspect board | Columns: Saved, Applied, Phone Screen, Interview, Offer, Rejected, Withdrawn, Ghosted, Interviewing, + any others in COLUMNS |
| 5.1.3 | Items in correct columns | Tracker items with various statuses | Each item appears under its `current_status` column |
| 5.1.4 | Empty column placeholder | Column with no items | Dashed border placeholder "Empty" shown |
| 5.1.5 | Item count badges | Column headers | Badge shows count of items in each column |
| 5.1.6 | No applications state | User with no tracker items | "No applications tracked yet. When you save or apply to a job, it will appear here." card |
| 5.1.7 | Loading spinner | Observe before data loads | Spinner shown until `fetch` resolves |
| 5.1.8 | Stale flag — visual indicator | Item with `stale_flag=true` | Card border changes to `border-apple-warning`, "No updates in 14+ days" warning text |
| 5.1.9 | Fit score badge in card | Item with `job_scores` | `FitScoreBadge` rendered inside card |
| 5.1.10 | Null job_scores | Item with no score | Score badge not rendered, no crash |

### 5.2 Manual Job Addition (AddJobModal)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.2.1 | "Add Job" button present | Load `/tracker` | "+ Add Job" button visible in Kanban board header |
| 5.2.2 | Open modal | Click "+ Add Job" | Modal overlay opens with form fields |
| 5.2.3 | Form fields | Inspect modal | Title (required), Company (required), Application Date (date picker, defaults to today), Description (textarea, optional) |
| 5.2.4 | Submit empty form | Click "Add to Tracker" with no title | Validation prevents submit, required fields highlighted |
| 5.2.5 | Successful add | Fill Title + Company + Date, submit | POST `/tracker/manual` called; modal closes; new card appears in "Applied" column |
| 5.2.6 | Added card content | Inspect new card | Shows Title + Company; no fit score badge (manually added, no score) |
| 5.2.7 | Cancel modal | Click X or outside overlay | Modal closes, no submit |
| 5.2.8 | API gate — no auth | POST `/tracker/manual` with no token | 401 |
| 5.2.9 | API — missing required fields | POST without `title` | 422 FastAPI validation error |

### 5.3 Status Updates

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.3.1 | Change status via dropdown | Select "Interview" from dropdown on "Applied" card | PATCH `/tracker/{item_id}/status` with `new_status=interview`, card moves immediately (optimistic update) |
| 5.3.2 | All status options | Open dropdown | All 7 statuses listed as options |
| 5.3.3 | Ownership check | API called with another user's `item_id` | HTTP 403 "Item not found or access denied." |
| 5.3.4 | Unauthenticated status update | No session, trigger status change | HTTP 401 |

---

## 6. Profile Page

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.1 | Page renders | Navigate to `/profile` | Recovery status, evidence list, job preferences shown |
| 6.2 | Recovery — pending | `recovery_status=pending` | Status text gray, "Continue Recovery →" button shown |
| 6.3 | Recovery — in_progress | `recovery_status=in_progress` | Status text amber/yellow, "Continue Recovery →" button shown |
| 6.4 | Recovery — complete | `recovery_status=complete` | Status text green "Complete", no "Continue Recovery" button |
| 6.5 | Baseline badge | Baseline artifact exists | "✓ Baseline resume generated" shown in recovery card |
| 6.6 | Recovery completion date | `recovery_completed_at` set | "Completed [date]" shown under status |
| 6.7 | No baseline badge | No baseline artifact | Badge absent, no crash |
| 6.8 | Evidence list — populated | User has resume + LinkedIn evidence | Both rows shown with label, type, date, confidence % |
| 6.9 | Evidence list — empty | No evidence uploaded | "No evidence uploaded yet." message |
| 6.10 | Evidence confidence colors | `parse_confidence >= 0.8` vs `< 0.8` | Green vs yellow badge |
| 6.11 | Evidence source buttons | Click "Upload Resume" / "Connect LinkedIn" / "Connect GitHub" | Inline modal opens (does NOT navigate away to onboarding) |
| 6.11a | Resume upload modal | Click "Upload Resume" | File picker modal opens; upload calls `POST /intake/resume`; success closes modal |
| 6.11b | LinkedIn upload modal | Click "Connect LinkedIn" | ZIP drag-drop modal opens; upload calls `POST /intake/linkedin`; success closes modal |
| 6.11c | GitHub connect modal | Click "Connect GitHub" | URL input modal opens; connect calls `POST /intake/github`; success closes modal |
| 6.11d | Modal dismiss | Click X or outside modal | Modal closes, no navigation, profile page stays visible |
| 6.12 | Job preferences — all set | Profile has all preferences filled | All 6 pairs displayed: roles, locations, remote, auth, sponsorship, auto-apply |
| 6.13 | Job preferences — default | Profile with no preferences | "Not set" shown for each field, no crash |
| 6.14 | Unauthenticated | Visit `/profile` without session | Redirects to `/login` |

---

## 7. Backend API — Authenticated Endpoint Tests

Run all of the following with a valid Bearer token. Unless noted, also test each with **no token** (expect 401) and **a garbage token** (expect 401).

### 7.1 Intake

| # | Endpoint | Method | Test | Expected |
|---|----------|--------|------|----------|
| 7.1.1 | `/intake/resume` | POST | Valid PDF | 200 `{ data: { evidence_id, status: "parsing" } }` |
| 7.1.2 | `/intake/resume` | POST | No file | 422 (FastAPI validation) |
| 7.1.3 | `/intake/linkedin` | POST | Valid ZIP | 200 `{ data: { evidence_id, status: "parsing" } }` |
| 7.1.4 | `/intake/github` | POST | `{ owner, repo }` | 200 `{ data: { repo_id, status: "ingestion_queued" } }` |
| 7.1.5 | `/intake/github` | POST | Same repo twice | 200 `status: "resync_queued"` |
| 7.1.6 | `/intake/evidence` | GET | — | 200, list of evidence sorted by `created_at` desc |

### 7.2 Recovery

| # | Endpoint | Method | Test | Expected |
|---|----------|--------|------|----------|
| 7.2.1 | `/recovery/status` | GET | User with active case | 200 with `recovery_status`, `active_case` fields |
| 7.2.2 | `/recovery/status` | GET | No active case | 200 with `active_case: null` |
| 7.2.3 | `/recovery/questions` | GET | In-progress case | 200 with `questions` array and `case_id` |
| 7.2.4 | `/recovery/questions` | GET | No in-progress case | 200 with `questions: []`, `case_id: null` |
| 7.2.5 | `/recovery/answer` | POST | Valid answer payload | 200 `{ status: "answer_saved", rebuild_queued: true }` |
| 7.2.6 | `/recovery/answer` | POST | Wrong `case_id` (other user's) | 403 "Case not found or access denied." |
| 7.2.7 | `/recovery/diagnosis` | GET | Baseline artifact exists | 200 with diagnosis data |
| 7.2.8 | `/recovery/diagnosis` | GET | No artifact | 404 "No diagnosis found. Upload a resume first." |
| 7.2.9 | `/recovery/baseline` | GET | Baseline exists | 200 with artifact data |
| 7.2.10 | `/recovery/baseline` | GET | No baseline | 404 "No baseline resume generated yet." |

### 7.3 Jobs

| # | Endpoint | Method | Test | Expected |
|---|----------|--------|------|----------|
| 7.3.1 | `/jobs/` | GET | Default params | 200, jobs ordered by `fit_score` desc |
| 7.3.2 | `/jobs/` | GET | `min_fit=70` | Only jobs with `fit_score >= 70` |
| 7.3.3 | `/jobs/` | GET | `eligibility=eligible` | Only eligible jobs |
| 7.3.4 | `/jobs/` | GET | `limit=5` | Max 5 jobs returned |
| 7.3.5 | `/jobs/` | GET | `is_startup=true` | Two-step array filter applied; only jobs with `is_startup=true` in DB |
| 7.3.6 | `/jobs/` | GET | `remote=true` | Only jobs with `remote_eligible=true` |
| 7.3.7 | `/jobs/` | GET | `board_category=remote_first` | `board_categories` array contains "remote_first" |
| 7.3.8 | `/jobs/` | GET | `source_region=uk` | `source_regions` array contains "uk" |
| 7.3.9 | `/jobs/` | GET | `board_category=nordic` | Nordic-sourced jobs only |
| 7.3.10 | `/jobs/` | GET | No matching jobs after filter | `{ data: [], total: 0 }` |
| 7.3.11 | `/jobs/{id}` | GET | Valid job_id | 200 with job + user's score |
| 7.3.12 | `/jobs/{id}` | GET | Invalid UUID | 404 "Job not found." |
| 7.3.13 | `/jobs/{id}/tailor` | POST | Recovery not complete | `{ error: "Resume Quality Recovery must complete..." }` |
| 7.3.14 | `/jobs/{id}/tailor` | POST | Recovery complete | 200 `{ status: "tailoring_queued" }` |
| 7.3.15 | `/jobs/{id}/artifacts` | GET | After tailoring | List of artifacts (tailored resume, cover letter) |
| 7.3.16 | `/jobs/{id}/artifacts/{aid}/url` | GET | Valid artifact | 200 with signed URL (5-min TTL) |
| 7.3.17 | `/jobs/{id}/artifacts/{aid}/url` | GET | Another user's artifact | 403 "Artifact not found or access denied." |

### 7.4 Tracker

| # | Endpoint | Method | Test | Expected |
|---|----------|--------|------|----------|
| 7.4.1 | `/tracker/` | GET | — | 200, tracker items with joined job + score data |
| 7.4.2 | `/tracker/{id}/status` | PATCH | Own item | 200 `{ status: "updated" }` |
| 7.4.3 | `/tracker/{id}/status` | PATCH | Another user's item | 403 |
| 7.4.4 | `/tracker/note` | POST | `{ job_id, note }` | 200 `{ status: "note_saved" }` |
| 7.4.5 | `/tracker/{id}/events` | GET | Item with events | 200, event history ordered by `created_at` desc |
| 7.4.6 | `/tracker/manual` | POST | `{ title, company, application_date }` | 201 `{ data: { item_id, job_id, current_status: "applied" } }` |
| 7.4.7 | `/tracker/manual` | POST | Missing `title` | 422 FastAPI validation |
| 7.4.8 | `/tracker/manual` | POST | With `job_description` | 200, description stored in `jobs.application_schema.description` |
| 7.4.9 | `/tracker/manual` | POST | No auth | 401 |

### 7.5 Profile

| # | Endpoint | Method | Test | Expected |
|---|----------|--------|------|----------|
| 7.5.1 | `/profile/` | GET | — | 200, full profile row |
| 7.5.2 | `/profile/` | PATCH | `{ target_roles: ["PM"] }` | 200, profile updated in DB |
| 7.5.3 | `/profile/` | PATCH | Empty payload `{}` | 200 `{ status: "no_changes" }` |
| 7.5.4 | `/profile/onboarding/complete` | PATCH | — | 200, `onboarding_complete = true` in DB |

### 7.6 Apply

| # | Endpoint | Method | Test | Expected |
|---|----------|--------|------|----------|
| 7.6.1 | `/apply/auto` | POST | Valid `{ job_id, artifact_id }` | Delegates to `execute_auto_apply`, returns result |
| 7.6.2 | `/apply/confirm` | POST | ESCALATE confirmation | Delegates to `confirm_and_submit` |
| 7.6.3 | `/apply/sessions` | GET | — | 200, list of apply sessions |
| 7.6.4 | `/apply/sessions/{id}` | GET | Valid session | 200 with session detail |
| 7.6.5 | `/apply/sessions/{id}` | GET | Another user's session | 404 "Session not found." |
| 7.6.6 | `/apply/sessions/{id}/rollback` | POST | Session within rollback window | 200 `{ status: "rolled_back" }`, `status=cancelled` in DB |
| 7.6.7 | `/apply/sessions/{id}/rollback` | POST | Session with `rollback_available=false` | 409 "Rollback window has closed." |

### 7.8 Settings

| # | Endpoint | Method | Test | Expected |
|---|----------|--------|------|----------|
| 7.8.1 | `/settings/blacklist` | GET | Authenticated | 200, list of blacklisted companies for user |
| 7.8.2 | `/settings/blacklist` | GET | No entries | 200 `{ data: [] }` |
| 7.8.3 | `/settings/blacklist` | POST | `{ company_name: "Google", company_website: "google.com" }` | 201, entry created; visible in subsequent GET |
| 7.8.4 | `/settings/blacklist` | POST | Missing `company_name` | 422 FastAPI validation |
| 7.8.5 | `/settings/blacklist/{id}` | DELETE | Own entry | 200 `{ status: "deleted" }` |
| 7.8.6 | `/settings/blacklist/{id}` | DELETE | Another user's entry | 403 |
| 7.8.7 | `/settings/blacklist` | GET | No auth | 401 |
| 7.8.8 | `/settings/blacklist` | POST | No auth | 401 |

### 7.7 Outreach

| # | Endpoint | Method | Test | Expected |
|---|----------|--------|------|----------|
| 7.7.1 | `/outreach/generate` | POST | Valid payload, policy allows | 200 `{ status: "outreach_queued" }` |
| 7.7.2 | `/outreach/generate` | POST | Policy BLOCK decision | `{ error: "policy_blocked" }` |
| 7.7.3 | `/outreach/` | GET | — | 200, list of unsent/undiscarded drafts |
| 7.7.4 | `/outreach/{id}/discard` | PATCH | Own draft | 200 `{ status: "discarded" }`, `user_discarded=true` in DB |

### 7.9 Settings Page (Frontend)

| # | Test Case | Steps | Expected |
|---|-----------|-------|---------|
| 7.9.1 | Page renders | Navigate to `/settings` | 4 sections visible: Profile, Job Targeting, Blacklisted Companies, Integrations |
| 7.9.2 | Auth gate | Visit `/settings` without session | Redirect to `/login` |
| 7.9.3 | Profile section | Update name | PATCH `/profile/` called; success message shown |
| 7.9.4 | Job Targeting section | Toggle remote preference | Profile updated |
| 7.9.5 | Blacklist — add company | Enter company name + website, click Add | POST `/settings/blacklist`; company appears in list immediately |
| 7.9.6 | Blacklist — remove company | Click trash/remove icon on an entry | DELETE `/settings/blacklist/{id}`; entry removed from list |
| 7.9.7 | Integrations — Apify key | Paste API key, save | Key stored in `profiles.apify_api_key`; show/hide toggle works |
| 7.9.8 | Integrations — key hidden | Default state | Key input shows `•••` (password type), not plain text |

---

## 8. Security & Auth Edge Cases

| # | Test Case | Expected |
|---|-----------|----------|
| 8.1 | Missing `Authorization` header on any protected endpoint | 401 "Not authenticated" (StrictBearer wraps HTTPBearer to return 401 for missing scheme — F-1 fixed) |
| 8.2 | `Authorization: Bearer ` (empty token) | 401 "Not authenticated" (StrictBearer catches empty token string) |
| 8.3 | `Authorization: Bearer eyJfake.token.here` | 401 from `get_current_user` → Render logs show actual exception type from `security.py` |
| 8.4 | Expired access token (not refreshed) | Backend logs `Auth validation failed — AuthApiError: JWT expired ...` |
| 8.5 | Cross-user data access | User A's token + User B's resource ID | 403 or 404 for ownership-checked resources |
| 8.6 | Secret code in memory, not re-typed | After login, revisit `/gate` via Google OAuth | Must re-enter secret code, no pre-fill from browser memory |
| 8.7 | OTP brute-force — counter persists across requests | 4 wrong guesses + 1 correct guess on 5th | 5th guess succeeds (counter = 4 < 5 at check time) |
| 8.8 | OTP brute-force — counter blocks at 5 | 5 wrong guesses, then correct on 6th | 6th attempt blocked (counter = 5 ≥ 5) even though code is correct |
| 8.9 | Service role key not exposed to client | Inspect Vercel build output / page source | `SUPABASE_SERVICE_KEY` NOT present in any client bundle (only used in API routes) |
| 8.10 | CORS preflight | OPTIONS request to `/intake/resume` from `rbot-mu.vercel.app` | 200, correct `Access-Control-Allow-Origin` header |

---

## 9. Navigation & Routing

| # | Test Case | Expected |
|---|-----------|----------|
| 9.1 | `/` (root) | Landing page or redirect to `/login` |
| 9.2 | Authenticated user visits `/login` | Consider redirecting to `/dashboard` (check if implemented) |
| 9.3 | Nav bar — active link highlight | On `/jobs`, Jobs link has `text-apple-accent` style |
| 9.4 | Nav bar — RBot logo | Click "RBot" in nav | Navigates to `/dashboard` |
| 9.5 | Back button behavior | Login → onboarding → back | Does not loop back to login (no session loss) |
| 9.6 | Direct URL access for each page | Visit `/jobs`, `/tracker`, `/profile`, `/dashboard` directly | All load correctly with valid session |

---

## 10. Error States & Resilience

| # | Test Case | Expected |
|---|-----------|----------|
| 10.1 | Backend down | Kill/suspend Render service, trigger any API call | UI shows error state, no unhandled exception, no white screen |
| 10.2 | Supabase down | All DB calls fail | Auth fails gracefully, user sees error message |
| 10.3 | Resend API failure | Resend unreachable → POST `/api/auth/send-otp` | Returns 502 "Failed to send email", error shown in UI |
| 10.4 | Partial JSON response | API returns malformed JSON | `resp.json()` throws, caught in catch block, error state shown |
| 10.5 | Network timeout | Very slow connection | Fetch hangs; no UX spinner timeout currently implemented — note as gap |
| 10.6 | `_getToken()` returns empty string | Session completely lost | API call sent with empty Bearer → 403 from FastAPI (not crash) |
| 10.7 | DB insert failure on resume upload | Supabase `raw_evidence` insert fails | 500 propagated, client shows upload failure |

---

## 11. Frontend — UI / UX Spot Checks

| # | Test Case | Expected |
|---|-----------|----------|
| 11.1 | Mobile viewport (375px) | Visit `/login`, `/onboarding`, `/jobs` on 375px viewport | No horizontal overflow, text readable, buttons tappable |
| 11.2 | Long company name in job card | Job with 60-char company name | Truncated or wraps without breaking layout |
| 11.3 | Long job title in kanban card | Title > 30 chars | `line-clamp-1` clips text |
| 11.4 | LinkedIn step accessibility | Tab navigation through LinkedIn step | `role="button"` drop zone is keyboard-accessible (`Enter` triggers click) |
| 11.5 | Spinner animation | Any loading state | Spinner rotates smoothly, stops when data loads |
| 11.6 | Disabled button states | Submit Answer with empty textarea | Button disabled, cannot click |
| 11.7 | GitHub step auto-advance | After successful connect | `setTimeout(onNext, 1500)` fires, step advances in 1.5s |

---

## 12. End-to-End Happy Path (Full Platform Smoke Test)

Run in this exact order to simulate a brand-new user completing the full journey:

1. **Login**: Visit `/login` → enter email → receive OTP → enter code + `AMMAR8800206651` → verify → lands at `/onboarding`
2. **Resume**: Upload a real PDF resume → wait for "uploading" → observe step advance
3. **LinkedIn**: Upload a real LinkedIn `.zip` export (or skip)
4. **GitHub**: Enter `md-ammar-97` / any public repo → connect (or skip)
5. **Recovery**: Observe spinner → questions appear → answer at least one → submit → wait for rebuild → "Your baseline resume is ready" → click "Go to Dashboard →"
6. **Dashboard**: Verify `onboarding_complete=true`, no warning banner (or banner if recovery still in-progress), 3 navigation cards visible
7. **Jobs**: Navigate to `/jobs` → verify jobs list loads → change filter to 70+ → "Generate Tailored Resume" on one job
8. **Tracker**: Navigate to `/tracker` → verify kanban renders → move a card from "Saved" to "Applied"
9. **Profile**: Navigate to `/profile` → verify evidence rows, recovery status "Complete", baseline badge present
10. **Session persistence**: Reload the page on `/profile` → still logged in, no redirect to `/login`

All 10 steps must succeed without any manual workaround for a passing end-to-end run.

---

## 13. Regression Checklist (run after any deploy)

- [ ] OTP email delivers within 60 seconds
- [ ] `window.location.href` redirect after login causes a full page reload (check Network tab — first request is a document load, not XHR)
- [ ] No 401 errors on `/intake/resume` when logged in (Render logs clean)
- [ ] `/recovery/status` and `/recovery/questions` return 200 (not 401)
- [ ] Kanban board loads tracker items
- [ ] Jobs page loads scored jobs
- [ ] Profile page shows correct recovery status
- [ ] No TypeScript errors (`npx tsc --noEmit` passes in `frontend/`)
- [ ] Render deploy status is "Live" (not crashed)
- [ ] Vercel deployment status is "Ready"
