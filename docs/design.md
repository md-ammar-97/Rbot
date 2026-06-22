# PMFit — Design System & UI Specification

**Version:** 2.0  
**Date:** 2026-06-21  
**Design Language:** PMFit Design System  
**Stack:** Next.js 14 + Tailwind CSS + Framer Motion + Recharts  

> **Note:** v1.0 used Apple HIG tokens (`apple.*`). The active design system is the PMFit token set defined in `frontend/tailwind.config.js`. The color palette, typography, and component classes below reflect the **current** implementation.

---

## PMFit Design Tokens (active)

| Token | Hex | Tailwind class | Usage |
|---|---|---|---|
| `pmfit-blue` | `#0052CC` | `bg-pmfit-blue` | Primary CTA, active nav, accent |
| `pmfit-blue-light` | `#1D7EFF` | `bg-pmfit-blue-light` | Secondary highlights |
| `pmfit-blue-subtle` | `#EBF2FF` | `bg-pmfit-blue-subtle` | Accent backgrounds |
| `pmfit-purple` | `#6B5ACD` | `bg-pmfit-purple` | Insights, evidence accent |
| `pmfit-teal` | `#20C997` | `bg-pmfit-teal` | Success, recovery positive |
| `pmfit-orange` | `#FF8C00` | `bg-pmfit-orange` | Warnings, category tags |
| `pmfit-red` | `#E63946` | `bg-pmfit-red` | Errors, alerts |
| `pmfit-navy` | `#111827` | `bg-pmfit-navy` | Sidebar background |
| `pmfit-bg` | `#F5F7FF` | `bg-pmfit-bg` | Main content background |
| `pmfit-surface` | `#FFFFFF` | `bg-white` | Cards |
| `pmfit-border` | `#E5E7EB` | `border-pmfit-border` | Dividers, input borders |
| `pmfit-text` | `#1A1A1A` | `text-pmfit-text` | Headlines, body |
| `pmfit-text-secondary` | `#6B7280` | `text-pmfit-text-secondary` | Labels, metadata |
| `pmfit-text-muted` | `#9CA3AF` | `text-pmfit-text-muted` | Placeholders, disabled |

**Typography:** Inter (via `next/font/google`), variable `--font-inter`  
**Animations:** Framer Motion — `staggerChildren`, `useInView`, `AnimatePresence`, spring physics  
**Charts:** Recharts — `RadialBarChart` (FitGauge), `PieChart` (recovery donut), `BarChart` (score breakdown)

---

## 1. Design Philosophy (v1 — historical reference)

The original design followed the **Apple Human Interface Guidelines** adapted for web — the same principles that make Apple products feel effortless:

- **Clarity** — text is legible, icons are precise, content is unobstructed. Decoration exists to serve communication, not impress.
- **Deference** — the UI defers to content. Chrome, borders, and backgrounds recede so the user's data — jobs, resumes, scores — takes center stage.
- **Depth** — hierarchy is communicated through layering, translucency, and subtle shadow, not heavy borders or loud colors.

The product handles a high-stakes, stressful activity — job searching. The design must feel **calm, confident, and in control**, never busy or anxious.

---

## 2. Color System

### Base Palette

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| `background` | `#FFFFFF` | `white` | Page background |
| `surface` | `#F5F5F7` | `gray-50` (customized) | Cards, sidebars, panels |
| `surface-elevated` | `#FFFFFF` | `white` | Modals, popovers, floating cards |
| `border` | `#D2D2D7` | custom | Dividers, input borders |
| `border-subtle` | `#E8E8ED` | custom | Section separators |
| `text-primary` | `#1D1D1F` | custom | Headlines, body text |
| `text-secondary` | `#6E6E73` | custom | Labels, metadata, captions |
| `text-tertiary` | `#AEAEB2` | custom | Placeholders, disabled |
| `accent` | `#0071E3` | custom | Primary buttons, links, active states |
| `accent-hover` | `#0077ED` | custom | Button hover |
| `accent-subtle` | `#EBF3FD` | custom | Accent backgrounds, highlights |
| `success` | `#34C759` | custom | Fit scores high, completed states |
| `success-subtle` | `#EDFAF1` | custom | Success backgrounds |
| `warning` | `#FF9500` | custom | Mid-fit scores, restricted states |
| `warning-subtle` | `#FFF4E5` | custom | Warning backgrounds |
| `destructive` | `#FF3B30` | custom | Errors, blocked policy, low-fit |
| `destructive-subtle` | `#FFF0EF` | custom | Error backgrounds |

