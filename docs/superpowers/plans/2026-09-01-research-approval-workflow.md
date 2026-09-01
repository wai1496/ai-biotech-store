# AI BioTech Research Approval Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace live customer-triggered AI research with a Supabase-backed, versioned, admin-approved Research Catalog / Research Insight workflow where OpenAI drafts source-backed research on demand, Gemini is an optional fallback, and only an explicit admin approval publishes content.

**Architecture:** Keep `research_entries` as the public/current projection so existing product links and public RLS remain stable. Add `research_entry_versions` as the private draft/history store, a server-only admin refresh endpoint for OpenAI/Gemini research, deterministic evidence gating, and admin-only publish/reject RPCs. Public Research Insight and Research Catalog read only approved Supabase content and never call an AI provider.

**Tech Stack:** Static HTML/CSS/JavaScript storefront and admin, Vercel Node serverless functions, Supabase Postgres/Auth/RLS/RPC, OpenAI Responses API with web search + Structured Outputs, Gemini grounded search fallback, Node assertion-based QA scripts.

**Spec:** `docs/superpowers/specs/2026-09-01-research-approval-workflow-design.md`

## Global Constraints

- Supabase is the source of truth for public research.
- OpenAI is the primary on-demand research provider; default model is `gpt-5.6-luna`, configurable by `OPENAI_RESEARCH_MODEL`.
- Gemini is optional fallback only and uses existing `GEMINI_API_KEY`.
- Customer page views must make **zero AI requests**.
- Every AI refresh creates a new version; it must never overwrite the published projection directly.
- Only `super_admin` or `catalog_manager` may create/review/publish/reject research versions.
- `Approve & Publish` is the only action that changes public research content.
- Previously published versions remain historical and cannot be edited in place.
- Raw provider errors, key names, Vercel details, database internals, or quotas must never be shown to customers.
- Research subsystem must not generate dosing, administration schedules, diagnosis, treatment recommendations, individualized medical advice, or unsupported product-equivalence claims.
- Existing product, variant, inventory, order, wallet, customer and protocol data must not be modified by this feature.
- The existing 39 placeholder `research_entries` rows remain present during rollout; they are not automatically treated as scientifically approved.
- OpenAI integration uses the Responses API with `store: false`, web search, Structured Outputs, low reasoning effort, concise output and bounded output tokens. Official OpenAI documentation verified during planning confirms `gpt-5.6-luna` supports Responses API, web search and Structured Outputs.

---

## File Map

### Database
- Create: `sql/20260901_research_approval_workflow.sql` — columns, version table, RLS, immutability guard, publish/reject RPCs.
- Create: `qa/research-approval-schema.test.js` — static SQL contract checks before applying migration.

### Server research generation
- Create: `api/_research-auth.js` — validates Supabase bearer token and authorized admin role.
- Create: `api/_research-providers.js` — OpenAI primary, Gemini fallback, source normalization, evidence gate, change summary.
- Create: `api/admin-research-refresh.js` — authenticated endpoint orchestrating one research refresh.
- Keep: `api/ai-product-insight.js` during migration for compatibility, but no public page may call it; removal/deprecation can be a later cleanup.
- Create: `qa/admin-research-refresh.test.js` — source-level contracts for auth, provider order, safety prompt and non-public error behavior.

### Admin workspace
- Create: `admin-research.js` — product research list, fetch, review, manual draft, version history, publish/reject actions.
- Create: `admin-research.css` — focused responsive Research workspace/review UI.
- Modify: `admin.js` — route `research_entries` navigation to the focused workspace through an explicit context object.
- Modify: `admin.html` — load `admin-research.css` and `admin-research.js`.
- Create: `qa/admin-research-ui.test.js` — contract checks for workflow controls and approval boundaries.

### Public Research Insight / Catalog
- Modify: `research-insight.js` — Supabase-only approved read; remove AI/localStorage generation path.
- Modify: `research-insight.html` — approved/pending/temporary-unavailable copy only.
- Modify: `research.js` — use approved `research_entries.short_summary`; unapproved placeholders show “Research profile is being prepared.”
- Create: `qa/public-research.test.js` — prove zero AI calls and no raw provider errors in public code.

### Release / smoke checks
- Modify: `scripts/smoke-check.mjs` — enforce public research route/assets and ban public AI endpoint calls.
- Modify: `scripts/storefront-live-issues-check.mjs` — stop treating live AI 429 as a customer-path health dependency after migration; verify public research storage behavior instead.

---

### Task 1: Add the research version schema, RLS and transactional approval RPCs

**Files:**
- Create: `sql/20260901_research_approval_workflow.sql`
- Create: `qa/research-approval-schema.test.js`

**Interfaces:**
- Produces table `public.research_entry_versions`.
- Produces added columns on `public.research_entries`: `profile_json`, `published_version_id`, `approved_by`, `approved_at`, `published_at`, `verification_note`.
- Produces RPC `public.admin_publish_research_version(p_version_id uuid, p_verification_note text)`.
- Produces RPC `public.admin_reject_research_version(p_version_id uuid, p_reason text)`.
- Public read remains `research_entries where published=true`; `research_entry_versions` remains admin-only.

