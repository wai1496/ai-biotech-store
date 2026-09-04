# Research Staging Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate the AI BioTech Research approval workflow from production by using the dedicated staging Supabase project for preview/staging, preserving production unchanged, and making weak-evidence outcomes terminate cleanly instead of hanging.

**Architecture:** Keep production routing unchanged when `VERCEL_ENV=production`. On preview/review/staging hosts, force browser Supabase clients and the Research server API to the dedicated staging project `rpnwssqvurpdennpzplx`. Apply the existing Research approval schema and RLS to staging only, then verify isolation, security, deployment, and Research fetch behavior.

**Tech Stack:** Static HTML/CSS/JavaScript, Supabase Auth/Postgres/RLS/RPC, Vercel Node serverless functions, GitHub Actions/Node contract tests.

**Spec:** `docs/superpowers/specs/2026-09-01-research-approval-workflow-design.md`

## Global Constraints

- Do not modify, delete, reset, migrate, or otherwise change production Supabase data or production security settings.
- Preview/staging Research writes must target only `rpnwssqvurpdennpzplx`.
- Production remains on `yjauxyvtrmdriwtmckkl`.
- Research drafts never publish automatically.
- Public Research pages never call an AI provider.
- Weak or insufficient evidence is a valid result and must not produce an indefinite `Fetching…` state.
- No unrelated storefront, payment, inventory, order, protocol, customer, domain, secret, billing, or destructive Git changes.

---

### Task 1: Staging Research schema and policy compatibility

**Files:**
- Existing: `sql/20260901_research_approval_workflow.sql`
- Existing: `sql/20260901_research_approval_privacy_hardening.sql`

**Interfaces:**
- Consumes: staging `admin_users`, `admin_role`, `private.is_staging_admin(required_roles)`.
- Produces: `public.is_admin(required_roles)`, `research_entry_versions`, admin RLS policy, publish/reject RPCs.

- [x] **Step 1: Verify staging prerequisites read-only**

Run read-only SQL to confirm `admin_role`, `admin_users`, and the staging admin helper exist.

- [x] **Step 2: Add a staging compatibility wrapper**

Create `public.is_admin(required_roles public.admin_role[])` delegating to `private.is_staging_admin(required_roles)`, grant authenticated execution, and revoke anonymous execution.

- [x] **Step 3: Apply the existing Research approval migration to staging only**

Apply `sql/20260901_research_approval_workflow.sql` to project `rpnwssqvurpdennpzplx`.

- [x] **Step 4: Apply Research privacy hardening to staging only**

Apply `sql/20260901_research_approval_privacy_hardening.sql` to project `rpnwssqvurpdennpzplx`.

- [x] **Step 5: Verify schema and RLS read-only**

Confirm `research_entry_versions` exists, the six public projection columns exist, and the versions table has only the authenticated-admin policy.

---

### Task 2: Add regression contracts for staging isolation

**Files:**
- Modify: `qa/admin-research-ui.test.js`
- Modify: `qa/admin-research-refresh.test.js`
- Create: `research-staging-target.js`

**Interfaces:**
- Produces: a browser-only preview/staging Supabase target shim and server-side preview target selection.

- [ ] **Step 1: RED — require browser preview isolation**

Update `qa/admin-research-ui.test.js` so it requires `research-staging-target.js`, explicit preview/review/staging host detection, the staging project ref, and loading the shim before `admin.js`.

- [ ] **Step 2: RED — require server preview isolation**

Update `qa/admin-research-refresh.test.js` so it requires `VERCEL_ENV`/`VERCEL_GIT_COMMIT_REF` logic and the staging project ref in `_research-auth.js`.

- [ ] **Step 3: GREEN — implement browser staging target shim**

Create `research-staging-target.js` that wraps `supabase.createClient` only on Vercel preview/review/staging hosts and substitutes the staging URL + publishable key. On production hostnames it must leave `createClient` unchanged.

- [ ] **Step 4: GREEN — implement server preview target selection**

Modify `_research-auth.js` so preview/non-production uses staging URL/key, while production continues using production env/defaults.

- [ ] **Step 5: Verify contracts**

Run the Research contract tests and syntax checks via GitHub Actions/site smoke.

---

### Task 3: Load staging target before Research clients

**Files:**
- Modify: `admin.html`
- Modify: `index.html`
- Modify: `research-insight.html`

**Interfaces:**
- Consumes: `research-staging-target.js`.
- Produces: staging-bound admin Research login/session and public preview Research reads.

- [ ] **Step 1: Load after Supabase CDN and before app clients in Admin**

Insert `/research-staging-target.js` immediately after the Supabase CDN script and before `/admin.js`.

- [ ] **Step 2: Load before storefront Supabase clients**

Insert the same shim after the Supabase CDN and before `/app.js` in `index.html`.

- [ ] **Step 3: Load before Research Insight client**

Insert the shim after the Supabase CDN and before `/research-insight.js`.

- [ ] **Step 4: Verify preview static routes and scripts return 200**

Check `/`, `/admin.html`, `/research-insight.html`, and `/research-staging-target.js` on the preview deployment.

---

### Task 4: Prevent indefinite Fetching state and preserve evidence standards

**Files:**
- Modify: `admin-research.js`
- Modify: `qa/admin-research-ui.test.js`

**Interfaces:**
- Consumes: `/api/admin-research-refresh` response and evidence gate.
- Produces: deterministic completion/error UI; no automatic lowering of source standards.

- [ ] **Step 1: RED — require timeout/finally and insufficient-evidence copy**

Extend the UI contract to require a bounded request timeout/abort path, a `finally` reset to `Fetch New Research`, and explicit `Insufficient high-authority evidence` handling.

- [ ] **Step 2: GREEN — add bounded fetch and clean weak-evidence outcome**

Keep the API evidence gate unchanged. If a completed response has insufficient evidence, create a private draft only when appropriate and clearly label it for manual review; never leave the button disabled or stuck.

- [ ] **Step 3: Verify no evidence-standard regression**

Confirm high-tier source requirements remain unchanged and no weak-source auto-publish path exists.

---

### Task 5: Deployment, security review, and staging-only verification

**Files:**
- No new production files.

**Interfaces:**
- Produces: READY preview, staging-only database activity, security evidence, and Research workflow smoke results.

- [ ] **Step 1: Verify Vercel preview READY**

Confirm the newest `feature/research-approval-workflow` deployment is READY and has no build errors.

- [ ] **Step 2: Verify staging receives Research writes while production does not change**

Use read-only counts/version inspection in both Supabase projects before/after a controlled preview fetch. Do not mutate production.

- [ ] **Step 3: Verify staging RLS/security advisors**

Run Supabase security advisors on staging and resolve only Research-related findings within the approved staging scope.

- [ ] **Step 4: Verify Admin Research flow**

Test Fetch → Review for at least one product in staging. If evidence is insufficient, confirm the UI clearly reports that state and returns the button to normal.

- [ ] **Step 5: Keep PR #32 draft**

Do not merge or promote to production until all P0/P1 staging gates pass and the owner gives final release approval.