### Tailwind CSS config additions

```js
// tailwind.config.js — extend colors
colors: {
  apple: {
    bg: '#FFFFFF',
    surface: '#F5F5F7',
    border: '#D2D2D7',
    'border-subtle': '#E8E8ED',
    text: '#1D1D1F',
    'text-secondary': '#6E6E73',
    'text-tertiary': '#AEAEB2',
    accent: '#0071E3',
    'accent-hover': '#0077ED',
    'accent-subtle': '#EBF3FD',
    success: '#34C759',
    'success-subtle': '#EDFAF1',
    warning: '#FF9500',
    'warning-subtle': '#FFF4E5',
    destructive: '#FF3B30',
    'destructive-subtle': '#FFF0EF',
  }
}
```

### Dark Mode

Dark mode follows Apple's system dark palette. All tokens invert via CSS custom properties. Next.js + Tailwind `dark:` variants handle switching.

| Token (dark) | Hex |
|---|---|
| `background` | `#000000` |
| `surface` | `#1C1C1E` |
| `surface-elevated` | `#2C2C2E` |
| `border` | `#38383A` |
| `text-primary` | `#F5F5F7` |
| `text-secondary` | `#98989D` |
| `accent` | `#0A84FF` |

---

## 3. Typography

**Font family:** `system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif`

This resolves to SF Pro on Apple devices, Segoe UI on Windows, and the OS default on others — giving each user a native feel.

### Type Scale

| Style | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| `display-xl` | 56px / 3.5rem | 700 | 1.05 | Homepage hero headline |
| `display` | 40px / 2.5rem | 700 | 1.1 | Page hero headlines |
| `title-1` | 28px / 1.75rem | 600 | 1.2 | Section headers |
| `title-2` | 22px / 1.375rem | 600 | 1.25 | Card titles, modal headers |
| `title-3` | 18px / 1.125rem | 600 | 1.3 | Sub-section headers |
| `body` | 16px / 1rem | 400 | 1.5 | Body copy, descriptions |
| `body-medium` | 16px / 1rem | 500 | 1.5 | Emphasized body text |
| `callout` | 15px / 0.9375rem | 400 | 1.4 | Labels, secondary content |
| `footnote` | 13px / 0.8125rem | 400 | 1.4 | Captions, timestamps, metadata |
| `caption` | 11px / 0.6875rem | 500 | 1.3 | Badges, chips, score labels |

### Tailwind typography classes

```css
.text-display-xl { @apply text-[56px] font-bold leading-[1.05] tracking-tight; }
.text-display    { @apply text-[40px] font-bold leading-[1.1] tracking-tight; }
.text-title-1    { @apply text-[28px] font-semibold leading-[1.2] tracking-tight; }
.text-title-2    { @apply text-[22px] font-semibold leading-[1.25]; }
.text-title-3    { @apply text-[18px] font-semibold leading-[1.3]; }
.text-body       { @apply text-base font-normal leading-relaxed; }
.text-callout    { @apply text-[15px] font-normal leading-[1.4]; }
.text-footnote   { @apply text-[13px] font-normal leading-[1.4]; }
.text-caption    { @apply text-[11px] font-medium leading-[1.3] tracking-wide uppercase; }
```

---

## 4. Spacing & Layout

**Base unit:** 4px  
**Grid:** 12-column, max-width 1200px, horizontal padding 24px (mobile) / 40px (desktop)

| Scale | Value | Usage |
|---|---|---|
| `xs` | 4px | Icon gaps, tight label spacing |
| `sm` | 8px | Within-component spacing |
| `md` | 16px | Between related elements |
| `lg` | 24px | Section padding, card padding |
| `xl` | 40px | Between sections |
| `2xl` | 64px | Large section gaps |
| `3xl` | 96px | Homepage section spacing |

---

## 5. Component Specifications

### 5.1 Buttons

**Primary button** — used for the single most important action on a page.

```
┌─────────────────────────┐
│   Continue with Google  │   bg: #0071E3  text: white
└─────────────────────────┘   radius: 12px  height: 48px  padding: 0 24px
                              font: 17px / 500
                              hover: #0077ED
                              active: scale(0.98)  transition: 120ms ease
```

**Secondary button** — ghost variant.

```
┌─────────────────────────┐
│       View Details      │   border: 1px #D2D2D7  bg: transparent  text: #0071E3
└─────────────────────────┘   radius: 12px  height: 44px
```

**Destructive button** — used only for irrecoverable actions.

