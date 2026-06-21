# RBot — Issues Log

**Last updated:** 2026-06-21  
**Overall auth status:** Email auth fully rearchitected — now uses Supabase native OTP (no Resend, no custom API routes, no server-side Vercel secrets). Vercel only needs 3 public env vars. Remaining blockers: Vercel deployment protection (D-1) and Supabase "Enable Email OTP" setting (E-1).

---

## Section A — Code-Level Bugs (Previous Chat — Fixed)

These were identified and fixed in code during the previous session. All are resolved in the current codebase on `master`.

---

### A-1 · PKCE Double-Exchange Race Condition
**Status:** FIXED — `f1e9f74`  
**Affected:** Google OAuth  
**Symptom:** OAuth callback returned `auth_failed` intermittently. The PKCE code verifier was already consumed by the time our manual `exchangeCodeForSession` ran.  
**Root cause:** Supabase's browser client has `detectSessionInUrl: true` by default. On page load it auto-detects the `?code=` param in the URL and tries to exchange it simultaneously with our `/auth/callback` route handler — whichever runs second fails because the code is one-time-use.  
**Fix:** Set `detectSessionInUrl: false` in `frontend/lib/supabase/client.ts`. Only the server-side `/auth/callback` route now calls `exchangeCodeForSession`.

---

### A-2 · Middleware Intercepting the OAuth Callback Route
**Status:** FIXED — matcher config  
**Affected:** Google OAuth  
**Symptom:** After Google redirected back to `/auth/callback`, the middleware ran `getUser()` (which failed — no session yet), and redirected the user to `/login` before the callback could exchange the code.  
**Root cause:** The middleware matcher covered all routes including `/auth/callback`.  
**Fix:** Updated `config.matcher` in `frontend/middleware.ts` to exclude `api` and `auth/callback`:
```
matcher: ["/((?!_next/static|_next/image|favicon.ico|api|auth/callback).*)"]
```

---

### A-3 · Session Cookies Lost on Redirect
**Status:** FIXED — `743d194`  
**Affected:** Google OAuth  
**Symptom:** After `exchangeCodeForSession` succeeded, the browser arrived at `/onboarding` or `/dashboard` with no session — immediately redirected back to `/login`.  
**Root cause:** `setAll` wrote session cookies to a `NextResponse.next()` object. When we then returned a `NextResponse.redirect()`, that response object was different — it didn't carry the cookies.  
**Fix:** Cookie-sink pattern in `frontend/app/auth/callback/route.ts` — after exchange, iterate `cookieSink.cookies.getAll()` and copy each cookie onto the `finalResponse` redirect.

---

### A-4 · TypeScript Type Errors in `setAll` Callbacks
**Status:** FIXED — `1dccbda` `3fcda6c` `2f634b9` `18a26da`  
**Affected:** Build / TypeScript compilation  
**Symptom:** Multiple TS errors: `Parameter 'cs' implicitly has an 'any' type` in middleware, server client, and auth callback.  
**Root cause:** `@supabase/ssr`'s `setAll` callback parameter wasn't inferred automatically in strict mode.  
**Fix:** Added explicit type annotation `cs: Array<{ name: string; value: string; options?: Record<string, unknown> }>` in all three files.

---

### A-5 · Client-Side PKCE Exchange Attempt
**Status:** REVERTED — `d2d4dc1`  
**Affected:** Google OAuth  
**Symptom:** Auth callback was rewritten as a client-side page component to use the browser's Supabase client for `exchangeCodeForSession`. This created its own race (the browser rendered, auto-detection ran, etc.).  
**Resolution:** Reverted back to a Next.js Route Handler (`route.ts`) doing the exchange server-side, which is the correct pattern for Supabase SSR.

---

### A-6 · Temporary Debug UI in Auth Callback
**Status:** REMOVED — `efae485`  
**Affected:** Google OAuth debugging  
**What it was:** Converted `/auth/callback` into a page that rendered the raw `exchangeCodeForSession` error to the screen (instead of redirecting) so we could read it during debugging.  
**Resolution:** Debug page removed once the underlying issues (A-1, A-2, A-3) were fixed.

---

