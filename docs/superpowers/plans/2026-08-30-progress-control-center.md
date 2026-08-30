# Progress Control Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an admin-only `/progress.html` control center with live project status, roadmap, issues, branches/builds, notifications, project-status chat, and credential readiness.

**Architecture:** Reuse the existing Supabase admin session in the browser and pass its access token to read-only Vercel Functions. A shared server helper validates the token against Supabase `admin_users`, aggregates GitHub/Vercel/Supabase telemetry with per-source graceful degradation, and exposes no secret values. Static UI files render the control center responsively and keep all privileged provider calls server-side.

**Tech Stack:** Static HTML/CSS/vanilla JS, Supabase JS v2, Vercel Node Functions, GitHub REST API, Vercel REST API, Supabase REST/Auth, optional OpenAI Responses API.

**Spec:** `docs/superpowers/specs/2026-08-30-progress-control-center-design.md`

## Global Constraints
- Implement only on `feature/progress-control-center` until preview QA passes.
- Read-only release: no commerce mutations, migrations, deployments, arbitrary SQL, or credential writes.
- Never expose secrets in HTML, client JS, responses, logs, query strings, or chat prompts.
- Reuse existing Supabase admin authorization; production merge is blocked if authorization cannot be enforced.
- Missing provider credentials must degrade to explicit unavailable/credential-required states.
- Mobile-first; no page-level horizontal overflow; status uses text plus visual state.

---

### Task 1: Shared server authorization and telemetry
**Files:** Create `api/_progress-lib.js`.
**Produces:** `authorizeAdmin(req)`, `getProgressStatus(req)`, deterministic status summaries, secret-safe credential metadata.
- [ ] Validate bearer token through Supabase Auth and `admin_users`.
- [ ] Add short-timeout JSON fetch helper.
- [ ] Aggregate GitHub branches/issues, Vercel deployments when configured, and Supabase counts using the authenticated admin token.
- [ ] Calculate roadmap and notifications without claiming fallback facts as measured.
- [ ] Verify response objects never include environment values.

### Task 2: Progress status endpoint
**Files:** Create `api/progress-status.js`.
**Consumes:** `authorizeAdmin`, `getProgressStatus`.
- [ ] GET only; return 405 otherwise.
- [ ] Return 401/403 for invalid or non-admin sessions.
- [ ] Return 200 for partial provider failures with per-source availability metadata.

### Task 3: Project chat endpoint
**Files:** Create `api/progress-chat.js`.
**Consumes:** current compact status from shared helper.
- [ ] POST only; validate message length.
- [ ] Answer common project-status intents deterministically.
- [ ] If `OPENAI_API_KEY` exists, use OpenAI Responses API for bounded project-status questions only.
- [ ] Do not include secrets or raw environment metadata in prompt or output.

### Task 4: Control-center UI
**Files:** Create `progress.html`, `progress.css`, `progress.js`.
- [ ] Reuse Supabase admin sign-in/session and active `admin_users` check.
- [ ] Render project health, visual roadmap, issues, branches/builds, notifications, credential readiness, and chat.
- [ ] Add accessible notification dialog and mobile branch cards.
- [ ] Show explicit degraded states instead of breaking the page.

### Task 5: Admin navigation integration
**Files:** Modify `admin.html` only after preview verification.
- [ ] Add a clear Progress link in the admin top bar.
- [ ] Keep existing Store and Sign out actions intact.

### Task 6: Verification and release gate
- [ ] Confirm feature branch deploy is READY in Vercel Preview.
- [ ] Verify unauthenticated requests are rejected.
- [ ] Verify admin session can load status.
- [ ] Verify source/network responses contain no secret values.
- [ ] Browser-test mobile and desktop `/progress.html`.
- [ ] Do not merge to `main` until all acceptance evidence passes.