```
┌──────────────┐
│  Withdraw    │   bg: #FF3B30  text: white  radius: 12px
└──────────────┘
```

**Icon button** — square, used in toolbars and cards.

```
┌────┐
│ ⊕  │   size: 36×36px  bg: #F5F5F7  radius: 10px  icon: 18px
└────┘   hover: #E8E8ED
```

---

### 5.2 Cards

All cards use the same base shell:

```
bg: white
border: 1px solid #E8E8ED
border-radius: 16px
box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
padding: 24px
```

**Hover state** (clickable cards):
```
box-shadow: 0 4px 16px rgba(0,0,0,0.08)
transform: translateY(-1px)
transition: all 200ms ease
```

---

### 5.3 Fit Score Badge

The most important data element. Three states:

```
High Fit (≥85)        Mid Fit (70–84)       Low Fit (<70)
┌──────────┐          ┌──────────┐          ┌──────────┐
│  ● 92    │          │  ● 74    │          │  ● 58    │
└──────────┘          └──────────┘          └──────────┘
bg: #EDFAF1           bg: #FFF4E5           bg: #FFF0EF
text: #34C759         text: #FF9500         text: #FF3B30
dot color matches     font: 13px 600        radius: 8px
                      padding: 4px 10px
```

---

### 5.4 Evidence Confidence Tag

```
High                  Medium                Low
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ ✦ High Conf  │      │ ◈ Med Conf   │      │ ◇ Low Conf   │
└──────────────┘      └──────────────┘      └──────────────┘
bg: #EDFAF1           bg: #F5F5F7           bg: #FFF4E5
text: #34C759         text: #6E6E73         text: #FF9500
```

---

### 5.5 Input Fields

```
┌─────────────────────────────────────────┐
│  Job title, company, or keyword         │
└─────────────────────────────────────────┘
height: 48px
border: 1px solid #D2D2D7
border-radius: 12px
padding: 0 16px
font: 16px
background: white
focus: border-color #0071E3, box-shadow: 0 0 0 3px #EBF3FD
placeholder: #AEAEB2
```

---

### 5.6 Kanban Card (Tracker)

```
┌──────────────────────────────────────┐
│ Senior PM · Acme Corp              ○ │  ← status dot
│ San Francisco · Remote eligible      │
│                                      │
│ Fit Score  ┌────────┐ Evidence       │
│    92       │  ████░ │  High          │
│            └────────┘                │
│                                      │
│ Applied 3 days ago    [ View · Edit ]│
└──────────────────────────────────────┘
width: 300px  border-radius: 16px  padding: 20px
draggable (future phase)
```

---

### 5.7 Progress Stepper (Onboarding / Recovery)

```
● ──────────── ● ──────────── ○ ──────────── ○
1 Preferences  2 Upload      3 Recovery     4 Done

Completed: ● filled #0071E3
Active:     ● filled #0071E3 + pulse ring
Pending:    ○ hollow #D2D2D7
```

---

### 5.8 Quality Diagnosis Dimension Row

```
┌──────────────────────────────────────────────────────┐
│ Achievement Density                                  │
│ ████████░░░░░░░░░░░░  40%   ⚠ Below threshold (60%) │
│ 3 of your 5 roles have no metric-backed outcomes     │
└──────────────────────────────────────────────────────┘
```

Progress bar: height 6px, radius 3px  
Filled: `#FF9500` (warning) or `#34C759` (pass)  
Background track: `#E8E8ED`

---

## 6. Page Designs

### 6.1 Homepage (`/`)

Public, unauthenticated. Purpose: explain what RBot does and drive sign-up.