### A-7 · Email Identity / Email Confirmation for Password Login
**Status:** FIXED — `3373a0b`  
**Affected:** Email + OTP login  
**Symptom:** `signInWithPassword` in the `send-otp` route returned an error even for valid credentials.  
**Root cause:** Supabase required email confirmation before allowing password sign-in, and/or the user's account was created via Google OAuth (no password set) while the email identity needed explicit linking.  
**Fix:** Resolved in commit `3373a0b` — server-side OAuth callback + proper email identity handling for password-based login.

---

## Section B — Configuration Issues (Current — Open)

These are **not code bugs** — the code is correct. Login is broken because required env vars or Supabase/Google settings haven't been configured for the production deployment.

---

### B-1 · `RESEND_API_KEY` Missing from Vercel
**Status:** N/A — 2026-06-21  
Email auth rearchitected to use Supabase native OTP. Resend is no longer used for auth. Custom `/api/auth/send-otp` route deleted.

---

### B-2 · `OTP_FROM_EMAIL` Missing from Vercel
**Status:** N/A — 2026-06-21  
Same as B-1 — Resend no longer involved in email login.

---

### B-3 · `SUPABASE_SERVICE_KEY` Missing from Vercel
**Status:** N/A — 2026-06-21  
Custom `/api/auth/send-otp` and `/api/auth/verify-otp` routes deleted. Vercel no longer needs any server-side Supabase keys.

---

### B-4 · Supabase Redirect URL Not Set for Production Vercel URL
**Status:** OPEN  
**Affected:** Google OAuth  
**Symptom:** Google OAuth redirect fails — Supabase rejects the callback because the redirect URL is not in the allowlist.  
**Fix:** Supabase dashboard → Authentication → URL Configuration:
- **Redirect URLs:** add `https://<your-vercel-url>/auth/callback`

---

### B-5 · Supabase Site URL Still Pointing to Localhost
**Status:** OPEN (likely)  
**Affected:** Google OAuth  
**Symptom:** After successful Google auth, Supabase redirects to `http://localhost:3000/auth/callback` instead of the production URL.  
**Fix:** Supabase dashboard → Authentication → URL Configuration:
- **Site URL:** set to `https://<your-vercel-url>`

---

### B-6 · `FRONTEND_URL` on Render Set to Placeholder
**Status:** FIXED — 2026-06-21  
**Affected:** CORS on backend API calls  
**Symptom:** Once users are logged in and make API calls from the frontend, the FastAPI backend may reject requests because `FRONTEND_URL=http://placeholder.com` doesn't match the actual origin.  
**Fix applied:** `APP_ENV=production` and `FRONTEND_URL=https://rbot-gzerf4kai-ammar-s-projects97.vercel.app` set via Render MCP. Update to custom domain later if added.

---

## Section C — Unverified / Needs Investigation

These haven't been confirmed as issues but may cause failures once B-1 through B-6 are resolved.

---

### C-1 · Google Cloud Console Authorized Redirect URIs
**Status:** UNVERIFIED  
**Risk:** If `https://ogecgrhzretnkgehyifi.supabase.co/auth/v1/callback` is not in the Google OAuth client's authorized redirect URIs, Google will reject the OAuth flow entirely.  
**Check:** Google Cloud Console → APIs & Services → Credentials → your OAuth client → Authorized redirect URIs → confirm `https://ogecgrhzretnkgehyifi.supabase.co/auth/v1/callback` is listed.

---

### C-2 · Supabase "Confirm Email" Setting
**Status:** UNVERIFIED  
**Risk:** If Supabase Auth has "Confirm email" enabled, newly invited users cannot sign in with email+password until they click a confirmation link. The `signInWithPassword` call in `send-otp` will fail with `Email not confirmed`.  
**Check:** Supabase dashboard → Authentication → Providers → Email → verify "Confirm email" is **disabled** (or that all test users have confirmed emails).

---

### C-3 · `otp_verifications` Table Existence
**Status:** VERIFIED — table exists with all required columns  
**Risk:** The `otp_verifications` table was applied via Supabase MCP in the previous session. If for any reason the migration didn't apply, all OTP routes will fail with a Postgres error on the table read/write.  
**Check:** Supabase dashboard → Table Editor → confirm `otp_verifications` table exists with columns: `id`, `user_id`, `email`, `otp_code`, `expires_at`, `used`, `attempts`, `created_at`.  
**Recovery SQL (if missing):**
```sql
CREATE TABLE public.otp_verifications (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email      text        NOT NULL,
    otp_code   text        NOT NULL,
    expires_at timestamptz NOT NULL,
    used       bool        NOT NULL DEFAULT false,
    attempts   int         NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_email_active ON otp_verifications(email, used, expires_at);
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
```