- [ ] **Step 1: Write the failing schema contract test**

Create `qa/research-approval-schema.test.js`:

```js
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const sqlPath=path.join(__dirname,'..','sql','20260901_research_approval_workflow.sql');
assert.ok(fs.existsSync(sqlPath),'research approval migration must exist');
const sql=fs.readFileSync(sqlPath,'utf8');

for(const token of [
  'create table if not exists public.research_entry_versions',
  'profile_json jsonb',
  'published_version_id uuid',
  'evidence_gate_json jsonb',
  'change_summary_json jsonb',
  'provider_metadata_json jsonb',
  'admin_publish_research_version',
  'admin_reject_research_version',
  'enable row level security',
  'public_research_versions_admin',
  'pending_admin_approval',
  'superseded'
]) assert.match(sql,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),`missing SQL contract: ${token}`);

assert.doesNotMatch(sql,/policy\s+.*anon.*research_entry_versions.*select/is,'versions must not have anonymous SELECT policy');
console.log('research approval schema contract passed');
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node qa/research-approval-schema.test.js
```

Expected: FAIL because `sql/20260901_research_approval_workflow.sql` does not exist.

- [ ] **Step 3: Create the migration with the exact public projection fields and version table**

Create `sql/20260901_research_approval_workflow.sql` beginning with:

```sql
alter table public.research_entries
  add column if not exists profile_json jsonb not null default '{}'::jsonb,
  add column if not exists published_version_id uuid,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists verification_note text not null default '';

create table if not exists public.research_entry_versions (
  id uuid primary key default gen_random_uuid(),
  research_entry_id uuid not null references public.research_entries(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  version_number integer not null,
  status text not null default 'draft'
    check (status in ('draft','ai_reviewed','pending_admin_approval','published','rejected','superseded')),
  provider text not null default 'manual',
  model text not null default '',
  profile_json jsonb not null default '{}'::jsonb,
  sources_json jsonb not null default '[]'::jsonb,
  evidence_gate_json jsonb not null default '{}'::jsonb,
  change_summary_json jsonb not null default '{}'::jsonb,
  provider_metadata_json jsonb not null default '{}'::jsonb,
  generated_at timestamptz,
  submitted_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  published_at timestamptz,
  rejection_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id,version_number)
);

alter table public.research_entries
  drop constraint if exists research_entries_published_version_id_fkey;
alter table public.research_entries
  add constraint research_entries_published_version_id_fkey
  foreign key (published_version_id)
  references public.research_entry_versions(id)
  on delete set null;

create index if not exists research_entry_versions_entry_created_idx
  on public.research_entry_versions(research_entry_id,created_at desc);
create index if not exists research_entry_versions_product_status_idx
  on public.research_entry_versions(product_id,status,version_number desc);
```

- [ ] **Step 4: Add RLS with public denial and admin-only version access**

Append:

```sql
alter table public.research_entry_versions enable row level security;

drop policy if exists public_research_versions_admin on public.research_entry_versions;
create policy public_research_versions_admin
on public.research_entry_versions
for all
to authenticated
using (public.is_admin(array['super_admin'::public.admin_role,'catalog_manager'::public.admin_role]))
with check (public.is_admin(array['super_admin'::public.admin_role,'catalog_manager'::public.admin_role]));
```

Do **not** add an anon/public SELECT policy for this table.

- [ ] **Step 5: Add a history immutability trigger**

Append an update/delete guard that allows an already-published version only to transition to `superseded` without changing its stored evidence/content:

```sql
create or replace function public.guard_research_version_history()
returns trigger
language plpgsql
security invoker
set search_path=''
as $function$
begin
  if tg_op='DELETE' and old.status in ('published','superseded') then
    raise exception 'Published research history is immutable';
  end if;

  if tg_op='UPDATE' and old.status='superseded' then
    raise exception 'Superseded research history is immutable';
  end if;

  if tg_op='UPDATE' and old.status='published' then
    if new.status<>'superseded'
       or new.profile_json<>old.profile_json
       or new.sources_json<>old.sources_json
       or new.evidence_gate_json<>old.evidence_gate_json
       or new.change_summary_json<>old.change_summary_json
       or new.provider_metadata_json<>old.provider_metadata_json
       or new.provider<>old.provider
       or new.model<>old.model
       or new.product_id<>old.product_id
       or new.research_entry_id<>old.research_entry_id
       or new.version_number<>old.version_number then
      raise exception 'Published research content is immutable';
    end if;
  end if;
  return coalesce(new,old);
end
$function$;

drop trigger if exists trg_guard_research_version_history on public.research_entry_versions;
create trigger trg_guard_research_version_history
before update or delete on public.research_entry_versions
for each row execute function public.guard_research_version_history();
```

- [ ] **Step 6: Add the transactional publish RPC**

Implement `public.admin_publish_research_version` as `security definer`, `set search_path=''`, verify `auth.uid()` and `is_admin(...)`, lock the target row, reject disallowed statuses, supersede the prior published version, publish the target, and copy the structured/public fields to `research_entries`.