```
┌─────────────────────────────────────────────────────────────────┐
│ NAVBAR                                                          │
│  RBot                                         Sign in  ─────── │
│                                               [Get Started →]  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HERO                                         bg: white          │
│                                                                 │
│        Your PM job search,                                      │
│        finally intelligent.                                     │
│                                                                 │
│   RBot finds the right roles, rebuilds your resume             │
│   with real evidence, and helps you apply with                  │
│   confidence — not volume.                                      │
│                                                                 │
│         [ Get Started Free → ]    [ See how it works ]         │
│                                                                 │
│   ──────────────────────────────────────────────────────        │
│                                                                 │
│   ┌─────────────────────────────────────────────────────┐       │
│   │  PRODUCT SCREENSHOT / ANIMATION                     │       │
│   │  Jobs feed with Fit Score badges visible            │       │
│   └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PROBLEM STATEMENT STRIP                bg: #F5F5F7              │
│                                                                 │
│   Job searching is broken for PMs.                             │
│   You're spending hours on the wrong roles, submitting          │
│   generic resumes, and losing track across 10 spreadsheets.     │
│   RBot fixes all of that.                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ FEATURES (3-column grid)               bg: white                │
│                                                                 │
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────┐  │
│ │  🎯               │ │  📄               │ │  📊           │  │
│ │  Smart Discovery  │ │  Resume Recovery  │ │  Honest Fit   │  │
│ │                   │ │                   │ │  Scoring      │  │
│ │  Fresh PM roles   │ │  Diagnose gaps.   │ │               │  │
│ │  from Greenhouse  │ │  Pull evidence    │ │  Know exactly │  │
│ │  and Lever,       │ │  from GitHub.     │ │  why a role   │  │
│ │  scored for you   │ │  Build a resume   │ │  fits or      │  │
│ │  every morning.   │ │  that is true.    │ │  doesn't.     │  │
│ └───────────────────┘ └───────────────────┘ └───────────────┘  │
│                                                                 │
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────┐  │
│ │  ✉️               │ │  🗂️              │ │  🔒           │  │
│ │  Tailored         │ │  Full Tracker     │ │  No           │  │
│ │  Applications     │ │                   │ │  Fabrication  │  │
│ │                   │ │  One Kanban for   │ │               │  │
│ │  Resume +         │ │  every role,      │ │  Every edit   │  │
│ │  cover letter     │ │  from discovery   │ │  traced to    │  │
│ │  tailored to      │ │  through offer.   │ │  real         │  │
│ │  each role.       │ │  No spreadsheets. │ │  evidence.    │  │
│ └───────────────────┘ └───────────────────┘ └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HOW IT WORKS                           bg: #F5F5F7              │
│                                                                 │
│           Three steps to better applications.                   │
│                                                                 │
│   ① Build Your Baseline                                         │
│   Upload your resume and connect GitHub.                        │
│   RBot diagnoses gaps and builds a complete, evidence-          │
│   backed profile — your source of truth.                        │
│                                                                 │
│   ② Discover and Score                                          │
│   Fresh PM roles surface every day, each scored with a         │
│   transparent Fit Score. See why a role fits or doesn't.        │
│                                                                 │
│   ③ Apply with Confidence                                       │
│   Tailored resume and cover letter per role. Manual,            │
│   assisted, or auto-apply for eligible openings.               │
│   Every move tracked automatically.                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ CTA BANNER                             bg: #0071E3              │
│                                        text: white              │
│        Ready to search smarter?                                 │
│                                                                 │
│              [ Get Started Free → ]                             │
│         No credit card. No spam. Cancel anytime.               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ FOOTER                                 bg: #F5F5F7              │
│                                                                 │
│  RBot          Product   Privacy   Terms   Contact              │
│  © 2026                                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Key copy:**
- Headline: **"Your PM job search, finally intelligent."**
- Subheadline: "RBot finds the right roles, rebuilds your resume with real evidence, and helps you apply with confidence — not volume."
- CTA: **"Get Started Free →"**

**Animations:**
- Hero headline fades in on load (200ms delay, 400ms duration)
- Product screenshot animates in with a subtle upward slide
- Feature cards animate in staggered on scroll (100ms apart)
- No parallax, no hero videos — keep it calm and fast

---

### 6.2 Login Page (`/login`)

Clean, centered, single-focus. No distractions.

```
┌─────────────────────────────────────────────────────────────────┐
│                        bg: #F5F5F7                              │
│                                                                 │
│                                                                 │
│                     ┌──────────────────────┐                   │
│                     │  RBot                │ ← logo top left   │
│                     │                      │                   │
│                     │  Welcome back.       │                   │
│                     │  Sign in to continue │                   │
│                     │  your job search.    │                   │
│                     │                      │                   │
│                     │  ┌────────────────┐  │                   │
│                     │  │  G  Continue   │  │ ← Google button   │
│                     │  │     with Google│  │   white bg        │
│                     │  └────────────────┘  │   1px border      │
│                     │                      │                   │
│                     │  ─────── or ───────  │                   │
│                     │                      │                   │
│                     │  ┌────────────────┐  │                   │
│                     │  │  Email address │  │ ← magic link      │
│                     │  └────────────────┘  │   (phase 2)       │
│                     │  [ Send magic link ] │                   │
│                     │                      │                   │
│                     │  ────────────────    │                   │
│                     │  By signing in you   │                   │
│                     │  agree to our Terms  │                   │
│                     │  and Privacy Policy. │                   │
│                     └──────────────────────┘                   │
│                                                                 │
│              Each account's data is completely private.         │
│              We never share or sell your information.           │
└─────────────────────────────────────────────────────────────────┘
```

**Login card specs:**
```
width: 400px
bg: white
border-radius: 20px
box-shadow: 0 4px 24px rgba(0,0,0,0.08)
padding: 40px
```

**Google button specs:**
```
width: 100%
height: 52px
bg: white
border: 1px solid #D2D2D7
border-radius: 12px
font: 17px / 500, #1D1D1F
icon: Google logo SVG 20px, left of text
hover: bg #F5F5F7
active: scale(0.98)