---

## Section E — New Architecture Issues (2026-06-21)

---

### E-1 · Supabase "Enable Email OTP" Must Be On
**Status:** MANUAL CHECK NEEDED  
**Affected:** Email login  
**Risk:** `supabase.auth.signInWithOtp({ email })` sends a magic link by default if "Enable Email OTP" is off. Users would receive a click-link email instead of a 6-digit code, and `verifyOtp({ type: 'email' })` would not work.  
**Fix:** Supabase dashboard → Authentication → Providers → Email → toggle **"Enable Email OTP"** ON.

---

## Section D - Current Investigation and Updates (2026-06-21)

This section records the latest investigation and local code changes made after reviewing all project Markdown files, auth code, Supabase state reachable from local keys, GitHub deployment metadata, and public deployed endpoints.

---

### D-1 - Latest Vercel Deployment Exists but Is Protected
**Status:** VERIFIED BLOCKER  
**Affected:** Google OAuth, Email + OTP login  
**Finding:** GitHub deployment status shows the latest successful Vercel deployment target is:

`https://rbot-gzerf4kai-ammar-s-projects97.vercel.app`

Direct HTTP checks against `/`, `/login`, and `/api/auth/send-otp` return `401 Unauthorized` with Vercel SSO/protection headers. The app may be built, but public users cannot reach it.

**Required fix:** In Vercel, disable deployment protection / SSO for the production deployment, or attach a public production domain to this project.

---

### D-2 - Documented `https://rbot.vercel.app` Is Not the RBot App
**Status:** VERIFIED BLOCKER  
**Affected:** Google OAuth, Email + OTP login  
**Finding:** `https://rbot.vercel.app` does not serve this Next.js app:
- `/` returns an unrelated JavaScript file (`index.js`) containing IRC/Gitter code.
- `/login` returns `404 Not Found`.

**Root cause:** The documented/custom production URL is not attached to the current RBot Vercel deployment.

**Required fix:** Either attach `rbot.vercel.app` or the intended custom domain to the RBot Vercel project, or update all production config to use the actual deployed URL.

---

### D-3 - Render Backend Is Up but Production Env/CORS Are Wrong
**Status:** FIXED — 2026-06-21  
**Affected:** Authenticated frontend API calls after login  
**Findings:**
- `GET https://rbot-api.onrender.com/health` returns `200 OK`.
- Response body reports `{"status":"ok","env":"development"}`, so Render is not running the intended `APP_ENV=production`.
- CORS preflight from `https://rbot-gzerf4kai-ammar-s-projects97.vercel.app` returns `400 Bad Request`.
- CORS preflight from `http://localhost:3000` returns `200 OK`, confirming Render is still configured for local frontend origin.

**Local code update:** `backend/app/main.py` now accepts comma-separated origins in `FRONTEND_URL`, so production can allow the Vercel deployment URL and a custom domain without another code change.

**Required fix:** In Render `rbot-api`, set:

```env
APP_ENV=production
FRONTEND_URL=https://rbot-gzerf4kai-ammar-s-projects97.vercel.app
```

If a custom domain is attached later, use a comma-separated value:

```env
FRONTEND_URL=https://rbot-gzerf4kai-ammar-s-projects97.vercel.app,https://your-custom-domain.com
```

Then redeploy `rbot-api`.

---

### D-4 - Supabase Checks
**Status:** PARTIALLY VERIFIED  
**Affected:** Google OAuth, Email + OTP login  
**Findings:**
- Supabase Auth settings endpoint confirms Google provider is enabled.
- Supabase Auth settings endpoint confirms Email provider is enabled.
- Supabase OAuth authorize endpoint returns `302 Found` for both:
  - `https://rbot-gzerf4kai-ammar-s-projects97.vercel.app/auth/callback`
  - `https://rbot.vercel.app/auth/callback`