Core transaction body:

```sql
create or replace function public.admin_publish_research_version(
  p_version_id uuid,
  p_verification_note text default ''
) returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  uid uuid:=auth.uid();
  v public.research_entry_versions;
begin
  if uid is null or not public.is_admin(array['super_admin'::public.admin_role,'catalog_manager'::public.admin_role]) then
    raise exception 'Admin authorization required';
  end if;

  select * into v from public.research_entry_versions where id=p_version_id for update;
  if not found then raise exception 'Research version not found'; end if;
  if v.status not in ('pending_admin_approval','ai_reviewed','draft') then
    raise exception 'Research version is not publishable from status %',v.status;
  end if;

  update public.research_entry_versions
     set status='superseded',updated_at=now()
   where product_id=v.product_id and status='published' and id<>v.id;

  update public.research_entry_versions
     set status='published',approved_by=uid,approved_at=now(),published_at=now(),updated_at=now()
   where id=v.id;

  update public.research_entries
     set short_summary=coalesce(v.profile_json->>'short_description',''),
         full_content=coalesce(v.profile_json->>'overview',''),
         references_json=v.sources_json,
         profile_json=v.profile_json,
         published=true,
         published_version_id=v.id,
         approved_by=uid,
         approved_at=now(),
         published_at=now(),
         verification_note=coalesce(p_verification_note,''),
         updated_at=now()
   where id=v.research_entry_id and product_id=v.product_id;

  if not found then raise exception 'Research entry projection missing'; end if;
  return jsonb_build_object('version_id',v.id,'product_id',v.product_id);
end
$function$;
```

- [ ] **Step 7: Add reject RPC**

`admin_reject_research_version` must allow `draft`, `ai_reviewed`, or `pending_admin_approval`, require a non-empty reason, set `status='rejected'`, write `rejection_note`, and never update `research_entries`.

- [ ] **Step 8: Run the schema contract test GREEN**

Run:

```bash
node qa/research-approval-schema.test.js
```

Expected: `research approval schema contract passed`.

- [ ] **Step 9: Apply the migration through the Supabase migration mechanism and verify live schema/security**

Apply the exact file as a named migration. Then run read-only verification queries:

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='research_entries'
  and column_name in ('profile_json','published_version_id','approved_by','approved_at','published_at','verification_note');

select table_name from information_schema.tables
where table_schema='public' and table_name='research_entry_versions';

select policyname,roles,cmd from pg_policies
where schemaname='public' and tablename='research_entry_versions';
```

Expected: six new projection columns, one version table, and only authenticated-admin RLS policy.

- [ ] **Step 10: Commit Task 1**

```bash
git add sql/20260901_research_approval_workflow.sql qa/research-approval-schema.test.js
git commit -m "feat: add versioned research approval schema"
```

---

### Task 2: Build authenticated OpenAI-first research generation with Gemini fallback

**Files:**
- Create: `api/_research-auth.js`
- Create: `api/_research-providers.js`
- Create: `api/admin-research-refresh.js`
- Create: `qa/admin-research-refresh.test.js`

**Interfaces:**
- `verifyResearchAdmin(req) -> { userId, role }` or throws an authorization error.
- `generateResearchDraft({product,currentPublished}) -> {profile,sources,evidence_gate,change_summary,provider,model,generated_at,provider_metadata}`.
- `POST /api/admin-research-refresh` accepts `{ product_id }` with `Authorization: Bearer <Supabase access token>`.
- Endpoint does not publish or mutate product/inventory/order data.

- [ ] **Step 1: Write the failing API contract test**

Create `qa/admin-research-refresh.test.js` that reads the new files and asserts:

```js
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

for(const file of ['api/_research-auth.js','api/_research-providers.js','api/admin-research-refresh.js'])
  assert.ok(fs.existsSync(path.join(root,file)),`${file} must exist`);

const endpoint=read('api/admin-research-refresh.js');
const providers=read('api/_research-providers.js');
const auth=read('api/_research-auth.js');