Label: "Continue with Google"
```

**Behavior:**
- Clicking "Continue with Google" → Supabase OAuth flow → `supabase.auth.signInWithOAuth({ provider: 'google' })`
- On success → redirect to `/onboarding` (new user) or `/dashboard` (returning user)
- On error → show inline error message below the button (not a toast)
- No sign-up page — Google OAuth handles account creation automatically
- Session is stored in Supabase Auth; all data is isolated by `auth.uid()` (see §7)

**New user detection:**
```typescript
// After OAuth callback
const { data: profile } = await supabase
  .from('profiles')
  .select('onboarding_complete')
  .eq('id', user.id)
  .single()

if (!profile || !profile.onboarding_complete) {
  redirect('/onboarding')
} else {
  redirect('/dashboard')
}
```

---

### 6.3 Onboarding (`/onboarding`) — 4 steps

Multi-step, one screen per step. Progress stepper at top.

**Step 1 — Preferences**
```
┌────────────────────────────────────────────────────────┐
│  ● ──── ○ ──── ○ ──── ○                                │
│  Preferences                                           │
│                                                        │
│  Let's set up your search.                             │
│                                                        │
│  What roles are you targeting?                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  Product Manager ×  Senior PM ×  ____________ │    │
│  └────────────────────────────────────────────────┘    │
│                                                        │
│  Where are you looking?                                │
│  ┌────────────────────────────────────────────────┐    │
│  │  San Francisco ×  Remote ×  _________________  │    │
│  └────────────────────────────────────────────────┘    │
│                                                        │
│  Remote preference     Work authorization              │
│  ○ Remote only         [ US Citizen          ▾ ]       │
│  ● Flexible                                            │
│  ○ On-site             Requires sponsorship?           │
│                        ○ Yes  ● No                     │
│                                                        │
│                              [ Continue → ]            │
└────────────────────────────────────────────────────────┘
```

**Step 2 — Upload**
```
┌────────────────────────────────────────────────────────┐
│  ● ──── ● ──── ○ ──── ○                                │
│  Upload                                                │
│                                                        │
│  Give RBot your materials.                             │
│                                                        │
│  ┌───────────────────────────────────────────────┐     │
│  │  📄  Drop your resume here                   │     │
│  │      PDF, DOCX, or TXT · Max 10 MB           │     │
│  │                [ Browse files ]              │     │
│  └───────────────────────────────────────────────┘     │
│                                                        │
│  ┌───────────────────────────────────────────────┐     │
│  │  🐙  Connect GitHub (optional)               │     │
│  │      We read README and docs files to build  │     │
│  │      richer project evidence.                │     │
│  │                [ Connect GitHub ]            │     │
│  └───────────────────────────────────────────────┘     │
│                                                        │
│  ┌───────────────────────────────────────────────┐     │
│  │  🔗  LinkedIn export (optional)              │     │
│  │      Download from LinkedIn settings,        │     │
│  │      then upload the ZIP here.              │     │
│  │                [ Upload ZIP ]               │     │
│  └───────────────────────────────────────────────┘     │
│                                                        │
│  [ ← Back ]                        [ Analyse →  ]      │
└────────────────────────────────────────────────────────┘
```

**Step 3 — Recovery (if triggered)**  
See §6.5 for full Recovery screen design.

**Step 4 — Done**
```
┌────────────────────────────────────────────────────────┐
│  ● ──── ● ──── ● ──── ●                                │
│                                                        │
│              ✓                                         │
│   You're ready to search smarter.                      │
│                                                        │
│   Profile quality    ████████████ Strong              │
│   Jobs scored        24 fresh roles waiting            │
│   Top match          Senior PM · Stripe · 91 fit       │
│                                                        │
│                  [ Go to Dashboard → ]                 │
└────────────────────────────────────────────────────────┘
```

---

### 6.4 Dashboard (`/dashboard`)

Command center. Split into sidebar navigation + main content area.

```
┌──────────────────────────────────────────────────────────────────┐
│ NAVBAR            RBot              🔔  [ PF → ]                 │
└──────────────────────────────────────────────────────────────────┘
┌────────────┬─────────────────────────────────────────────────────┐
│ SIDEBAR    │  MAIN                                               │
│            │                                                     │
│  ⌂ Home    │  Good morning, Ammar.                               │
│  💼 Jobs   │  24 new roles match your profile.                   │
│  📋 Tracker│                                                     │
│  📄 Profile│  ┌─────────────────┐ ┌─────────────────────────┐   │
│  ✉️ Drafts │  │ Top Match Today │ │ Search Progress         │   │
│  ─────────  │  │                 │ │                         │   │
│  ⚙️ Settings│  │ Senior PM       │ │ Applied      7          │   │
│            │  │ Stripe          │ │ Interviews   2          │   │
│            │  │                 │ │ Offers       0          │   │
│            │  │  Fit  ┌──────┐  │ │                         │   │
│            │  │   91  │ ████ │  │ └─────────────────────────┘   │
│            │  │       └──────┘  │                               │
│            │  │  [ Tailor → ]   │  Recent Activity              │
│            │  └─────────────────┘  ─────────────────────────    │
│            │                       ✓ Applied – Notion PM         │
│            │  New Matches           ✓ Interview – Figma PM       │
│            │  ─────────────         ⚠ Stale – Intercom (30d)   │
│            │  [job card]                                         │
│            │  [job card]                                         │
│            │  [job card]                                         │
└────────────┴─────────────────────────────────────────────────────┘
```

**Sidebar specs:**
```
width: 220px
bg: #F5F5F7
border-right: 1px solid #E8E8ED
padding: 24px 16px

