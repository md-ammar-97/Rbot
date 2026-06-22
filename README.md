# PMFit — AI Job Co-Pilot for Product Managers

> Your PM job search, finally intelligent.

PMFit helps Product Managers discover the right roles, strengthen their resume evidence, assess fit honestly, and generate tailored applications — all grounded in what they actually built. **Quality over volume.**

---

## What it does

| Feature | Description |
|---|---|
| **Resume Quality Recovery** | Diagnoses 7 quality dimensions, asks targeted clarifying questions, builds a master baseline resume |
| **Intelligent Job Discovery** | Fresh PM roles from Greenhouse + Lever every 4 hours, automatically normalised and deduplicated |
| **3-Output Fit Scoring** | Fit Score (0–100) + Evidence Confidence (Low/Medium/High) + Automation Eligibility — never an "ATS score" |
| **Evidence-Gated Drafting** | Tailored resumes and cover letters grounded only in your real experience; nothing invented |
| **Application Tracker** | Kanban board tracking every application through the full pipeline |
| **Policy Engine** | Every automated action is evaluated and logged before execution |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router, Tailwind CSS, Framer Motion, Recharts |
| Design System | PMFit design system — Inter font, `#0052CC` primary blue, dark navy sidebar |
| Backend | FastAPI, Python 3.11 |
| Database | Supabase (PostgreSQL 15 + Row Level Security) |
| Auth | Supabase Auth — Google OAuth + Email OTP |
| Storage | Supabase Storage (resumes, exports, artifacts) |
| LLM | Groq — `llama-3.3-70b-versatile` (primary), `llama-3.1-8b-instant` (fast) |
| Background Jobs | In-process threading (free-tier compatible) |
| Job Automation | Playwright (assisted apply) |
| Scheduling | n8n (self-hosted on Render) — triggers discovery every 4 hours |
| Deploy | Render (backend + n8n + Redis), Vercel (frontend) |

---

## Project structure

```
PMFit/
├── backend/
│   ├── app/
│   │   ├── api/          # 8 FastAPI routers
│   │   ├── core/         # config, supabase client, security/JWT
│   │   ├── integrations/ # Groq, Greenhouse, Lever, GitHub
│   │   ├── models/       # Pydantic schemas
│   │   ├── services/     # business logic (10 services)
│   │   └── workers/      # background task runner
│   ├── migrations/       # 5 SQL migrations (run in order)
│   ├── tests/            # pytest test suite (8 test files)
│   ├── .env.example      # env var template
│   └── requirements.txt
├── frontend/
│   ├── app/              # Next.js App Router pages
│   │   ├── page.tsx              # Landing page (Framer Motion animated)
│   │   ├── login/page.tsx        # Auth — Google OAuth + Email OTP (animated 8-box input)
│   │   ├── gate/page.tsx         # Private beta access code gate
│   │   ├── dashboard/page.tsx    # Overview — profile completeness, active apps
│   │   ├── jobs/page.tsx         # Job discovery — FitGauge + JobCard grid
│   │   ├── tracker/page.tsx      # Kanban board — drag-to-update status
│   │   └── profile/page.tsx      # Recovery dashboard — DiagnosisChart + evidence gaps
│   ├── components/
│   │   ├── auth/         # OTPInput (8-box animated)
│   │   ├── home/         # HeroSection, FeaturesGrid, StatsBar, DarkFeatureSection, CTABanner
│   │   ├── jobs/         # FitGauge (recharts RadialBar), JobCard (expandable breakdown)
│   │   ├── layout/       # Sidebar (dark navy), AppShell
│   │   ├── recovery/     # DiagnosisChart (PieChart donut), DimensionBars, EvidenceGapCard
│   │   ├── tracker/      # KanbanBoard, KanbanCard
│   │   └── ui/           # GlowCard, AnimatedCounter, CircularProgress, Skeleton, Logo
│   ├── public/           # logo-icon.png, logo-top.png, logo-black.png
│   └── lib/supabase/     # Supabase client helpers
├── n8n/
│   ├── workflows/        # job_discovery.json — import into n8n
│   └── Dockerfile        # self-host n8n on Render
├── docs/                 # PRD, architecture, data model, design, edge cases, evals
├── render.yaml           # Render Blueprint — deploys all services at once
└── .gitignore
```

---

## Local development

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Supabase project (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))
- A Groq API key ([console.groq.com](https://console.groq.com))

### Backend

```bash
cd backend
pip install -r requirements.txt
playwright install chromium

cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, GROQ_API_KEY

# Run migrations in Supabase SQL Editor (backend/migrations/ — 001 through 005 in order)

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL
# Also: RESEND_API_KEY, OTP_FROM_EMAIL (for email OTP), SUPABASE_SERVICE_KEY

npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Running tests

```bash
cd backend
pytest tests/ -v
```

---

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full step-by-step guide covering:

1. Supabase setup (project, migrations, Auth, Storage)
2. Render Blueprint deploy (API + n8n + Redis — one click)
3. Vercel deploy (frontend)
4. n8n workflow import and activation

---

## Key design decisions

- **Resume Quality Recovery is a mandatory gate** — no job matching or application work starts until the user's profile passes quality diagnosis across 7 dimensions. Users may skip onboarding steps and return to complete them later — they are never stuck.
- **Three-output fit model** — Fit Score + Evidence Confidence + Automation Eligibility. Never called an "ATS score"
- **Evidence-gated drafting** — all LLM output is checked for groundedness (≥0.95 to pass). Claims not traceable to the user's evidence are blocked
- **Policy Engine** — single authority that evaluates and logs every automated action before it executes. LinkedIn scraping, autonomous messaging, and CAPTCHA solving are hard-blocked
- **Data isolation** — enforced at the PostgreSQL level via Row Level Security (`user_id = auth.uid()`), not application code
- **Auto-apply scope** — Greenhouse and Lever APIs only; Playwright is assisted-apply (user reviews each step)
- **PMFit Design System** — Inter font, primary blue `#0052CC`, dark navy sidebar `#111827`, animated with Framer Motion throughout

---

## License

Private — not for redistribution.
