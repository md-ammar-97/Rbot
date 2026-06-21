# RBot — Deployment Guide

**Last updated:** 2026-06-21  
**Status:** Code pushed to GitHub. Render deploy in progress.

---

## What's already done

| Item | Status | Details |
|---|---|---|
| Supabase project | Done | `ogecgrhzretnkgehyifi` · ap-south-1 (Mumbai) |
| All 5 DB migrations | Done | 17 tables, enums, RLS, seed data, profile trigger |
| Storage buckets | Done | `resume-uploads` (10MB), `linkedin-exports` (50MB), `artifacts` (10MB) |
| Google OAuth | Done | Enabled in Supabase Auth Providers |
| backend `.env` | Done locally | Never committed — keys are safe |
| frontend `.env.local` | Done locally | Never committed — keys are safe |
| Code pushed to GitHub | Done | `https://github.com/md-ammar-97/Rbot` · branch: `master` |

---

## Architecture

```
Vercel (Next.js 14 frontend)
    ↕ HTTPS/REST
Render — rbot-api  (FastAPI, Python 3.11)
Render — rbot-celery  (Celery worker)
Render — rbot-redis  (Key Value / Redis)
    ↕ Supabase SDK + service role key
Supabase (PostgreSQL 15 + Auth + Storage)
    ↕ HTTP POST /internal/discovery/run every 4h
n8n Cloud (job discovery workflow)
```

---

## Step 1 — Deploy Redis on Render

Redis must exist first so its connection string can be added to the API service.

1. Render dashboard → top-right **New +** → **Key Value**
2. Fill in:
   - **Name:** `rbot-redis`
   - **Region:** Oregon (US West)
   - **Plan:** Free
3. Click **Create Key Value**
4. Wait ~1 minute → click into `rbot-redis` → copy the **Internal Redis URL**  
   (format: `redis://red-xxxx:6379`)

---

## Step 2 — Deploy Backend API on Render

> **Known issue with Render's Python default:** Render defaults to Python 3.14 which breaks `pydantic-core` and `PyMuPDF`. The repo includes `backend/.python-version` with `3.11.9` to fix this. If a build still fails on 3.14, add env var `PYTHON_VERSION=3.11.9` manually in the service settings.

1. Render dashboard → **New +** → **Web Service**
2. Connect repo: `md-ammar-97/Rbot`
3. Fill in:

| Field | Value |
|---|---|
| **Name** | `rbot-api` |
| **Language** | Python |
| **Branch** | `master` |
| **Region** | Oregon (US West) |
| **Root Directory** | `backend` |
| **Build Command** | `pip install -r requirements.txt && playwright install chromium` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Health Check Path** | `/health` |
| **Instance Type** | Free |

4. Add these environment variables:

| Key | Value | Source |
|---|---|---|
| `PYTHON_VERSION` | `3.11.9` | Fixed value — prevents Render from using Python 3.14 |
| `SUPABASE_URL` | `https://ogecgrhzretnkgehyifi.supabase.co` | Fixed value |
| `SUPABASE_SERVICE_KEY` | `eyJhbGci...` (service role JWT) | Copy from `backend/.env` |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` (anon JWT) | Copy from `backend/.env` |
| `GROQ_API_KEY` | `gsk_...` | Copy from `backend/.env` |
| `GROQ_PRIMARY_MODEL` | `llama-3.3-70b-versatile` | Fixed value |
| `GROQ_FAST_MODEL` | `llama-3.1-8b-instant` | Fixed value |
| `APP_ENV` | `production` | Fixed value |
| `APP_SECRET_KEY` | 64-char hex string | Copy from `backend/.env` |
| `INTERNAL_API_KEY` | random string | Copy from `backend/.env` |
| `PLAYWRIGHT_HEADLESS` | `true` | Fixed value |
| `FRONTEND_URL` | `http://placeholder.com` | Update after Vercel deploy (Step 4) |
| `REDIS_URL` | `redis://red-xxxx:6379` | Internal Redis URL from Step 1 |

5. Click **Deploy Web Service**
6. First build takes 5–10 minutes (installs Playwright + Chromium ~300MB)
7. Verify: once deployed, open `https://rbot-api.onrender.com/health` → should return `{"status":"ok"}`

---

## Step 3 — Deploy Celery Worker on Render

1. Render dashboard → **New +** → **Background Worker**
2. Connect repo: `md-ammar-97/Rbot`
3. Fill in:

