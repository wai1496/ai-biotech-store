# Preview-Only Product Visual Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, preview-only Product Visual Composer for Vial, Pen, and Cartridge that reuses AI BioTech's existing dynamic label-fit logic without writing to production data or changing storefront behavior.

**Architecture:** Add a pure browser renderer module (`visual-renderer.js`) plus a standalone controller/page (`visual-composer.js` / `visual-composer.html`) and focused CSS. The renderer owns 1536×1536 canvas composition and fit-to-box text logic. The controller may read public catalog/master data but has no mutation path; Cartridge is explicitly reference-only unless a blank master is later supplied.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Canvas 2D, existing Supabase JS client for optional read-only catalog lookup, GitHub Actions Node contract tests.

**Spec:** `docs/superpowers/specs/2026-09-07-visual-composer-preview-design.md`

## Global Constraints
- Phase 1 is preview-only.
- No production database/storage/auth/schema/RLS/secrets/payment/DNS writes.
- No changes to live storefront rendering behavior.
- Output canvas is 1536×1536.
- Pen name/strength field geometry must match current `center-fix.js` values.
- Longer names automatically shrink within fixed print fields.
- Cartridge is reference-only unless a verified blank master is available.

---

### Task 1: Pure fit-to-field renderer helpers

**Files:**
- Create: `visual-renderer.js`
- Test: `qa/visual-composer-renderer.test.js`

**Interfaces:**
- Produces: `window.AIBTVisualRenderer`
- `fitFontSize(measureText, text, field) -> number`
- `normalizeLabel(value) -> string`
- `PEN_FIELDS`, `VIAL_FIELDS`

- [ ] **Step 1: Write the failing renderer contract**

Create `qa/visual-composer-renderer.test.js` that loads `visual-renderer.js` in a minimal VM-style environment and asserts:
- `PEN_FIELDS.name` equals `{x:720,y:674,w:362,h:122,pad:18,max:44,min:16,weight:900}`.
- `PEN_FIELDS.strength` equals `{x:1128,y:680,w:126,h:118,pad:12,max:28,min:14,weight:900}`.
- A deterministic mock `measureText(text,size)` makes `fitFontSize(...,'CAGRILINTIDE',PEN_FIELDS.name)` return a smaller value than `fitFontSize(...,'GHK-CU',PEN_FIELDS.name)`.
- Returned size is never lower than `field.min`.

- [ ] **Step 2: Run the test and verify RED**

Run: `node qa/visual-composer-renderer.test.js`
Expected: FAIL because `visual-renderer.js` does not exist.

- [ ] **Step 3: Implement the minimal pure helper API**

