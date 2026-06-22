# RBot Platform — Issues Log

**Last updated:** 2026-06-22  
**Test run:** Live testing against https://rbot-api.onrender.com · https://rbot-mu.vercel.app  
**Test account:** mohdammar97+test@gmail.com  

---

## Summary

| ID | Severity | Status | Area | Title |
|----|----------|--------|------|-------|
| B-1 | Critical | ✅ Fixed | Backend Auth | All authenticated endpoints returned 401 |
| B-2 | High | ✅ Fixed | Backend | Invalid UUID path params crash with 500 instead of 404 |
| B-3 | High | ✅ Fixed | Backend | Recovery endpoints 500 when user has no profile row |
| B-4 | High | ✅ Fixed | Backend | `GET /tracker/` and `POST /tracker/note` return 500 |
| B-5 | Medium | ✅ Fixed | Backend | `GET /jobs/{id}` 500 on nonexistent job (same class as B-2) |
| D-1 | Critical | ⚠️ Partial | Infra | No Celery worker deployed — all background tasks never execute |
| F-2 | High | ✅ Fixed | Frontend | Recovery step shows infinite spinner with no timeout or fallback |
| F-3 | Medium | ✅ Fixed | Frontend | Onboarding progress circles mark skipped steps as complete (✓) |
| F-1 | Low | ✅ Fixed | Frontend/API | Missing Bearer header returns 403, not 401 |

---

## B-1 — All Authenticated Endpoints Returned 401 ✅ FIXED

**Severity:** Critical  
**Deployed:** 2026-06-21T23:06:05Z (commit `c75c64a`)  
**Affected:** Every protected API endpoint

**Root cause:**  
In `backend/app/core/security.py`, after `supabase_admin.auth.get_user(token)` **succeeded**, the next line was:
```python
result.user.access_token = token
```
`gotrue-py` v2 uses Pydantic v2, which raises `ValueError` on unknown field assignment. The `User` model has no `access_token` field. This `ValueError` was caught by the bare `except Exception` handler and returned as HTTP 401. The JWT was **always valid** — auth succeeded but the post-auth assignment always crashed.

**Evidence from Render logs:**
```
Auth validation failed — ValueError: "User" object has no field "access_token"
  (token prefix: eyJhbGciOiJFUzI1NiIs...)
```
This appeared on every single authenticated request.

**Fix:** Removed `result.user.access_token = token`. No downstream handlers use `user.access_token` — all use `user.id` only.

---

## B-2 — Invalid UUID Path Params Crash with 500 Instead of 404

**Severity:** High  
**Status:** Open  
**Affected endpoints:**
- `GET /jobs/{job_id}`
- `GET /jobs/{job_id}/artifacts`
- `PATCH /tracker/{item_id}/status`
- `GET /tracker/{item_id}/events`
- `GET /apply/sessions/{session_id}`
- `POST /apply/sessions/{session_id}/rollback`

**Observed:** All return `500 Internal Server Error` when given a non-UUID string like `nonexistent-session-id`.

**Root cause from Render logs:**
```
postgrest.exceptions.APIError: {
  'code': '22P02',
  'message': 'invalid input syntax for type uuid: "nonexistent-session-id"'
}
  File "backend/app/api/apply.py", line 52, in rollback_session
  File "backend/app/api/tracker.py", line 32, in update_status
  File "backend/app/api/tracker.py", line 59, in get_events
```
Path parameters are passed directly to `.eq("id", ...)` without UUID format validation. The `APIError` is unhandled, so FastAPI returns 500.

**Expected:** 404  
**Reproduction:** `GET /apply/sessions/not-a-uuid` with valid Bearer token → 500

**Fix:** Wrap PostgREST single-row queries in try/except and return 404:
```python
try:
    result = supabase_admin.table("apply_sessions").select("*") \
             .eq("id", session_id).eq("user_id", user.id).single().execute()
except Exception:
    raise HTTPException(404, "Session not found.")
```
**Files:** `apply.py:40,52` · `tracker.py:32,59` · `jobs.py:44-47,78-80`