Nav item:
  height: 40px
  border-radius: 10px
  padding: 0 12px
  font: 15px / 500
  color: #6E6E73
  
Active nav item:
  bg: white
  color: #1D1D1F
  box-shadow: 0 1px 3px rgba(0,0,0,0.08)
```

---

### 6.5 Profile / Recovery (`/profile`)

**When recovery is in progress**, this page shows the recovery wizard front-and-center.

```
┌────────────────────────────────────────────────────────────────┐
│  Resume Quality Check                                          │
│  Before we can match you to jobs, let's make your             │
│  profile as strong as possible.                                │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Extractability      ██████████████████  100%  ✓ Pass    │  │
│  │ Completeness        ████████████░░░░░░   60%  ⚠ Fix     │  │
│  │ Clarity             ██████████████░░░░   80%  ✓ Pass    │  │
│  │ Achievement Density ████████░░░░░░░░░░   40%  ⚠ Fix     │  │
│  │ Role Relevance      ██████████████░░░░   70%  ✓ Pass    │  │
│  │ Timeline            ██████████████████   90%  ✓ Pass    │  │
│  │ Evidence Available  ██████████░░░░░░░░   50%  ✓ Pass    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  2 areas to improve                                            │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Question 1 of 3                                          │  │
│  │                                                          │  │
│  │ What metric improved in your Analytics Dashboard         │  │
│  │ project at Acme?                                         │  │
│  │                                                          │  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │  e.g. "Reduced query time by 60%, DAU grew 25%"      │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │                           [ Save & Continue → ]          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

**When recovery is complete**, profile shows the master baseline:
```
┌─────────────────────────────────────────────────────────────┐
│  Your Profile      Profile quality  ████████████  Strong    │
│                                                             │
│  ┌─────────────────────────────────┐                        │
│  │ Experience                      │                        │
│  │ Senior PM · Acme · 2021–2024    │                        │
│  │ PM · StartupX · 2019–2021       │                        │
│  └─────────────────────────────────┘                        │
│                                                             │
│  ┌─────────────────────────────────┐                        │
│  │ Top Skills                      │                        │
│  │ Roadmap · A/B Testing · SQL     │                        │
│  │ Stakeholder Mgmt · Figma        │                        │
│  └─────────────────────────────────┘                        │
│                                                             │
│  [ Download Baseline Resume ]  [ Edit Profile ]             │
└─────────────────────────────────────────────────────────────┘
```

---

### 6.6 Jobs (`/jobs`)