Create `visual-renderer.js` with an IIFE exposing:
```js
const PEN_FIELDS={
  name:{x:720,y:674,w:362,h:122,pad:18,max:44,min:16,weight:900},
  strength:{x:1128,y:680,w:126,h:118,pad:12,max:28,min:14,weight:900}
};
const VIAL_FIELDS={
  name:{cx:768,cy:820,maxW:430,max:66,min:20,weight:900},
  strength:{cx:768,cy:977,maxW:230,max:58,min:20,weight:900}
};
function normalizeLabel(v){return String(v??'').replace(/\s+\d+(?:\.\d+)?\s*(?:MG|ML)$/i,'').trim()}
function fitFontSize(measure,text,field){
  const maxW=Math.max(1,(field.w||field.maxW)-((field.pad||0)*2));
  for(let size=field.max;size>field.min;size--){if(measure(String(text||''),size)<=maxW)return size}
  return field.min;
}
window.AIBTVisualRenderer={PEN_FIELDS,VIAL_FIELDS,normalizeLabel,fitFontSize};
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `node qa/visual-composer-renderer.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add pure visual composer fit helpers`

---

### Task 2: Canvas composition engine

**Files:**
- Modify: `visual-renderer.js`
- Test: `qa/visual-composer-renderer.test.js`

**Interfaces:**
- Produces: `renderPreview({canvas, masterUrl, productName, strength, format, accent, cartridgeBlank=false}) -> Promise<{mode,format}>`

- [ ] **Step 1: Extend the failing contract**

Add assertions that source text contains:
- canvas dimensions `1536` × `1536`;
- Pen path calling fixed-field text printing;
- Vial path using `VIAL_FIELDS` anchors;
- Cartridge branch returning mode `reference-only` unless `cartridgeBlank` is true;
- no `.insert(`, `.update(`, `.upsert(`, `.delete(`, `.upload(` strings.

- [ ] **Step 2: Run and verify RED**

Run: `node qa/visual-composer-renderer.test.js`
Expected: FAIL on missing `renderPreview`/Cartridge behavior.

- [ ] **Step 3: Implement minimal composition**

Implement:
- `loadImage(url)` with `crossOrigin='anonymous'`.
- `drawContained(ctx,img,1536,1536)`.
- `printField` using Canvas `measureText`, fixed clipping rectangle, and `fitFontSize`.
- `printCenteredField` for Vial optical fields.
- `renderPreview` that clears the canvas, loads/draws the master, then:
  - Pen: print normalized product name in `PEN_FIELDS.name`, strength in `PEN_FIELDS.strength`.
  - Vial: print normalized name/strength at `VIAL_FIELDS` anchors.
  - Cartridge with `cartridgeBlank=false`: draw master only and return `{mode:'reference-only',format:'Cartridge'}`.
  - Cartridge with `cartridgeBlank=true`: reserve hook for dynamic fields but do not invent geometry; return `{mode:'blank-master-awaiting-field-map',format:'Cartridge'}` and do not print text.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node qa/visual-composer-renderer.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add preview canvas composition engine`

---

### Task 3: Standalone preview composer page

**Files:**
- Create: `visual-composer.html`
- Create: `visual-composer.css`
- Create: `visual-composer.js`
- Test: `qa/visual-composer-page.test.js`

**Interfaces:**
- Consumes: `window.AIBTVisualRenderer.renderPreview`
- Produces DOM ids: `vcProduct`, `vcStrength`, `vcFormat`, `vcAccent`, `vcMaster`, `vcCanvas`, `vcStatus`, `vcMeta`, `vcRender`, `vcReset`.

- [ ] **Step 1: Write failing page contract**

Test source files for:
- manual product/strength/format/accent/master inputs;
- 1536×1536 canvas;
- Render and Reset buttons;
- Draft / Looks Good / Needs Adjustment local status options;
- page loads `visual-renderer.js` before `visual-composer.js`;
- no form action and no mutation endpoint strings.

- [ ] **Step 2: Run and verify RED**

Run: `node qa/visual-composer-page.test.js`
Expected: FAIL because page files do not exist.

- [ ] **Step 3: Implement the page**

Build a dark AI BioTech preview UI with responsive two-column desktop / one-column mobile layout. Use a square preview stage, clear labels, category accent presets, manual master URL field, and visible `PREVIEW ONLY — NO PRODUCTION WRITES` banner.

- [ ] **Step 4: Implement controller behavior**

`visual-composer.js` should:
- validate required fields;
- call `renderPreview` only on Render;
- update metadata and error/status text;
- keep QA status only in page memory/local DOM; do not persist to localStorage or Supabase;
- Reset restores defaults and clears the canvas.

- [ ] **Step 5: Run test and verify GREEN**

Run: `node qa/visual-composer-page.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: add preview-only visual composer page`

---

### Task 4: Optional read-only catalog/master lookup

**Files:**
- Modify: `visual-composer.html`
- Modify: `visual-composer.js`
- Test: `qa/visual-composer-readonly.test.js`

**Interfaces:**
- Produces: `loadPublishedProducts()`, `loadMasters()`

- [ ] **Step 1: Write failing read-only safety test**

Assert that `visual-composer.js` may contain `.from('products').select(`, `.from('product_variants').select(`, and `.from('media_templates').select(`, but contains no `.insert(`, `.update(`, `.upsert(`, `.delete(`, `.rpc(`, `.storage.from(`, or mutation HTTP verbs.

- [ ] **Step 2: Run and verify RED**

Run: `node qa/visual-composer-readonly.test.js`
Expected: FAIL because loaders are absent.

- [ ] **Step 3: Implement read-only selectors**

Reuse the existing public Supabase project URL/publishable key pattern already used by the storefront. Load only published/unarchived products and active variants. Load master-template rows only with `select`. Populate selectors; manual input remains available if reads fail.

- [ ] **Step 4: Run test and verify GREEN**

Run: `node qa/visual-composer-readonly.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add read-only composer catalog lookup`

---

### Task 5: Smoke integration and preview QA gate

**Files:**
- Modify: `.github/workflows/site-smoke.yml`
- Test: all `qa/visual-composer-*.test.js`

**Interfaces:** none.

- [ ] **Step 1: Add composer tests to CI**

Add a workflow step:
```yaml
- name: Validate preview-only visual composer
  shell: bash
  run: |
    set -euo pipefail
    for file in qa/visual-composer-*.test.js; do node "$file"; done
```

- [ ] **Step 2: Run all contracts locally/CI-equivalent**

Run:
```bash
node qa/visual-composer-renderer.test.js
node qa/visual-composer-page.test.js
node qa/visual-composer-readonly.test.js
node scripts/smoke-check.mjs
node scripts/storefront-live-issues-check.mjs
```
Expected: all PASS.

- [ ] **Step 3: Open draft PR**

Title: `Add preview-only Product Visual Composer`
Body must state: preview-only, no production writes, no storefront integration, Cartridge reference-only pending verified blank master.

- [ ] **Step 4: Vercel preview QA**

Verify `visual-composer.html` on:
- mobile ~390×844;
- tablet ~768×1024;
- desktop ~1440×900.

Render at least:
- GHK-CU 50mg Pen;
- Cagrilintide 5mg Pen;
- Cagrilintide 5mg Vial;
- Cartridge reference-only state.

Confirm no clipping, long-name shrink behavior, correct accent selection, square stage, no console errors, and no mutation requests.

- [ ] **Step 5: Stop before Phase 2**

Do not merge/embed into storefront merely because Phase 1 passes. Report Phase 1 result and ask for explicit Phase 2 direction.