---

## B-3 — Recovery Endpoints Return 500 When User Has No Profile Row

**Severity:** High  
**Status:** Open  
**Affected:** `GET /recovery/status` · `GET /recovery/questions` · `GET /recovery/diagnosis` · `GET /recovery/baseline`

**Observed:** All four return `500 Internal Server Error` for the test account.

**Root cause:** `recovery.py → recovery_status()` calls `.single()` on the profiles table:
```python
profile = supabase_admin.table("profiles") \
          .select("...").eq("id", user.id).single().execute()
```
PostgREST `.single()` raises `APIError` when 0 rows are returned. The test user was created via OTP flow but may not have a `profiles` row if the `on_user_create` Supabase trigger is missing or failed.

**Impact:** Any newly created user whose profile row isn't seeded will see 500 errors on all recovery endpoints, breaking onboarding at Step 4.

**Fix (two-part):**
1. In Supabase dashboard, verify a trigger exists: `INSERT INTO public.profiles (id) VALUES (NEW.id)` on `auth.users INSERT`.
2. In `recovery.py`, replace `.single()` with `.maybe_single()` + guard:
```python
profile = supabase_admin.table("profiles") \
          .select("...").eq("id", user.id).maybe_single().execute()
if not profile.data:
    raise HTTPException(404, "Profile not found.")
```

---

## B-4 — `GET /tracker/` and `POST /tracker/note` Return 500

**Severity:** High  
**Status:** Open  
**Affected:** `GET /tracker/` · `POST /tracker/note`

**Observed:** Both return `500 Internal Server Error` for the test account, even though neither uses `.single()`.

**Root cause (suspected):** The tracker query uses PostgREST foreign table join syntax:
```python
supabase_admin.table("tracker_items").select(
    "..., jobs(id, title, ...), job_scores(fit_score, ...)"
)
```
If `tracker_items`, `jobs`, or `job_scores` tables are missing from the production DB schema, or foreign key relationships are not set up, PostgREST rejects the query. This suggests one or more DB migrations have not been run in production.

`POST /tracker/note` calls `add_note()` in `services/tracker.py` which likely inserts into `tracker_notes` — same missing-table issue.

**Fix:** Verify all migrations have run in production. In Supabase dashboard, confirm `tracker_items`, `tracker_events`, `tracker_notes` tables exist with FK to `jobs` and `job_scores`.

---

## B-5 — `GET /jobs/{id}` Returns 500 on Nonexistent Job

**Severity:** Medium  
**Status:** Open (same class as B-2)  
**Affected:** `GET /jobs/{job_id}` · `GET /jobs/{job_id}/artifacts`

**Root cause:** `jobs.py → get_job()` uses `.single()`:
```python
job = supabase_admin.table("jobs").select("*").eq("id", job_id).single().execute()
```
When `job_id` doesn't exist, `.single()` throws APIError → unhandled → 500.

**Expected:** 404 `"Job not found."`

**Fix:**
```python
job = supabase_admin.table("jobs").select("*").eq("id", job_id).maybe_single().execute()
if not job.data:
    raise HTTPException(404, "Job not found.")
```

---

## F-1 — Missing Bearer Header Returns 403, Not 401

**Severity:** Low  
**Status:** ✅ Fixed — commit pending push

**Observed:** Requests with no `Authorization` header receive `403 {"detail":"Not authenticated"}`.  
Requests with a present-but-invalid token correctly return `401 {"detail":"Invalid or expired token"}`.

**Root cause:** FastAPI's built-in `HTTPBearer` dependency returns 403 for missing scheme. This is technically RFC-compliant but inconsistent for API consumers.

**Fix (optional):**
```python
class StrictBearer(HTTPBearer):
    async def __call__(self, request: Request):
        try:
            return await super().__call__(request)
        except HTTPException:
            raise HTTPException(status_code=401, detail="Not authenticated")
bearer = StrictBearer()
```

---

## D-1 — No Celery Worker Deployed — All Background Tasks Never Execute