```
┌────────────────────────────────────────────────────────────────┐
│  Jobs                                        [ Filters ▾ ]     │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔍  Search roles, companies...                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  Filter chips:  [ Remote ×]  [ Senior ×]  [ B2B SaaS ×]       │
│                                                                │
│  24 matches · Sorted by Fit Score                              │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Senior PM                              Fit  92  ████   │   │
│  │  Stripe · San Francisco · Remote OK                     │   │
│  │  Posted 4 hours ago · Greenhouse                        │   │
│  │                                                         │   │
│  │  Matched: Roadmap, A/B Testing, Payments domain         │   │
│  │  Missing: Stripe SDK experience                         │   │
│  │                                                         │   │
│  │  Evidence  [ High ✦ ]    Apply  [ Auto-eligible ✓ ]     │   │
│  │                                                         │   │
│  │  [ Tailor & Apply → ]              [ Save ]  [ Skip ]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Product Manager                        Fit  74  ████   │   │
│  │  Notion · New York · Hybrid                             │   │
│  │  Posted 1 day ago · Lever                               │   │
│  │  ...                                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

### 6.7 Tracker (`/tracker`)

Kanban view. Each column is a stage.

```
┌──────────────┬──────────────┬──────────────┬──────────────────┐
│  Reviewing   │  Applied     │  Interview   │  Offer           │
│  (4)         │  (7)         │  (2)         │  (0)             │
├──────────────┼──────────────┼──────────────┼──────────────────┤
│              │              │              │                  │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │                  │
│ │ Sr PM    │ │ │ PM       │ │ │ Sr PM    │ │  No offers yet.  │
│ │ Stripe   │ │ │ Notion   │ │ │ Figma    │ │                  │
│ │          │ │ │          │ │ │          │ │  Keep going.     │
│ │ Fit 92   │ │ │ Fit 74   │ │ │ Fit 88   │ │                  │
│ │ 2hr ago  │ │ │ 3d ago   │ │ │ Interview│ │                  │
│ └──────────┘ │ └──────────┘ │ │ Thu 2pm  │ │                  │
│              │              │ └──────────┘ │                  │
│ ┌──────────┐ │ ┌──────────┐ │              │                  │
│ │ Lead PM  │ │ │ PM       │ │ ┌──────────┐ │                  │
│ │ Figma    │ │ │ Linear   │ │ │ Sr PM    │ │                  │
│ │          │ │ │          │ │ │ Intercom │ │                  │
│ │ Fit 85   │ │ │ Fit 81   │ │ │          │ │                  │
│ │ 5hr ago  │ │ │ 1d ago   │ │ │ Final Rd │ │                  │
│ └──────────┘ │ └──────────┘ │ │ Fri 3pm  │ │                  │
│              │              │ └──────────┘ │                  │
└──────────────┴──────────────┴──────────────┴──────────────────┘
```

Columns: Discovered · Reviewing · Tailoring · Applied · Outreach · Interview · Final Round · Offer  
Stale cards: show orange left border `border-l-4 border-orange-400`  
Auto-scroll on overflow per column. Column width: 280px. Gap: 16px.

---

## 7. Data Isolation & Account Privacy

Every user's data is **completely and automatically isolated** at the database level via Supabase Row Level Security (RLS). This is enforced in PostgreSQL, not in application code — meaning no bug in the API can leak cross-user data.

**How it works:**

```sql
-- Example: a user can only ever read their own jobs scores
CREATE POLICY "users_own_data" ON job_scores
  USING (user_id = auth.uid());
```

`auth.uid()` is the authenticated user's UUID from Supabase Auth — set by the JWT token on every request. It is impossible to construct a valid request that reads another user's data without possessing their JWT.

**Google OAuth flow:**
```
User clicks "Continue with Google"
        ↓
Supabase redirects to Google OAuth consent screen
        ↓
Google returns auth code to Supabase callback URL
        ↓
Supabase creates auth.users row (or matches existing email)
        ↓
Supabase returns session JWT to browser
        ↓
All subsequent API calls include JWT in Authorization header
        ↓
Supabase RLS validates auth.uid() on every query
        ↓
User only ever sees their own profiles, jobs_scores, tracker_items, artifacts, etc.
```

**Google data used:**
- `id` — mapped to `auth.users.id`  
- `email` — stored in `auth.users.email`  
- `name` — stored in `profiles.full_name`  
- `picture` — stored in `profiles.avatar_url`  
- Nothing else. Google work history, contacts, calendar, Drive — none accessed.

**Google OAuth scopes requested:** `openid email profile` — the minimum.

---

## 8. Navigation Structure

```
Public routes (no auth required):
  /                   Homepage
  /login              Login / sign-up