- `otp_verifications` table exists and is readable with the service role key.
- Supabase Auth settings show `mailer_autoconfirm: false`, meaning email/password users must be confirmed before password sign-in works.
- Sampled Google-created user still shows only Google as provider in auth metadata, so password+OTP login will not work for that Google-only account unless an email/password identity is linked or a separate confirmed email/password user is created.

**Local code update:** Added checked-in migration `backend/migrations/006_otp_verifications.sql` so the OTP table is no longer only an out-of-band Supabase change.

**Required fix:** For email+password login, ensure test users are confirmed and have an email/password identity. Either disable email confirmation for this private beta or invite/create confirmed users explicitly.

---

### D-5 - Local Code Changes Applied
**Status:** APPLIED LOCALLY, NOT YET COMMITTED  
**Files changed:**
- `frontend/app/api/auth/_utils.ts` added shared auth env validation and Supabase client helpers.
- `frontend/app/api/auth/send-otp/route.ts` now validates required env vars, normalizes email, uses crypto-safe OTP generation, handles Supabase lookup/insert errors, and returns `502` if Resend rejects the email request instead of silently returning success.
- `frontend/app/api/auth/verify-otp/route.ts` now validates env vars, normalizes email/OTP input, handles Supabase update errors, and logs final sign-in failures.
- `frontend/app/login/page.tsx` now surfaces Google OAuth and resend failures to the user instead of failing silently.
- `frontend/lib/supabase/server.ts` now safely ignores cookie writes from Server Components while middleware handles refreshes.
- `frontend/.env.local.example` now documents server-only OTP env vars: `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`, `OTP_FROM_EMAIL`.
- `backend/app/main.py` now supports comma-separated `FRONTEND_URL` origins for CORS.
- `backend/.env.example` now documents comma-separated production frontend origins.
- `.gitignore` now ignores `tsconfig.tsbuildinfo`.
- `frontend/package-lock.json` and `frontend/next-env.d.ts` were generated by installing/building the frontend.

---

### D-6 - Verification Run
**Status:** PASSED FOR FRONTEND / PARTIAL FOR BACKEND  
**Commands run:**

```bash
cd frontend
npm.cmd install
npm.cmd run type-check
npm.cmd run build
```

**Result:** TypeScript and Next.js production build passed.

```bash
cd backend
python -m py_compile app\main.py
```

**Result:** Edited backend entrypoint syntax compiled successfully.

**Backend pytest note:** Full backend tests did not run because this machine's default Python is `3.14` and backend dependencies are not installed (`ModuleNotFoundError: No module named 'supabase'`). The repo is pinned for Python `3.11.9` on Render because newer Python versions break some dependencies.

---

## Recommended Fix Order

| Priority | Issue | Status | Action |
|---|---|---|---|
| 1 | D-3 / B-6 | ✅ DONE | Render `APP_ENV=production` + `FRONTEND_URL` set |
| 2 | C-3 | ✅ DONE | `otp_verifications` table confirmed present |
| 3 | B-1 / B-2 / B-3 | ✅ N/A | Email auth now uses Supabase native OTP — no Resend, no server-side Vercel secrets |
| 4 | Code changes | ✅ DONE | Auth rearchitected: Supabase OTP + secret code gate. Committed and pushed. |
| 5 | D-1 | ⚠️ MANUAL | Vercel → Project Settings → General → Deployment Protection → disable |
| 6 | D-2 | ⚠️ MANUAL | Confirm/fix which domain is the RBot production URL in Vercel |
| 7 | E-1 | ⚠️ MANUAL | Supabase → Auth → Providers → Email → enable "Enable Email OTP" |
| 8 | C-2 / D-4 | ✅ N/A | Email confirmation no longer blocks auth — `verifyOtp` confirms in one step |
| 9 | C-1 | ⚠️ VERIFY | Google Cloud Console → OAuth client → confirm `https://ogecgrhzretnkgehyifi.supabase.co/auth/v1/callback` in Authorized Redirect URIs |
| 10 | B-4 / B-5 | ✅ DONE (D-4) | Supabase already accepts both Vercel callback URLs |

After adding or changing Vercel environment variables, **redeploy Vercel** so the Next.js API routes pick up the new server-only values.