**Severity:** Critical  
**Status:** ⚠️ Partial — `render.yaml` updated; manual deploy step required  
**Discovered:** 2026-06-22 via Render service list

**Observed:** Every background task queued via `task.delay()` silently stalls. Affected tasks include:
- `build_profile_graph` — triggered after resume upload and after each recovery answer
- `generate_tailored_draft` / `generate_cover_letter_draft` — triggered by `POST /jobs/{id}/tailor`
- Any other Celery tasks in `backend/app/workers/tasks.py`

**Root cause:** `rbot-api` is the only running service. There is no background worker process, and Redis (while provisioned) has no `REDIS_URL` set on the API service.

**`render.yaml` is already correct** — it defines `rbot-celery` (background worker) and links `REDIS_URL` from `rbot-redis`. The services just haven't been deployed via Blueprint yet.

**Manual step required — create `rbot-celery` on Render:**
1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Background Worker**
2. Connect to repo `md-ammar-97/Rbot`, branch `master`
3. Set **Root Directory**: `backend`
4. Set **Build Command**: `pip install -r requirements.txt`
5. Set **Start Command**: `celery -A app.workers.celery_app worker --loglevel=info -Q ingestion,profile,recovery,discovery,scoring,drafting -c 2`
6. Copy all env vars from `rbot-api` to this service (Supabase, Groq, etc.)
7. Add `REDIS_URL` → copy from rbot-redis **"Connect"** tab → **Internal Connection String**
8. Also set `REDIS_URL` on `rbot-api` (same value) if not already set

---

## F-2 — Recovery Step Shows Infinite Spinner With No Timeout or Fallback

**Severity:** High  
**Status:** ✅ Fixed — 120-second timeout with "Continue to Dashboard" + "Check again" fallback  
**Source:** ChatGPT agent test report, 2026-06-21  
**File:** [frontend/components/onboarding/steps/RecoveryStep.tsx](frontend/components/onboarding/steps/RecoveryStep.tsx)

**Observed:** The recovery step (onboarding step 4) shows "Analysing your resume… This takes 15–30 seconds." with an animated spinner indefinitely. The user has no way to proceed or retry.

**Root cause:**
```tsx
if (status === "pending") {
  return <spinner />;  // no timeout, no escape
}
```
The component polls `GET /recovery/status` every 5 seconds and renders the spinner while `status === "pending"`. Two conditions cause it to spin forever:
1. User skipped resume upload — no Celery task was ever queued, so `recovery_status` never leaves `"pending"`
2. No Celery worker is running (D-1) — even if a resume was uploaded, the analysis task is never processed

**Fix needed (frontend):** Add a timeout after ~2 minutes, show a clear message and a "Try uploading your resume again" button:
```tsx
const [elapsed, setElapsed] = useState(0);
// in the poll interval: setElapsed(e => e + 5)
if (status === "pending" && elapsed > 120) {
  return <ErrorState message="Analysis is taking longer than expected." onRetry={...} />;
}
```

---

## F-3 — Onboarding Progress Circles Mark Skipped Steps as Complete (✓)

**Severity:** Medium  
**Status:** ✅ Fixed — steps only turn green via explicit `onComplete`, skipped steps remain grey  
**Source:** ChatGPT agent test report, 2026-06-21  
**File:** [frontend/components/onboarding/OnboardingFlow.tsx](frontend/components/onboarding/OnboardingFlow.tsx)

**Observed:** After clicking "Skip for now" on steps 1–3, all three circles show a green ✓, giving the false impression that resume upload, LinkedIn export, and GitHub connection succeeded.

**Root cause:**
```tsx
i < stepIndex
  ? "bg-apple-success text-white"   // ← ✓ for ANY past step, including skipped
  : i === stepIndex
  ? "bg-apple-accent text-white"
  : "bg-apple-border ..."
```
The component tracks only `currentStep` index, not whether each step was actually completed. "Skip for now" calls `onNext()` which increments `stepIndex`, making all prior steps appear green.