Authenticated routes (redirect to /login if no session):
  /dashboard          Main overview
  /onboarding         New user setup (4 steps)
  /profile            Profile + Recovery
  /jobs               Job list with scores
  /jobs/[id]          Job detail + fit breakdown
  /apply/[id]         Tailoring + apply flow
  /tracker            Kanban tracker
  /artifacts          Generated documents library
  /settings           Account settings
  /settings/account   Danger zone (delete account)
```

**Auth guard (Next.js middleware):**
```typescript
// middleware.ts
export const config = { matcher: ['/dashboard/:path*', '/jobs/:path*', ...] }

export async function middleware(req: NextRequest) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.redirect(new URL('/login', req.url))
}
```

---

## 9. Interaction & Animation Principles

**Rules:**
- All transitions: `duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]` — Apple's default easing
- No bounce or spring animations — they feel playful; this product needs to feel composed
- No parallax on scroll — focus stays on content
- Loading states: skeleton screens (not spinners) — preserve layout
- Toasts: top-right, 4-second auto-dismiss, max 1 visible at a time
- Errors: inline, below the triggering element — never modal-only
- Hover: `transition-all duration-150` — snappy, not laggy
- Page transitions: fade in 200ms — never slide (too much motion)

**Skeleton screens** (for job list, tracker, profile):
```
bg: linear-gradient(90deg, #F5F5F7 25%, #E8E8ED 50%, #F5F5F7 75%)
background-size: 400% 100%
animation: shimmer 1.4s ease infinite
border-radius: matches the element it's replacing
```

---

## 10. Accessibility

- **Contrast:** all text-on-background combinations pass WCAG AA (4.5:1 minimum)
  - `#1D1D1F` on `#FFFFFF`: 19.6:1 ✓
  - `#6E6E73` on `#FFFFFF`: 4.6:1 ✓
  - `white` on `#0071E3`: 4.7:1 ✓
- **Focus states:** all interactive elements have a visible `ring-2 ring-apple-accent ring-offset-2` focus ring
- **Keyboard navigation:** full keyboard support for Kanban columns (arrow keys), job list (j/k), apply flow (Enter/Esc)
- **Screen readers:** all images have `alt` text; icon buttons have `aria-label`; form fields have associated `<label>`
- **Reduced motion:** all animations wrapped in `@media (prefers-reduced-motion: reduce)` — set `transition: none`
- **Font size:** base 16px; no text smaller than 13px in interactive areas

---

## 11. Responsive Breakpoints

| Breakpoint | Width | Layout changes |
|---|---|---|
| `sm` | 640px | Single column; sidebar collapses to bottom tab bar |
| `md` | 768px | Sidebar appears; 2-column grids |
| `lg` | 1024px | Full layout; 3-column feature grids |
| `xl` | 1280px | Max content width 1200px, centered |

Mobile (< 640px):
- Homepage: single column, stacked features
- Tracker: horizontal scroll (not vertical stacked columns)
- Sidebar: replaced by a bottom tab bar with 5 main sections
- Cards: full width

---

## 12. File Structure (Frontend)

```
frontend/
├── app/
│   ├── (public)/
│   │   ├── page.tsx              Homepage
│   │   └── login/page.tsx        Login
│   ├── (auth)/                   Auth-gated routes
│   │   ├── layout.tsx            Auth guard wrapper
│   │   ├── dashboard/page.tsx
│   │   ├── onboarding/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── jobs/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── apply/[id]/page.tsx
│   │   ├── tracker/page.tsx
│   │   ├── artifacts/page.tsx
│   │   └── settings/page.tsx
│   └── auth/callback/route.ts    Supabase OAuth callback handler
│
├── components/
│   ├── ui/                       shadcn/ui base components
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── FeaturesGrid.tsx
│   │   ├── HowItWorks.tsx
│   │   └── CTABanner.tsx
│   ├── auth/
│   │   ├── LoginCard.tsx
│   │   └── GoogleButton.tsx
│   ├── jobs/
│   │   ├── JobCard.tsx
│   │   ├── FitScoreBadge.tsx
│   │   ├── EvidenceTag.tsx
│   │   └── JobFilters.tsx
│   ├── recovery/
│   │   ├── DiagnosisPanel.tsx
│   │   ├── DimensionBar.tsx
│   │   └── ClarifyingQuestion.tsx
│   ├── tracker/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   └── KanbanCard.tsx
│   └── shared/
│       ├── SkeletonCard.tsx
│       └── ProgressStepper.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             Browser Supabase client
│   │   └── server.ts             Server Supabase client (RSC)
│   └── utils.ts
│
└── tailwind.config.js            Apple color tokens + type scale
```
