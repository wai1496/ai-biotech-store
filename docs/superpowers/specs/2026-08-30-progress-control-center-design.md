# AI BioTech Progress Control Center Design

## Goal
Build an admin-only `/progress.html` control center that gives the owner one live view of project health, roadmap, branches/builds, pending/resolved issues, notifications, project chat, and credential readiness without exposing secret values in the browser.

## Scope
This feature is observability/control-plane UI only for the first release. It must not mutate production commerce data, run database migrations, deploy production, or reveal credentials.

## Official sources of truth
- GitHub repository: `wai1496/ai-biotech-store`
- Vercel project: `ai-biotech-store`
- Supabase production: `Ai BioTech Project`
- Supabase staging: `AI BioTech Staging`

## Page structure

### 1. Project Health
Show:
- overall completion percentage derived from roadmap item states
- current engineering phase
- production / preview / staging status
- latest deployment status
- database connectivity / health summary
- last successful refresh time

Use status values: `PASS`, `IN_PROGRESS`, `WARNING`, `BLOCKED`, `FAILED`, `UNKNOWN`.

### 2. Visual Roadmap
Render an accessible dependency diagram for:
Backup → Discovery → Database/Auth → Products → Variants → Inventory → Cart → Checkout → Orders → Wallet/Payments → Tracking → Member → Invoice → Protocol → QA → Production.

Each node includes status, short explanation, branch/build if relevant, and blockers.

### 3. Issues
Show four grouped views:
- Pending
- In progress
- Blocked
- Resolved

Primary source is GitHub issues when available. The progress API may also expose system-derived findings such as failed deployments, security warnings, or missing credentials. Every item must identify its source and timestamp.

### 4. Builds & Branches
Display current and recent GitHub branches, latest commit metadata, and Vercel deployments when server credentials are configured. Important branches include `main`, `staging/master-build`, `review/master-build-20260829`, feature/fix branches, and recovery/backup branches.

Each row shows branch, commit SHA, commit message, deployment environment, deployment state, and latest known result. Recovery/backup branches are visually classified as protected checkpoints rather than active work.

### 5. Notifications
Provide a bell button with unread count and an accessible dialog. Notification types include:
- repair completed
- blocker found
- build failed
- QA passed
- credential required
- security warning
- production-ready gate passed

Notifications are derived server-side from the current project status response. The first release does not require push notifications or browser Notification API permissions.

### 6. Project Chat
Provide a chat panel for questions about current project status. The first release uses a server-side `/api/progress-chat` endpoint. The endpoint receives the user's question plus a compact project-status snapshot. It must not receive or return secret values.

If an AI provider key is not configured, the chat UI must remain functional by returning deterministic status summaries for common questions and clearly display `AI assistant credential required` for unsupported free-form requests.

Example supported intents:
- What is broken?
- What is pending?
- What changed recently?
- Which branch is active?
- What is blocking production?
- What credential is missing?

### 7. Credential Center
The credential center is a readiness/status view, not a browser vault.

Actual credentials remain in server-side environment variables / provider secret stores. The browser receives only:
- key name
- configured: true/false
- environments where available when known
- purpose
- required/optional
- last-known configuration metadata when available

Never return secret values, prefixes that reveal usable material, or raw environment-variable dumps.

Initial credential readiness entries:
- GitHub access/token (optional for public-read fallback, required for richer private/write data)
- Vercel token/project/team configuration
- Supabase URL + anon/public configuration
- Supabase service-role/server secret where privileged status reads require it
- OpenAI API key for project chat
- ToyyibPay configuration
- SPX API configuration

Missing credentials must degrade gracefully and create a visible `credential required` notification rather than breaking the page.

## Server-side architecture

### `/api/progress-status`
Read-only GET endpoint. Aggregates project status from safe sources.

Response contract:
```json
{
  "generatedAt": "ISO-8601",
  "health": {"overallPercent": 0, "phase": "string", "status": "IN_PROGRESS"},
  "roadmap": [],
  "issues": [],
  "branches": [],
  "deployments": [],
  "notifications": [],
  "credentials": [],
  "sources": {"github": {}, "vercel": {}, "supabase": {}}
}
```

Rules:
- No secret values in response.
- External-source failure is isolated per source.
- Endpoint still returns HTTP 200 with source-specific `available:false` metadata when one provider is unavailable.
- Use short server-side timeouts.
- Prefer live data over hardcoded state.
- Any fallback status must be labeled as fallback/unknown rather than presented as measured fact.

### `/api/progress-chat`
POST endpoint. Input:
```json
{"message":"string"}
```

The endpoint obtains its own current compact status snapshot server-side and answers only project-status questions. It must reject oversized input and must never inject raw credentials into prompts.

## Authentication and access
`/progress.html` is an admin surface.

The page must reuse the project's existing admin-session/auth model where possible. Server endpoints must enforce the same admin authorization boundary rather than relying on a hidden link or client-side JavaScript alone.

If the repository's current admin authentication cannot be safely reused without a larger auth refactor, the first preview must be gated behind Vercel Preview protection and the implementation must report the auth integration as `BLOCKED` rather than shipping a public production page.

## UX / visual direction
- Light, clean AI BioTech control-center style.
- Mobile-first and usable on Android.
- No full-page horizontal overflow.
- Roadmap may horizontally scroll inside its own bounded area on narrow screens.
- Touch targets approximately 44 px.
- Status must use both text/icon and color.
- Branch/build tables should collapse into cards on narrow screens.
- Accessible modal/dialog semantics and focus behavior.

## Graceful degradation
The page must remain useful even when optional provider credentials are missing.

Examples:
- GitHub public repository data may use public REST fallback.
- Missing Vercel token → show current deployment metadata if available from runtime, otherwise `Vercel detailed history requires credential`.
- Missing OpenAI key → deterministic project-status responses remain available; free-form AI chat shows credential-required state.
- Missing SPX/ToyyibPay key → show missing credential only; do not fail the whole dashboard.

## Security requirements
- Never expose service-role keys, API tokens, passwords, or raw environment values to client code.
- No secrets in HTML, JS bundles, query strings, logs, chat prompts, or API responses.
- All privileged provider calls are server-side.
- Apply request-size limits and method validation.
- Progress endpoints are read-only in this release.
- Do not create a generic arbitrary-command or arbitrary-SQL interface.

## Delivery branch
Implement only on `feature/progress-control-center` until preview QA passes.

## Acceptance criteria
1. `/progress.html` renders on mobile and desktop with project health, roadmap, issues, builds/branches, notifications, chat, and credential readiness.
2. GitHub branch/issue data is live where accessible.
3. Vercel and Supabase panels show live data when configured and explicit degraded states when not.
4. No secret values can be found in page source, browser network responses, or generated chat content.
5. Project chat answers project-status questions and degrades safely without an AI key.
6. Notification dialog works via tap/click and keyboard.
7. Page does not mutate production data.
8. Admin authorization is enforced before production merge; otherwise production release remains blocked.
9. Preview is browser-tested at mobile and desktop widths before merge.
10. Production merge occurs only after verification evidence is recorded.