**Fix:** Track completion state per step:
```tsx
const [completed, setCompleted] = useState<Set<Step>>(new Set());
// pass onComplete={() => setCompleted(s => new Set(s).add(step))} to each step
// in the progress circles:
i < stepIndex
  ? completed.has(STEPS[i]) ? "bg-apple-success ..." : "bg-apple-border ..."
```
Skipped steps should show a neutral (grey) dot, not a green ✓.

---

## Notes on ChatGPT Agent Report (2026-06-21)

The external test report identified 4 issues:

| Report # | Title | Status |
|----------|-------|--------|
| 1 | Resume upload "Invalid or expired token" | ✅ Root cause was B-1 — fixed 2026-06-21T23:06Z |
| 2 | GitHub connect "Invalid or expired token" | ✅ Root cause was B-1 — fixed 2026-06-21T23:06Z |
| 3 | Recovery spinner never completes | 🔴 Tracked as F-2 + D-1 |
| 4 | Misleading progress indicators | 🔴 Tracked as F-3 |

---

## Confirmed Passing Tests

### Auth & Security
- ✅ CORS allows `rbot-mu.vercel.app` — headers: `access-control-allow-origin`, `allow-credentials: true`
- ✅ CORS blocks `evil-site.com` → 400
- ✅ All 13 protected endpoints return 403 with no Bearer header
- ✅ All endpoints return 401 with a fake/garbage JWT
- ✅ Token is validated against Supabase project `ogecgrhzretnkgehyifi`

### Frontend Routing (unauthenticated)
- ✅ `/dashboard`, `/onboarding`, `/jobs`, `/tracker`, `/profile`, `/gate` → all 307 redirect to `/login`
- ✅ `/login` → 200 (public)

### OTP Error Handling
- ✅ Empty email → `{"error":"Email is required"}`
- ✅ Missing email field → `{"error":"Email is required"}`
- ✅ Missing fields on verify → `{"error":"Missing required fields"}`
- ✅ Wrong secret code → `{"error":"Invalid access code."}`
- ✅ Correct secret, no active OTP → `{"error":"Invalid or expired code. Request a new one."}`

### API (authenticated, post B-1 fix)
- ✅ `GET /profile/` → 200 with profile data
- ✅ `PATCH /profile/` empty body → 200 `{"status":"no_changes"}`
- ✅ `PATCH /profile/` with data → 200, updates DB
- ✅ `PATCH /profile/onboarding/complete` → 200 `{"status":"onboarding_complete"}`
- ✅ `GET /jobs/` → 200 `{"data":[],"total":0}`
- ✅ `GET /jobs/?min_fit=70` → 200 (filtered)
- ✅ `GET /jobs/?min_fit=150` → 422 "Input should be ≤ 100"
- ✅ `GET /jobs/?min_fit=-5` → 422 "Input should be ≥ 0"
- ✅ `GET /jobs/?limit=500` → 422 "Input should be ≤ 200"
- ✅ `GET /jobs/?limit=0` → 422 "Input should be ≥ 1"
- ✅ `POST /jobs/{id}/tailor` (recovery incomplete) → `{"error":"Resume Quality Recovery must complete..."}`
- ✅ `GET /apply/sessions` → 200 `{"data":[]}`
- ✅ `GET /outreach/` → 200 `{"data":[]}`
- ✅ `POST /outreach/generate` → 200 `{"status":"outreach_queued"}`
- ✅ `GET /intake/evidence` → 200 `{"data":[]}`
- ✅ `GET /health` → 200 `{"status":"ok","env":"production"}`

---

## Recommended Fix Order

1. **D-1** — Blocking. Without a Celery worker + Redis, the entire onboarding pipeline (resume parsing, profile graph, job scoring, tailoring) is dead. Create a Redis Key-Value instance and a background worker service on Render.
2. **F-2** — High UX impact. Add a 2-minute timeout + retry/skip fallback to `RecoveryStep.tsx`.
3. **F-3** — Medium UX. Track `completed` state per onboarding step; show grey dot for skipped steps.
4. **F-1** — Low priority, only affects non-browser consumers checking status codes precisely.