| Field | Value |
|---|---|
| **Name** | `rbot-celery` |
| **Language** | Python |
| **Branch** | `master` |
| **Region** | Oregon (US West) |
| **Root Directory** | `backend` |
| **Build Command** | `pip install -r requirements.txt && playwright install chromium` |
| **Start Command** | `celery -A app.workers.celery_app worker --loglevel=info -Q ingestion,profile,recovery,discovery,scoring,drafting -c 4` |
| **Instance Type** | Free |

4. Add these environment variables (same as rbot-api except no `FRONTEND_URL`, `PLAYWRIGHT_HEADLESS`, `HEALTH_CHECK`):

| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.11.9` |
| `SUPABASE_URL` | `https://ogecgrhzretnkgehyifi.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Copy from `backend/.env` |
| `SUPABASE_ANON_KEY` | Copy from `backend/.env` |
| `GROQ_API_KEY` | Copy from `backend/.env` |
| `GROQ_PRIMARY_MODEL` | `llama-3.3-70b-versatile` |
| `GROQ_FAST_MODEL` | `llama-3.1-8b-instant` |
| `APP_ENV` | `production` |
| `APP_SECRET_KEY` | Copy from `backend/.env` |
| `INTERNAL_API_KEY` | Copy from `backend/.env` |
| `REDIS_URL` | Internal Redis URL from Step 1 |

5. Click **Save and Deploy**

---

## Step 4 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import `md-ammar-97/Rbot`
2. Fill in:

| Field | Value |
|---|---|
| **Framework Preset** | Next.js (auto-detected) |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `.next` (default) |

3. Add environment variables:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ogecgrhzretnkgehyifi.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon JWT — copy from `frontend/.env.local` |
| `NEXT_PUBLIC_API_URL` | `https://rbot-api.onrender.com` |

4. Click **Deploy** — takes ~2 minutes
5. Copy the deployed URL (e.g. `https://rbot.vercel.app`)

**After Vercel deploy — update two things:**

a. Render → `rbot-api` → Environment → update `FRONTEND_URL` to your Vercel URL → Save Changes → Manual Deploy

b. Supabase → Auth → URL Configuration:
   - Add to **Redirect URLs**: `https://rbot.vercel.app/auth/callback`

---

## Step 4.5 — Email OTP Setup (required for email login)

