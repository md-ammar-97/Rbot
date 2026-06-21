# RBot — Deployment Guide

## Architecture

```
Vercel (Next.js frontend)
    ↕ HTTPS
Render (FastAPI + Celery + Redis + n8n)
    ↕ Supabase SDK
Supabase (PostgreSQL + Auth + Storage)
    project: ogecgrhzretnkgehyifi
    region: ap-south-1 (Mumbai)
```

## Prerequisites checklist

- [x] Supabase project created — `https://ogecgrhzretnkgehyifi.supabase.co`
- [x] All 5 migrations applied
- [x] Storage buckets: `resume-uploads`, `linkedin-exports`, `artifacts`
- [x] Google OAuth enabled in Supabase Auth Providers
- [ ] GitHub repo created and code pushed
- [ ] Render account connected to GitHub repo
- [ ] Vercel account connected to GitHub repo

---

## Step 1 — Push to GitHub

```bash
# In the RBot project root
git init
git add .
git commit -m "Initial implementation — RBot AI PM Job Co-Pilot"
git remote add origin https://github.com/YOUR_USERNAME/rbot.git
git push -u origin main
```

> **IMPORTANT:** `.env` and `.env.local` are in `.gitignore` — they will NOT be pushed. Verify with `git status` before pushing.

---

## Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → New → **Blueprint**
2. Connect your GitHub repo
3. Render will detect `render.yaml` and show 4 services: `rbot-api`, `rbot-celery`, `rbot-n8n`, `rbot-redis`
4. Click **Apply** — Render creates all services automatically

### Set environment variables (Render dashboard → each service → Environment)

For **rbot-api** and **rbot-celery**, add these (same values as your `.env`):

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://ogecgrhzretnkgehyifi.supabase.co` |
| `SUPABASE_SERVICE_KEY` | *(your service role key)* |
| `SUPABASE_ANON_KEY` | *(your anon key)* |
| `GROQ_API_KEY` | *(your Groq key)* |
| `APP_SECRET_KEY` | *(copy from your local `backend/.env`)* |
| `INTERNAL_API_KEY` | *(copy from your local `backend/.env`)* |
| `FRONTEND_URL` | *(your Vercel URL — add after Step 3)* |

For **rbot-n8n**, add:

| Key | Value |
|-----|-------|
| `N8N_BASIC_AUTH_USER` | pick any username e.g. `admin` |
| `N8N_BASIC_AUTH_PASSWORD` | pick a strong password |
| `N8N_ENCRYPTION_KEY` | any random 32-char string |
| `WEBHOOK_URL` | `https://rbot-n8n.onrender.com` |
| `RBOT_API_URL` | `https://rbot-api.onrender.com` |
| `INTERNAL_API_KEY` | *(copy from your local `backend/.env`)* |

5. Wait for all services to go **Live** (5–10 mins first deploy)
6. Test: `curl https://rbot-api.onrender.com/health` → should return `{"status":"ok"}`

---

## Step 3 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Framework: **Next.js** (auto-detected)
4. Add environment variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ogecgrhzretnkgehyifi.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(your anon key)* |
| `NEXT_PUBLIC_API_URL` | `https://rbot-api.onrender.com` |

5. Click **Deploy**
6. Copy the Vercel URL (e.g. `https://rbot.vercel.app`)
7. Go back to Render → rbot-api → Environment → update `FRONTEND_URL` to your Vercel URL

---

## Step 4 — Configure n8n

1. Open `https://rbot-n8n.onrender.com` — log in with the username/password you set
2. Click **+** → New Workflow → menu (⋮) → **Import from JSON**
3. Paste contents of `n8n/workflows/job_discovery.json`
4. Save and **Activate** the workflow
5. It will call `POST https://rbot-api.onrender.com/internal/discovery/run` every 4 hours

---

## Step 5 — Add Supabase redirect URL for production

1. Go to: https://supabase.com/dashboard/project/ogecgrhzretnkgehyifi/auth/url-configuration
2. Add your Vercel URL to **Redirect URLs**:
   ```
   https://rbot.vercel.app/auth/callback
   ```
3. Go to Google Cloud Console → your OAuth credentials → add to Authorized redirect URIs:
   ```
   https://ogecgrhzretnkgehyifi.supabase.co/auth/v1/callback
   ```
   *(This should already be there from initial setup — just verify)*

---

## Step 6 — Smoke test

1. Open `https://rbot.vercel.app`
2. Click **Get Started** → Google Sign-In → should create your profile row in Supabase
3. Upload a resume → check Supabase dashboard → `raw_evidence` table should have a row
4. Check Celery worker logs in Render → should show task being picked up

---

## Local development

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Celery worker
cd backend
celery -A app.workers.celery_app worker --loglevel=info

# Terminal 3 — Redis (requires Docker)
docker run -p 6379:6379 redis:alpine

# Terminal 4 — Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

---

## Key URLs (production)

| Service | URL |
|---------|-----|
| Frontend | https://rbot.vercel.app *(after deploy)* |
| Backend API | https://rbot-api.onrender.com |
| API Health | https://rbot-api.onrender.com/health |
| n8n | https://rbot-n8n.onrender.com |
| Supabase Dashboard | https://supabase.com/dashboard/project/ogecgrhzretnkgehyifi |

---

## Supabase project details

| Field | Value |
|-------|-------|
| Project ref | `ogecgrhzretnkgehyifi` |
| Region | `ap-south-1` (Mumbai) |
| URL | `https://ogecgrhzretnkgehyifi.supabase.co` |
| DB host | `db.ogecgrhzretnkgehyifi.supabase.co` |
