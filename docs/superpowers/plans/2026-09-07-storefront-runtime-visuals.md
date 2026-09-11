# AI BioTech Storefront Runtime Visuals — Phase 2A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the approved Pen, Vial, and Cartridge runtime visual rules in a protected storefront preview without changing production data or generating hundreds of finished variant images.

**Architecture:** Keep `visual-renderer.js` as the single source of truth for geometry, recoloring, text fitting, and Cartridge fallback classification. Refactor the visual-only branch in `center-fix.js` into a thin storefront adapter that preserves real uploaded image priority, resolves shared masters/fallbacks, calls `AIBTVisualRenderer.renderPreview()`, and falls back to approved static assets on any rendering failure. The standalone composer continues to call the same renderer.

**Tech Stack:** Vanilla JavaScript, Canvas 2D, existing storefront globals/data model, GitHub Actions Node contract tests, Vercel preview deployment.

**Spec:** `docs/superpowers/specs/2026-09-07-storefront-runtime-visuals-design.md`

## Global Constraints
- Phase 2A is preview-only until protected-preview QA passes.
- Real uploaded variant images always have highest visual priority.
- No production database/data changes.
- No Supabase schema, RLS, Auth, function, trigger, storage-policy, or migration changes.
- No Supabase storage uploads or media-template writes.
- No payment, domain, DNS, secret, environment-variable, billing, or account-ownership changes.
- Do not redesign catalog, product, cart, checkout, member, admin, or navigation flows.
- Pen, Vial, and Cartridge geometry must match the approved Phase 1 renderer rules.
- Cartridge names longer than 14 normalized characters use the approved standard reference visual.
- Rendering failure must never block catalog, product selection, cart, or checkout.

---

### Task 1: Lock shared storefront-renderer contracts

**Files:**
- Create: `qa/storefront-runtime-visuals.test.js`
- Read/verify: `visual-renderer.js`
- Read/verify: `center-fix.js`

**Interfaces:**
- Consumes: `window.AIBTVisualRenderer.renderPreview(options)` and `window.AIBTVisualRenderer.cartridgeVisualMode(name)`.
- Produces: executable contract proving image priority, shared-renderer delegation, Cartridge fallback rules, and mutation-free behavior.

- [ ] **Step 1: Write the failing storefront integration contract**

Create `qa/storefront-runtime-visuals.test.js` that asserts:

```js
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const center=fs.readFileSync(path.join(root,'center-fix.js'),'utf8');
const renderer=fs.readFileSync(path.join(root,'visual-renderer.js'),'utf8');

assert.match(center,/AIBTVisualRenderer\.renderPreview/,'storefront must delegate shared-master composition to shared renderer');
assert.match(center,/real\(p,v\)/,'real uploaded variant image priority must remain explicit');
assert.match(center,/cartridgeVisualMode/,'storefront must use shared Cartridge classifier');
assert.match(center,/cartridge-master-admin\.webp/,'storefront must retain approved standard Cartridge reference');
assert.match(center,/cartridge-master-approved\.webp/,'storefront must retain bundled Cartridge fallback');
assert.match(renderer,/function cartridgeVisualMode/,'renderer must own Cartridge short-name classification');
for(const forbidden of ['.insert(','.update(','.upsert(','.delete(','.upload(']){
  assert.ok(!center.includes(forbidden),`center-fix must not mutate production data: ${forbidden}`);
  assert.ok(!renderer.includes(forbidden),`renderer must not mutate production data: ${forbidden}`);
}
console.log('storefront runtime visuals contract passed');
```

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
node qa/storefront-runtime-visuals.test.js
```

Expected: FAIL because `center-fix.js` still contains its own compositor and hard-coded Cartridge branch.

- [ ] **Step 3: Do not modify implementation yet**

Confirm the failure is specifically about missing shared-renderer delegation and not an unrelated syntax/file error.

- [ ] **Step 4: Commit the RED contract**

```bash
git add qa/storefront-runtime-visuals.test.js
git commit -m "test: lock storefront runtime visual contracts"
```

---

### Task 2: Make the shared renderer storefront-ready

**Files:**
- Modify: `visual-renderer.js`
- Test: `qa/storefront-runtime-visuals.test.js`
- Test: existing `qa/visual-composer-*.test.js`

**Interfaces:**
- Produces: `cartridgeVisualMode(name) -> 'dynamic' | 'reference-only'`.
- Produces: `renderPreview(...) -> Promise<{mode,format,fallbackReason?}>`.

- [ ] **Step 1: Add failing classifier assertions**

Extend the test with:

```js
const vm=require('vm');
const sandbox={window:{}};
vm.runInNewContext(renderer,sandbox,{filename:'visual-renderer.js'});
const R=sandbox.window.AIBTVisualRenderer;
assert.equal(R.cartridgeVisualMode('GHK-CU'),'dynamic');
assert.equal(R.cartridgeVisualMode('CAGRILINTIDE'),'dynamic');
assert.equal(R.cartridgeVisualMode('TESAMORELIN'),'dynamic');
assert.equal(R.cartridgeVisualMode('SEMAGLUTIDE + CAGRILINTIDE'),'reference-only');
assert.equal(R.cartridgeVisualMode('CJC-1295 WITHOUT DAC + IPAMORELIN'),'reference-only');
```

- [ ] **Step 2: Run and verify RED**

Run `node qa/storefront-runtime-visuals.test.js`.

Expected: FAIL if the classifier is absent or not exported.

- [ ] **Step 3: Implement the minimal shared classifier**

In `visual-renderer.js`, add:

```js
const CARTRIDGE_DYNAMIC_NAME_MAX=14;
function cartridgeVisualMode(value){
  const name=normalizeLabel(value);
  return name.length>0&&name.length<=CARTRIDGE_DYNAMIC_NAME_MAX?'dynamic':'reference-only';
}
```

Export `CARTRIDGE_DYNAMIC_NAME_MAX` and `cartridgeVisualMode` on `AIBTVisualRenderer`.

Update the Cartridge branch in `renderPreview()` so a long name returns:

```js
{mode:'reference-only',format:'Cartridge',fallbackReason:'long-cartridge-name'}
```

without drawing dynamic name/strength.

- [ ] **Step 4: Run renderer/composer tests**

Run:

```bash
for file in qa/visual-composer-*.test.js; do node "$file"; done
node qa/storefront-runtime-visuals.test.js
```

Expected: all PASS except the storefront delegation assertion that remains intentionally RED until Task 3.

- [ ] **Step 5: Commit**

```bash
git add visual-renderer.js qa/storefront-runtime-visuals.test.js
git commit -m "feat: expose shared Cartridge visual classifier"
```

---

### Task 3: Replace duplicate storefront composition with shared-renderer delegation

**Files:**
- Modify: `center-fix.js`
- Test: `qa/storefront-runtime-visuals.test.js`
- Test: `scripts/storefront-live-issues-check.mjs`

**Interfaces:**
- Consumes: `AIBTVisualRenderer.renderPreview()` and `cartridgeVisualMode()`.
- Produces: `window.visual(p,v,el)` with unchanged call signature.

- [ ] **Step 1: Preserve source-resolution helpers**

Keep the existing `real(p,v)` priority and static Cartridge URLs. Add helpers with these responsibilities:

```js
function standardCartridgeSource(){
  return 'https://yjauxyvtrmdriwtmckkl.supabase.co/storage/v1/object/public/catalog-media/masters/cartridge-master-admin.webp?v='+Date.now();
}
function bundledCartridgeSource(){return '/assets/cartridge-master-approved.webp'}
function sharedMasterSource(p,v,form){
  const rr=real(p,v);
  if(rr&&!isSharedMasterImage(rr,form))return {kind:'real',url:rr};
  return {kind:'master',url:masters?.[form]||rr||''};
}
```

Do not alter catalog or variant data.

- [ ] **Step 2: Add renderer script dependency to storefront page if needed**

In `index.html`, ensure:

```html
<script src="/visual-renderer.js?v=20260907"></script>
<script src="/center-fix.js"></script>
```

with `visual-renderer.js` loading before `center-fix.js`.

- [ ] **Step 3: Replace only the visual-composition body**

`window.visual(p,v,el)` must follow this order:

```js
const form=v?.form||v?.format||'Vial';
const rr=real(p,v);
if(rr&&!isSharedMasterImage(rr,form)){
  el.innerHTML=`<img src="${rr}" alt="${p.name}">`;
  return;
}
if(!window.AIBTVisualRenderer){
  // existing approved static fallback path
}
```

For Cartridge:

```js
const mode=window.AIBTVisualRenderer.cartridgeVisualMode(p.name);
if(mode==='reference-only'){
  renderStandardCartridge(el,p.name);
  return;
}
```

For dynamic Pen/Vial/short-name Cartridge:
- resolve the approved compatible blank/shared master;
- create a 1536×1536 canvas;
- call `renderPreview({canvas,masterUrl,productName:p.name,strength:main(v?.strength||v?.strength_label||''),format:form,accent:color(p),cartridgeBlank:form==='Cartridge',vialCapMode:'white'})`;
- append canvas on success;
- render approved static fallback on rejection.

- [ ] **Step 4: Run the focused contract**

```bash
node qa/storefront-runtime-visuals.test.js
```

Expected: PASS.

- [ ] **Step 5: Run existing storefront checks**

```bash
node scripts/storefront-live-issues-check.mjs
node scripts/smoke-check.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add center-fix.js index.html qa/storefront-runtime-visuals.test.js
git commit -m "feat: delegate storefront visuals to shared renderer"
```

---

### Task 4: Add explicit fallback and real-image priority regression coverage

**Files:**
- Modify: `qa/storefront-runtime-visuals.test.js`
- Modify only if required: `center-fix.js`

**Interfaces:**
- Produces: regression proof that renderer failures cannot block storefront visual hosts.

- [ ] **Step 1: Add source-level fallback assertions**

Add assertions for:

```js
assert.match(center,/onerror|catch/,'storefront adapter must retain non-blocking fallback handling');
assert.match(center,/cartridge-master-approved\.webp/,'bundled Cartridge fallback must remain available');
assert.match(center,/MASTER NOT UPLOADED|missing/i,'missing compatible master must degrade visibly and non-destructively');
```

- [ ] **Step 2: Assert real image check happens before renderer call**

Use source indexes:

```js
const realIndex=center.indexOf('real(p,v)');
const renderIndex=center.indexOf('AIBTVisualRenderer.renderPreview');
assert.ok(realIndex>=0&&renderIndex>realIndex,'real image resolution must occur before dynamic composition');
```

- [ ] **Step 3: Run and verify tests**

```bash
node qa/storefront-runtime-visuals.test.js
node scripts/storefront-live-issues-check.mjs
node scripts/smoke-check.mjs
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add qa/storefront-runtime-visuals.test.js center-fix.js
git commit -m "test: cover storefront visual fallbacks"
```

---

### Task 5: Protected preview QA gate

**Files:**
- No production files beyond Tasks 1–4.
- Update PR description only if needed to describe Phase 2A preview scope.

**Interfaces:** none.

- [ ] **Step 1: Run the complete CI-equivalent suite**

```bash
for file in qa/visual-composer-*.test.js; do node "$file"; done
node qa/storefront-runtime-visuals.test.js
node scripts/storefront-live-issues-check.mjs
node scripts/smoke-check.mjs
```

Expected: all PASS.

- [ ] **Step 2: Inspect final diff for scope**

Allowed implementation files for Phase 2A:
- `visual-renderer.js`
- `center-fix.js`
- `index.html` only for renderer script ordering
- `qa/storefront-runtime-visuals.test.js`
- existing composer QA files only when a shared-renderer contract genuinely needs updating
- docs/spec/plan

No unrelated catalog, cart, checkout, admin, member, payment, Supabase migration, or configuration files.

- [ ] **Step 3: Verify protected Vercel preview on mobile, tablet, desktop**

Required visual cases:
- GHK-CU Pen
- CAGRILINTIDE Pen
- GHK-CU Vial
- CJC-1295 WITHOUT DAC + IPAMORELIN Vial (two lines)
- GHK-CU Cartridge dynamic
- CAGRILINTIDE Cartridge dynamic
- SEMAGLUTIDE + CAGRILINTIDE Cartridge standard reference

Required customer journeys:
- homepage/catalog load
- open product
- strength switch
- format switch
- add to cart
- cart display
- checkout entry
- member/navigation links
- admin entry

Check console/network for new critical errors and failed assets.

- [ ] **Step 4: Release decision**

If every gate passes, report `READY FOR PHASE 2A RELEASE REVIEW` but do **not** merge/deploy production automatically from this plan. If any material visual or storefront gate fails, report `REPAIR` with the exact failed route/variant and keep production untouched.