Email + password login sends a one-time code via [Resend](https://resend.com) before establishing a session.

### 1. Create a Resend account

1. Sign up at [resend.com](https://resend.com) — free tier gives 3,000 emails/month
2. Dashboard → **API Keys** → **Create API Key** → copy the key (`re_...`)
3. Dashboard → **Domains** → add and verify a sending domain (or use `onboarding@resend.dev` for sandbox testing)

### 2. Add Vercel environment variables

Go to Vercel → your project → **Settings** → **Environment Variables** and add:

| Key | Value |
|---|---|
| `RESEND_API_KEY` | Your Resend API key (`re_...`) |
| `OTP_FROM_EMAIL` | Verified sender address (e.g. `noreply@yourdomain.com`) |
| `SUPABASE_SERVICE_KEY` | Service role JWT — copy from `backend/.env` (same key used on Render) |

> `SUPABASE_SERVICE_KEY` is a **server-only** key (not prefixed with `NEXT_PUBLIC_`). It is never exposed to the browser. It is used only inside the `/api/auth/send-otp` and `/api/auth/verify-otp` API routes.

### 3. DB migration

The `otp_verifications` table was applied via Supabase MCP. If setting up a fresh project, run:

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

### 4. Redeploy Vercel

After adding the env vars, trigger a new Vercel deployment so the API routes pick them up.

---

## Step 5 — Set up n8n for Job Discovery

Use **n8n Cloud** (free tier — no card needed, no server required).

1. Sign up at [app.n8n.cloud](https://app.n8n.cloud) — free tier allows 5 active workflows
2. Create a new workflow → menu (⋮) → **Import from File**
3. Upload `n8n/workflows/job_discovery.json` from this repo
4. In the workflow, click the HTTP Request node → update:
   - **URL:** `https://rbot-api.onrender.com/internal/discovery/run`
   - **Header `X-Internal-Key`:** your `INTERNAL_API_KEY` value (from `backend/.env`)
5. Click **Activate** → the workflow fires every 4 hours automatically

> Note: n8n Cloud free tier workflows pause after 14 days of inactivity. Just re-activate if it stops running.

---

## Step 6 — Verify Google OAuth Redirect (Production)

1. Go to [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/ogecgrhzretnkgehyifi/auth/url-configuration)
2. **Site URL:** set to `https://rbot.vercel.app`
3. **Redirect URLs:** add `https://rbot.vercel.app/auth/callback`
4. Go to [Google Cloud Console](https://console.cloud.google.com) → your OAuth client → **Authorized redirect URIs** → verify `https://ogecgrhzretnkgehyifi.supabase.co/auth/v1/callback` is listed (should already be there from initial setup)

---

## Step 7 — Smoke Test

Run these checks in order:

```
1. GET  https://rbot-api.onrender.com/health
   → {"status":"ok"}

2. Open https://rbot.vercel.app
   → Homepage loads

3. Click Get Started → Google Sign-In
   → Should redirect to /onboarding (new user)
   → Supabase dashboard → Authentication → Users → your email should appear
   → Supabase dashboard → Table Editor → profiles → new row with your user_id

4. Upload a resume (.pdf or .docx, <10MB)
   → Supabase dashboard → Storage → resume-uploads → file should appear
   → Supabase dashboard → Table Editor → raw_evidence → new row
   → Render → rbot-celery → Logs → should show Celery task picked up

5. POST https://rbot-api.onrender.com/internal/discovery/run
   Header: X-Internal-Key: <your INTERNAL_API_KEY>
   → {"status":"queued"} or similar
   → Verify jobs appearing in raw_jobs table after a few minutes
```

---

## Environment Variable Reference

### `backend/.env` (never committed)

```env
SUPABASE_URL=https://ogecgrhzretnkgehyifi.supabase.co
SUPABASE_SERVICE_KEY=<service role JWT>
SUPABASE_ANON_KEY=<anon JWT>
GROQ_API_KEY=<gsk_...>
GROQ_PRIMARY_MODEL=llama-3.3-70b-versatile
GROQ_FAST_MODEL=llama-3.1-8b-instant
APP_ENV=development
APP_SECRET_KEY=<64-char hex>
INTERNAL_API_KEY=<random string>
REDIS_URL=redis://localhost:6379
PLAYWRIGHT_HEADLESS=true
```

### `frontend/.env.local` (never committed)

```env
NEXT_PUBLIC_SUPABASE_URL=https://ogecgrhzretnkgehyifi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon JWT>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Service URLs (production)

| Service | URL |
|---|---|
| Frontend | `https://rbot.vercel.app` *(after deploy)* |
| Backend API | `https://rbot-api.onrender.com` |
| API Health | `https://rbot-api.onrender.com/health` |
| Supabase Dashboard | `https://supabase.com/dashboard/project/ogecgrhzretnkgehyifi` |
| n8n Cloud | `https://app.n8n.cloud` |

---

## Local Development

```bash
# Terminal 1 — Redis
docker run -d -p 6379:6379 redis:alpine

# Terminal 2 — Backend
cd backend
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload --port 8000

# Terminal 3 — Celery Worker
cd backend
celery -A app.workers.celery_app worker --loglevel=info

# Terminal 4 — Frontend
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Build fails: `pydantic-core` Rust error | Render using Python 3.14 | Add `PYTHON_VERSION=3.11.9` env var, redeploy |
| Build fails: `PyMuPDF` stuck at metadata | Same Python 3.14 issue | Same fix |
| Health check fails after deploy | App still starting up (cold start) | Wait 60s, retry |
| Google OAuth redirect fails | Redirect URL not in Supabase allowlist | Add `https://your-vercel-url/auth/callback` to Supabase Auth URL Configuration |
| Google OAuth: `auth_failed` on callback | Middleware clears PKCE cookies | Ensure `auth/callback` is excluded from middleware matcher (already fixed in code) |
| OTP email not received | `RESEND_API_KEY` or `OTP_FROM_EMAIL` missing | Add both env vars to Vercel and redeploy |
| OTP email not received | Sender domain not verified in Resend | Verify domain in Resend dashboard or use `onboarding@resend.dev` for testing |
| `send-otp` returns 500 | `SUPABASE_SERVICE_KEY` missing from Vercel | Add the service role JWT as a Vercel env var (server-only, no `NEXT_PUBLIC_` prefix) |
| Celery tasks not running | `REDIS_URL` wrong or Redis not created | Verify internal Redis URL in rbot-celery env vars |
| Job discovery not running | n8n workflow inactive | Go to n8n Cloud → reactivate workflow |
| Free tier API spins down | Render free tier spins down after 15min inactivity | Expected behaviour — first request after idle takes ~30s cold start |