assert.match(endpoint,/verifyResearchAdmin/);
assert.match(endpoint,/product_id/);
assert.doesNotMatch(endpoint,/research_entries[^\n]*update/i,'refresh endpoint must not publish directly');
assert.match(providers,/OPENAI_API_KEY/);
assert.match(providers,/OPENAI_RESEARCH_MODEL/);
assert.match(providers,/gpt-5\.6-luna/);
assert.match(providers,/GEMINI_API_KEY/);
assert.ok(providers.indexOf('OPENAI_API_KEY')<providers.indexOf('GEMINI_API_KEY'),'OpenAI must be primary');
assert.match(providers,/pubmed\.ncbi\.nlm\.nih\.gov/);
assert.match(providers,/clinicaltrials\.gov/);
assert.match(providers,/fda\.gov/);
assert.match(providers,/no dosing|dosing/i);
assert.match(providers,/store['"]?\s*:\s*false/);
assert.match(auth,/authorization/i);
assert.match(auth,/admin_users/);
console.log('admin research refresh contract passed');
```

- [ ] **Step 2: Run RED**

```bash
node qa/admin-research-refresh.test.js
```

Expected: FAIL because the endpoint/helper files do not exist.

- [ ] **Step 3: Implement bearer-token admin verification**

In `api/_research-auth.js`, use the current Supabase URL and publishable key as non-secret defaults, overridable by `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.

Algorithm:

1. Read `Authorization` header and require `Bearer` token.
2. Call `${SUPABASE_URL}/auth/v1/user` with `apikey` and bearer token.
3. Read returned `id`.
4. Call `${SUPABASE_URL}/rest/v1/admin_users?select=role,active&user_id=eq.<id>&limit=1` using the same bearer token and `apikey`.
5. Require `active === true` and role in `['super_admin','catalog_manager']`.
6. Throw errors with internal codes `AUTH_REQUIRED` / `ADMIN_REQUIRED`; endpoint maps them to 401/403 without exposing bearer tokens.

Export:

```js
module.exports={verifyResearchAdmin};
```

- [ ] **Step 4: Implement a strict shared research output schema**

In `api/_research-providers.js`, define one JSON schema for provider output:

```js
const profileSchema={
  type:'object',additionalProperties:false,
  required:['short_description','overview','molecular_identity','mechanism','research_areas','evidence_context','cautions','source_notes','evidence_assessment'],
  properties:{
    short_description:{type:'string'},
    overview:{type:'string'},
    molecular_identity:{type:'string'},
    mechanism:{type:'string'},
    research_areas:{type:'array',items:{type:'string'},maxItems:10},
    evidence_context:{type:'string'},
    cautions:{type:'string'},
    source_notes:{type:'string'},
    evidence_assessment:{
      type:'object',additionalProperties:false,
      required:['exact_product_evidence','human_evidence','preclinical_evidence','contradictions_found','warnings'],
      properties:{
        exact_product_evidence:{type:'string',enum:['direct','component_only','limited','none']},
        human_evidence:{type:'string',enum:['direct','indirect','none']},
        preclinical_evidence:{type:'string',enum:['present','not_identified']},
        contradictions_found:{type:'boolean'},
        warnings:{type:'array',items:{type:'string'},maxItems:10}
      }
    }
  }
};
```

- [ ] **Step 5: Implement the OpenAI primary provider**

Use `POST https://api.openai.com/v1/responses` with:

```js
{
  model:process.env.OPENAI_RESEARCH_MODEL||'gpt-5.6-luna',
  store:false,
  reasoning:{effort:'low'},
  max_output_tokens:3200,
  tools:[{type:'web_search_preview',search_context_size:'medium'}],
  include:['web_search_call.action.sources'],
  text:{format:{type:'json_schema',name:'aibt_research_profile',strict:true,schema:profileSchema}},
  input:[
    {role:'system',content:[{type:'input_text',text:RESEARCH_SYSTEM_PROMPT}]},
    {role:'user',content:[{type:'input_text',text:`Research product: ${product.name}`}]}]
}
```

`RESEARCH_SYSTEM_PROMPT` must require high-authority sources first (`pubmed.ncbi.nlm.nih.gov`, `ncbi.nlm.nih.gov`, `clinicaltrials.gov`, `fda.gov`, `ema.europa.eu`, `who.int`), distinguish exact-combination evidence from component evidence, resolve/flag contradictions, and explicitly forbid dosing, administration, treatment recommendations and individualized advice.

Parse the structured message JSON and normalize URLs from `web_search_call.action.sources`. If OpenAI is absent, 429, 5xx, or otherwise unavailable, return a typed provider failure that allows fallback.

- [ ] **Step 6: Implement Gemini fallback without changing the public legacy endpoint**

Move/reuse the safe prompt/grounded-search logic from `api/ai-product-insight.js` inside `generateWithGemini(product)` so the admin endpoint can fall back when OpenAI cannot run. Preserve the same research-only restrictions. Return provider metadata `{provider:'gemini',model:'gemini-3.7-flash'}`.

Do not call Gemini when OpenAI succeeded.

- [ ] **Step 7: Normalize sources and calculate the deterministic evidence gate**

Implement helpers:

```js
function normalizeSources(rawSources){ /* unique URL, hostname, tier, supports, retrieved_at */ }
function buildEvidenceGate(sources,assessment){ /* counts + pass/fail */ }
function buildChangeSummary(currentPublished,nextProfile){ /* changed profile keys + source count delta */ }
```

Use high-tier domains:

```js
const HIGH_DOMAINS=new Set([
  'pubmed.ncbi.nlm.nih.gov','ncbi.nlm.nih.gov','clinicaltrials.gov',
  'fda.gov','www.fda.gov','ema.europa.eu','www.ema.europa.eu','who.int','www.who.int'
]);
```

Gate rule for automatic promotion to `pending_admin_approval`:

```js
passed = high_quality_source_count>=2
  && unique_domain_count>=2
  && assessment.contradictions_found===false;
```

Absence of direct human or exact-combination evidence is not by itself a failure if it is explicitly reported; it becomes visible evidence context/warning for the admin.

- [ ] **Step 8: Implement `/api/admin-research-refresh`**

Endpoint requirements:

- `POST` only.
- Verify admin first.
- Validate `product_id` against `^[a-zA-Z0-9_-]{1,120}$`.
- Fetch the active product and its current `research_entries` projection from Supabase REST using the caller token.
- Call `generateResearchDraft`.
- Return only the draft payload; do not update `research_entries` and do not write `research_entry_versions` on the server.
- Provider exhaustion returns `503` with `{code:'AI_RESEARCH_UNAVAILABLE',message:'AI research is temporarily unavailable. Existing published research is unchanged.'}` for the admin UI.
- Log provider internals server-side only.

- [ ] **Step 9: Run API contract and syntax tests GREEN**

```bash
node qa/admin-research-refresh.test.js
node --check api/_research-auth.js
node --check api/_research-providers.js
node --check api/admin-research-refresh.js
```

Expected: all exit 0.

- [ ] **Step 10: Commit Task 2**

```bash
git add api/_research-auth.js api/_research-providers.js api/admin-research-refresh.js qa/admin-research-refresh.test.js
git commit -m "feat: add admin-only research generation API"
```

---

### Task 3: Build the focused Admin Research workspace and version creation flow

**Files:**
- Create: `admin-research.js`
- Create: `admin-research.css`
- Modify: `admin.js`
- Modify: `admin.html`
- Create: `qa/admin-research-ui.test.js`

**Interfaces:**
- `window.AIBTAdminResearch.render({sb,role,content,flash,esc})` renders the workspace.
- `admin.js` delegates `research_entries` navigation to this function.
- Draft insertion uses authenticated Supabase client and private `research_entry_versions` RLS.

- [ ] **Step 1: Write failing admin UI contract**

Create `qa/admin-research-ui.test.js` asserting:

```js
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const f of ['admin-research.js','admin-research.css'])assert.ok(fs.existsSync(path.join(root,f)),`${f} missing`);
const js=read('admin-research.js'),html=read('admin.html'),admin=read('admin.js');
for(const text of ['Fetch New Research','Review Draft','Approve & Publish','Reject','Version History','Manual Draft'])assert.match(js,new RegExp(text.replace(/[&]/g,'&')));
assert.match(js,/admin_publish_research_version/);
assert.match(js,/admin_reject_research_version/);
assert.match(js,/research_entry_versions/);
assert.match(js,/Authorization/);
assert.match(html,/admin-research\.css/);
assert.match(html,/admin-research\.js/);
assert.match(admin,/AIBTAdminResearch/);
console.log('admin research UI contract passed');
```

- [ ] **Step 2: Run RED**

```bash
node qa/admin-research-ui.test.js
```

Expected: FAIL because files are absent.

- [ ] **Step 3: Add explicit admin navigation delegation**

Modify `view(v)` in `admin.js` so `research_entries` does not use generic `table(v)`:

```js
if(v==='research_entries'&&window.AIBTAdminResearch)
  return window.AIBTAdminResearch.render({sb,role,content,flash,esc});
```

Keep the existing navigation label `Research Catalog`.

- [ ] **Step 4: Load the focused module/style in `admin.html`**

Add `<link rel="stylesheet" href="/admin-research.css?v=20260901">` after existing admin styles and `<script src="/admin-research.js?v=20260901"></script>` after `admin.js` so the module is available when the Research nav is opened.

- [ ] **Step 5: Implement the Research list dashboard**

`render()` queries:

- published/active products,
- matching `research_entries`,
- latest version per product from `research_entry_versions`.

Render rows/cards containing product name, current published timestamp, latest version/status, provider/model, evidence badge, high-quality-source count and actions.

Do not display provider keys or raw API errors.

- [ ] **Step 6: Implement `Fetch New Research`**

Flow:

```js
const {data:{session}}=await sb.auth.getSession();
const response=await fetch('/api/admin-research-refresh',{
  method:'POST',
  headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},
  body:JSON.stringify({product_id:productId})
});
```

On success:

1. Read the latest `version_number` for the product.
2. Insert a new row in `research_entry_versions` with version number +1.
3. Set status to `pending_admin_approval` when `evidence_gate.passed`, else `draft`.
4. Save provider/model/profile/sources/evidence/change/provider metadata and timestamps.
5. If a unique-version conflict occurs, refetch max version and retry once.
6. Open Review Draft automatically after successful insertion.

On provider failure, show only: `AI research is temporarily unavailable. Existing published research is unchanged.`

- [ ] **Step 7: Implement manual draft**

Manual Draft opens editable fields for the same profile schema and optional source rows. Save creates a new version with `provider='manual'`, `status='draft'`, and no public change.

- [ ] **Step 8: Commit Task 3**

Run first:

```bash
node qa/admin-research-ui.test.js
node --check admin-research.js
node --check admin.js
```

Expected: all exit 0.

Then:

```bash
git add admin.js admin.html admin-research.js admin-research.css qa/admin-research-ui.test.js
git commit -m "feat: add research draft workspace"
```

---

### Task 4: Add evidence-first review, approval, rejection and version history UI

**Files:**
- Modify: `admin-research.js`
- Modify: `admin-research.css`
- Modify: `qa/admin-research-ui.test.js`

**Interfaces:**
- Review uses current `research_entries.profile_json/references_json` versus selected version.
- Publish calls `sb.rpc('admin_publish_research_version',...)`.
- Reject calls `sb.rpc('admin_reject_research_version',...)`.
- No direct browser update to public projection is allowed.

- [ ] **Step 1: Extend failing UI contract for review safety**

Add assertions that the module contains:

- `Published` and `Draft` comparison headings,
- `Evidence Gate`, `High-quality sources`, `Warnings`,
- `verification_note`,
- explicit RPC names,
- no `.from('research_entries').update(` publish path.

Run the test and confirm it fails before UI implementation.

- [ ] **Step 2: Implement side-by-side/stacked Review Draft**

Display each profile field under two columns on desktop and stacked blocks on mobile. Highlight changed fields using `change_summary_json.changed_fields`. Always display:

- provider/model,
- exact-product evidence classification,
- human/preclinical evidence status,
- high-quality-source count,
- unique-domain count,
- contradictions flag,
- warnings,
- source title/domain/tier/URL.

- [ ] **Step 3: Gate button copy and confirmation**

For failed evidence gate, use warning text:

`Evidence gate did not auto-pass. You may continue only after manually reviewing the warnings and sources.`

Approval remains possible after manual review as specified, but requires a verification note when the evidence gate failed. For a passing gate, the verification note is optional.

- [ ] **Step 4: Implement Approve & Publish via RPC only**

```js
const {data,error}=await sb.rpc('admin_publish_research_version',{
  p_version_id:version.id,
  p_verification_note:verificationNote
});
```

On success, refresh workspace and show `Research published`. Never update `research_entries` directly from browser code.

- [ ] **Step 5: Implement Reject**

Require a reason and call:

```js
await sb.rpc('admin_reject_research_version',{
  p_version_id:version.id,
  p_reason:reason
});
```

After reject, keep the current published content unchanged.

- [ ] **Step 6: Implement Version History**

List every version newest-first with version number, status, provider/model, created/generated/published timestamps and rejected reason. Published/superseded versions are read-only; selecting them opens view-only evidence/profile/source detail.

- [ ] **Step 7: Verify responsive CSS and contract tests**

`admin-research.css` must include desktop two-column review and a mobile breakpoint `@media(max-width:720px)` that stacks review columns and source cards.

Run:

```bash
node qa/admin-research-ui.test.js
node --check admin-research.js
```

Expected: exit 0.

- [ ] **Step 8: Commit Task 4**

```bash
git add admin-research.js admin-research.css qa/admin-research-ui.test.js
git commit -m "feat: add research evidence review and approval"
```

---

### Task 5: Convert public Research Insight to approved Supabase content only

**Files:**
- Modify: `research-insight.js`
- Modify: `research-insight.html`
- Create: `qa/public-research.test.js`

**Interfaces:**
- Public query: product + matching published `research_entries`.
- Public page never calls `/api/ai-product-insight` or `/api/admin-research-refresh`.
- Structured render uses `profile_json`, fallback to `short_summary/full_content` only for a genuinely approved projection.

- [ ] **Step 1: Write the failing public research contract**

Create `qa/public-research.test.js`:

```js
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const insight=read('research-insight.js'),html=read('research-insight.html');
assert.doesNotMatch(insight,/api\/ai-product-insight/,'customer insight must not call AI');
assert.doesNotMatch(insight,/admin-research-refresh/,'customer insight must not call admin AI');
assert.doesNotMatch(insight,/localStorage/,'customer insight must not cache AI drafts locally');
assert.match(insight,/research_entries/);
assert.match(insight,/profile_json/);
assert.match(insight,/published_version_id/);
for(const raw of ['GEMINI_API_KEY','OPENAI_API_KEY','AI_QUOTA_EXHAUSTED','Vercel environment']){
  assert.ok(!insight.includes(raw)&&!html.includes(raw),`public UI must not expose ${raw}`);
}
assert.match(insight,/Research profile is being prepared/);
assert.match(insight,/temporarily unavailable/i);
console.log('public Research Insight contract passed');
```

- [ ] **Step 2: Run RED**

Expected: current `research-insight.js` fails due AI/localStorage/Gemini-key behavior.

- [ ] **Step 3: Rewrite `research-insight.js` boot flow**

The new boot sequence:

1. Resolve `product` query param.
2. Fetch the published active product.
3. Fetch `research_entries` by `product_id` and `published=true`.
4. If no entry, no `published_version_id`, or `profile_json` is empty, show `Research profile is being prepared. Please check again later.`
5. If approved profile exists, render structured fields and `references_json` immediately.
6. On Supabase/network failure, show `Research information is temporarily unavailable. Please try again later.`
7. Never call any AI endpoint.

Approved rendering should show published/verified timestamp and source links, but not admin identity UUID.

- [ ] **Step 4: Update public notice copy in `research-insight.html`**

Replace wording implying customer-visible AI generation with:

`This page shows the latest AI BioTech research profile that has passed admin review and publication. It is a research reference only and is not medical advice, dosing guidance, or proof that catalog material is equivalent to a regulated medicine.`

- [ ] **Step 5: Run GREEN**

```bash
node qa/public-research.test.js
node --check research-insight.js
```

Expected: exit 0.

- [ ] **Step 6: Commit Task 5**

```bash
git add research-insight.js research-insight.html qa/public-research.test.js
git commit -m "fix: serve approved research insight from Supabase"
```

---

### Task 6: Make Research Catalog use only approved public summaries

**Files:**
- Modify: `research.js`
- Modify: `qa/public-research.test.js`

**Interfaces:**
- `research.js` loads public `research_entries` once and maps by `product_id`.
- Approved card summary uses `short_summary` only when `published_version_id` exists.
- Placeholder/unapproved card summary is `Research profile is being prepared.`
- “Explore science” continues to open the deeper Research Insight route for that product.

- [ ] **Step 1: Extend failing test**

Assert `research.js` contains `research_entries`, `published_version_id`, `short_summary` and the prepared-state copy, and does not reference `research_entry_versions`.

- [ ] **Step 2: Add one public research projection loader**

Add a map such as:

```js
const publishedResearch=new Map();
async function loadPublishedResearch(){
  if(!window.supabase)return;
  const client=window.supabase.createClient(RI_SB_URL,RI_SB_KEY);
  const {data}=await client.from('research_entries')
    .select('product_id,short_summary,published_version_id,published_at')
    .eq('published',true);
  for(const row of data||[])publishedResearch.set(row.product_id,row);
}
```

Use one in-flight promise to avoid repeated reads each time Research Catalog opens.

- [ ] **Step 3: Use approved summary on cards**

When rendering a card:

```js
const approved=publishedResearch.get(p.id);
const summary=approved?.published_version_id
  ? approved.short_summary
  : 'Research profile is being prepared.';
```

Do not display AI draft data or query the private versions table.

- [ ] **Step 4: Route detail action to the canonical Research Insight page**

Change/retain card detail action so the primary deep action opens:

```js
location.href='/research-insight.html?product='+encodeURIComponent(p.id)
```

The legacy in-page hardcoded scientific detail may remain only as a non-primary fallback during transition if needed for compatibility, but it must not be presented as the approved profile once the Supabase approved projection is available.

- [ ] **Step 5: Verify**

```bash
node qa/public-research.test.js
node --check research.js
```

Expected: exit 0.

- [ ] **Step 6: Commit Task 6**

```bash
git add research.js qa/public-research.test.js
git commit -m "feat: align research catalog with approved profiles"
```

---

### Task 7: Extend smoke checks and run full regression suite

**Files:**
- Modify: `scripts/smoke-check.mjs`
- Modify: `scripts/storefront-live-issues-check.mjs`
- Test: `qa/research-approval-schema.test.js`
- Test: `qa/admin-research-refresh.test.js`
- Test: `qa/admin-research-ui.test.js`
- Test: `qa/public-research.test.js`
- Existing: `qa/storefront-navigation.test.js`

**Interfaces:**
- Local smoke suite fails if customer Research Insight calls AI or exposes provider secrets/errors.
- Live issue checker treats published Supabase research availability as the customer-path health requirement; admin AI refresh is a separate admin capability check.

- [ ] **Step 1: Add smoke-check guards**

In `scripts/smoke-check.mjs`, add failures if `research-insight.js` contains `/api/ai-product-insight`, `/api/admin-research-refresh`, `localStorage`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `AI_QUOTA_EXHAUSTED`.

Also require `admin-research.js`, `admin-research.css`, `api/admin-research-refresh.js`, and the SQL migration file.

- [ ] **Step 2: Update live issue checker semantics**

The live checker should:

- request `/research-insight.html?product=reta` and require HTTP 200,
- verify public Supabase `research_entries` remains readable,
- no longer trigger `/api/ai-product-insight` as a customer availability test,
- optionally report admin research refresh availability separately only when authenticated test credentials exist,
- keep existing homepage/permalink/assets/catalog checks.

- [ ] **Step 3: Run all local QA**

```bash
node qa/research-approval-schema.test.js
node qa/admin-research-refresh.test.js
node qa/admin-research-ui.test.js
node qa/public-research.test.js
node qa/storefront-navigation.test.js
node scripts/smoke-check.mjs
node --check api/_research-auth.js
node --check api/_research-providers.js
node --check api/admin-research-refresh.js
node --check admin-research.js
node --check research-insight.js
node --check research.js
```

Expected: all commands exit 0.

- [ ] **Step 4: Verify database security with real sessions**

Run four real checks after migration:

1. Anonymous SELECT `research_entries where published=true` succeeds.
2. Anonymous SELECT `research_entry_versions` fails/returns denied.
3. Normal authenticated non-admin insert into `research_entry_versions` fails.
4. Admin insert succeeds; publish RPC succeeds only for admin.

Use a test draft for a non-customer-facing product or create a draft and reject it afterward; do not publish placeholder content just to test.

- [ ] **Step 5: Verify publish transaction with one controlled product**

For one selected product:

1. Create a manual test draft with recognizable non-medical placeholder copy on preview/staging only.
2. Publish through RPC.
3. Confirm `research_entries.published_version_id` matches version.
4. Confirm target version is `published`.
5. Publish a second test version and confirm previous becomes `superseded`.
6. Confirm trying to edit the old published/superseded content is rejected by the immutability guard.

Do not perform this destructive publish test against customer-facing production content unless the draft is a genuinely reviewed profile ready to publish.

- [ ] **Step 6: Verify no-provider customer behavior**

On a preview deployment with OpenAI/Gemini unavailable or not called, open public Research Insight for a product with approved content. It must render the Supabase profile without any AI/network request to provider endpoints.

- [ ] **Step 7: Verify Admin review on desktop and mobile widths**

At minimum check 1440px, 768px and 390px widths:

- list is readable,
- source URLs do not overflow,
- Published vs Draft stacks on mobile,
- warnings remain visible,
- Approve/Reject cannot be accidentally obscured,
- no horizontal page overflow.

If automated browser QA remains unavailable, capture manual screenshots and treat visual QA as an explicit release gate rather than assuming CSS correctness.

- [ ] **Step 8: Commit Task 7**

```bash
git add scripts/smoke-check.mjs scripts/storefront-live-issues-check.mjs
git commit -m "test: gate approved research workflow release"
```

---

### Task 8: Preview deployment, code review, production promotion and post-deploy verification

**Files:**
- No new feature files expected unless review finds defects.

**Interfaces:**
- Preview branch: `feature/research-approval-workflow`.
- Production promotion only after schema, API, Admin, public and smoke gates pass.

- [ ] **Step 1: Push/confirm preview deployment READY**

Verify the newest Vercel deployment for `feature/research-approval-workflow` is `READY` and its build error log contains no errors.

- [ ] **Step 2: Run preview route checks**

Require 200 for:

- `/`
- `/admin.html`
- `/research-insight.html?product=reta`
- `/member.html`
- `/checkout.html`
- `/peptide-calculator.html`
- `/product/reta`

Require the new static files to return 200:

- `/admin-research.js`
- `/admin-research.css`

- [ ] **Step 3: Perform security and workflow review**

Review diff specifically for:

- no secret key in browser code,
- no public read policy on `research_entry_versions`,
- no direct public-projection update from Admin browser code,
- provider errors sanitized,
- source URLs escaped before rendering,
- bearer tokens never logged,
- publish/reject role verification occurs server/database side,
- public page makes zero AI calls.

- [ ] **Step 4: Open PR and request review**

PR summary must list schema changes, API provider/fallback behavior, admin approval gate, public no-AI behavior, test evidence and the fact that no product/inventory/order/protocol data is modified.

- [ ] **Step 5: Merge only after review and preview QA**

Do not merge if any Critical/Important review finding remains unresolved.

- [ ] **Step 6: Verify production after merge**

Fresh production checks:

- current deployment `READY`,
- homepage 200,
- Research Insight 200,
- no customer request to `/api/ai-product-insight` when opening Research Insight,
- public approved profile renders from Supabase,
- Admin Research workspace loads after authenticated sign-in,
- existing catalog/product/member/checkout/protocol smoke checks remain green,
- Vercel production logs show no new 5xx cluster.

- [ ] **Step 7: Leave old AI endpoint in compatibility mode initially**

Do not delete `api/ai-product-insight.js` during the same release. Once production logs confirm no public callers for at least one normal operating window, deprecate/remove it in a separate small cleanup change.

---

## Self-Review Against the Approved Spec

- **Supabase public source of truth:** Tasks 1, 5, 6.
- **OpenAI primary / Gemini fallback:** Task 2.
- **No customer AI calls:** Tasks 5, 7, 8.
- **Draft every refresh / version history:** Tasks 1, 3, 4.
- **Evidence gate and high-level source review:** Tasks 2, 4.
- **Admin approval only:** Tasks 1 and 4.
- **Immutable published history / rollback visibility:** Tasks 1 and 4.
- **Public sanitized errors:** Tasks 2 and 5.
- **Manual drafts:** Task 3.
- **Research Catalog + Research Insight alignment:** Tasks 5 and 6.
- **Auth/RLS/security:** Tasks 1, 2, 7.
- **39 placeholder entries preserved:** Task 1 changes schema only; Task 5 treats no published version as “being prepared.”
- **No product/inventory/order/protocol mutation:** Global constraint and Task 8 review gate.
- **Failure handling:** Tasks 2, 3, 5, 7.
- **Testing/release gates:** Tasks 7 and 8.
- **Out-of-scope calculator/progress work:** intentionally not mixed into this feature branch.

No placeholders or unresolved implementation decisions remain in this plan. The exact provider model is configurable, with `gpt-5.6-luna` as the cost-sensitive default; OpenAI official docs checked on 2026-09-01 confirm this model supports Responses, web search and Structured Outputs.