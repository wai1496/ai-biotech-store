# AI BioTech White Clean Core v1 Reintegration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-establish the polished White Clean storefront as AI BioTech Core v1 while preserving the current product/cart/member/checkout, ToyyibPay + DuitNow, EasyParcel, visual-renderer, admin, and QA capabilities.

**Architecture:** Work only on `integration/white-clean-core-v1`, which starts from the latest feature head. Treat commit `ed36e4225c6b453dfd06fab7788e27564bcb4d53` as the visual/reference source, not as a branch to merge wholesale. Restore the White Clean presentation layer in controlled pieces while retaining shared current business logic and staging isolation.

**Tech Stack:** Static HTML/CSS/JavaScript, Supabase JS v2, Vercel Functions/Node.js, ToyyibPay sandbox, EasyParcel integration, Node-based QA scripts.

**Spec:** `docs/superpowers/specs/2026-09-08-white-clean-core-v1-reintegration-design.md`

## Global Constraints

- Production must remain untouched during reintegration.
- No Production merge until explicit final approval.
- No Production database writes from staging.
- Do not blindly run old migration or backup SQL.
- No database rollback is part of this reintegration.
- Orders, invoices, customers, payments, wallet, stock history and audit history must not be reverted by theme work.
- Existing staging isolation controls must remain in place.
- White Clean reference deployment remains untouched as a visual/fallback reference.
- Do not activate live ToyyibPay/DuitNow or live EasyParcel during this plan.
- End-to-end manual payment/shipping testing remains batched for the later QA phase per user direction.

---

### Task 1: Lock the White Clean shell as a regression target

**Files:**
- Create: `qa/white-clean-shell.test.js`
- Reference: `index.html` at commit `ed36e4225c6b453dfd06fab7788e27564bcb4d53`

**Interfaces:**
- Consumes: the approved White Clean DOM contract.
- Produces: a regression test that requires `stagebar`, `site-header`, `hero-inner`, `trust-strip`, `categoryChips`, `productGrid`, `mobileMenu`, and `mobile-sticky-cart`, and rejects the Dark Biotech `SCIENCE.` hero.

- [ ] **Step 1: Write the failing shell regression test**

```js
const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
for(const token of ['STAGING PREVIEW — ISOLATED FROM PRODUCTION WRITES','class="site-header"','class="hero-inner"','class="trust-strip"','id="categoryChips"','id="productGrid"','id="mobileMenu"','class="mobile-sticky-cart"']){
  assert(html.includes(token),`missing White Clean shell token: ${token}`);
}
assert(!html.includes('SCIENCE.<br>PRECISION.'),'Dark Biotech hero must not be the Core v1 shell');
console.log('white-clean-shell: ok');
```

- [ ] **Step 2: Run it and confirm the current dark shell fails**

Run: `node qa/white-clean-shell.test.js`
Expected: FAIL on a White Clean token.

- [ ] **Step 3: Commit the failing regression test**

```bash
git add qa/white-clean-shell.test.js
git commit -m "test: lock White Clean Core v1 shell"
```

### Task 2: Restore the approved White Clean presentation shell without restoring legacy business data

**Files:**
- Modify: `index.html`
- Restore/reference: `clean-store.css`, `storefront-control.css`, `storefront-visual-fix.css`, `mobile-product-reference-fix.css`, `category-visual-accent.css` from the White Clean reference line where absent from the integration branch.
- Test: `qa/white-clean-shell.test.js`

**Interfaces:**
- Consumes: White Clean DOM contract from Task 1.
- Produces: White Clean header/hero/trust/catalog/research/guides/FAQ/footer/mobile structure with no hard-coded catalog records.

- [ ] **Step 1: Replace only the page presentation structure with the approved White Clean structure**

Use the reference `index.html` from commit `ed36e4225c6b453dfd06fab7788e27564bcb4d53` for the DOM structure. Preserve `noindex,nofollow`, staging banner, hero visual slots (`heroVial`, `heroPen`, `heroCartridge`), catalog containers, cart drawer, modal, mobile drawer and sticky cart.

- [ ] **Step 2: Restore the White Clean CSS assets required by that DOM if they are absent on this branch**

Copy the exact reference versions first; do not redesign them in this task. Keep styling separate from payment/shipping logic.

- [ ] **Step 3: Run the shell regression test**

Run: `node qa/white-clean-shell.test.js`
Expected: PASS.

- [ ] **Step 4: Run existing navigation/mobile static checks**

Run: `node qa/storefront-navigation.test.js && node qa/mobile-member-nav.test.js`
Expected: PASS or a precise failure that identifies an interface requiring adaptation in Task 3; do not delete assertions merely to make them green.

- [ ] **Step 5: Commit**

```bash
git add index.html clean-store.css storefront-control.css storefront-visual-fix.css mobile-product-reference-fix.css category-visual-accent.css qa/white-clean-shell.test.js
git commit -m "feat: restore White Clean Core v1 shell"
```

### Task 3: Bind White Clean product cards to the current product, variant, stock, cart, and visual interfaces

**Files:**
- Modify: `clean-store.js`
- Modify only as required for compatibility: `visual-renderer.js`, `cart-flow.js`, `supabase-storefront.js`
- Test: `qa/storefront-runtime-visuals.test.js`
- Test: `qa/cart-continue-shopping.test.js`
- Create: `qa/white-clean-current-core.test.js`

**Interfaces:**
- Consumes: current Supabase product/variant data, current cart storage/flow, current `visual-renderer.js` behavior.
- Produces: White Clean cards whose strength/format selections map to current variant IDs and whose Add to Cart path uses current cart state rather than a legacy staging-only cart implementation.

- [ ] **Step 1: Write a compatibility test**

```js
const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('clean-store.js','utf8');
assert(html.includes('id="productGrid"'));
assert(js.includes('variant') || js.includes('variants'),'White Clean renderer must use variant data');
assert(!js.includes('const PRODUCTS = ['),'catalog must not be a hard-coded product table');
console.log('white-clean-current-core: ok');
```

- [ ] **Step 2: Run it before adaptation**

Run: `node qa/white-clean-current-core.test.js`
Expected: FAIL if the restored reference script still depends on legacy interfaces.

- [ ] **Step 3: Adapt `clean-store.js` to the current data/cart contracts**

Keep White Clean rendering responsibilities in `clean-store.js`, but delegate persistent cart behavior to the current cart flow. Do not duplicate checkout/payment/shipping logic in the theme script. Preserve exact selected variant identity, price, stock, strength and format.

- [ ] **Step 4: Connect current visual renderer outputs to White Clean hero/product image slots**

Use current renderer/assets/fallbacks. Do not reintroduce stale generated image URLs or hard-coded category images.

- [ ] **Step 5: Run product/cart/visual checks**

Run: `node qa/white-clean-current-core.test.js && node qa/storefront-runtime-visuals.test.js && node qa/cart-continue-shopping.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add clean-store.js visual-renderer.js cart-flow.js supabase-storefront.js qa/white-clean-current-core.test.js
git commit -m "feat: bind White Clean catalog to current store core"
```

### Task 4: Reconnect Member Area and current checkout from White Clean

**Files:**
- Modify: `index.html`
- Modify: `clean-store.js`
- Modify only if required: `checkout.html`, `checkout.js`, `member.js`, `cart-flow.js`
- Test: `qa/mobile-member-nav.test.js`
- Test: `qa/checkout-malaysia-address.test.js`
- Create: `qa/white-clean-checkout-routing.test.js`

**Interfaces:**
- Consumes: current `/member.html`, `/checkout.html`, current cart state and pending-payment retry flow.
- Produces: White Clean Account and checkout actions that enter the current shared flows, never a theme-specific checkout.

- [ ] **Step 1: Write routing regression test**

```js
const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('/member.html') || html.includes('openStageAccount()'));
assert(html.includes('/checkout.html') || html.includes('stageCheckout()'));
assert(!html.includes('checkout-white.html'),'White Clean must not fork checkout');
console.log('white-clean-checkout-routing: ok');
```

- [ ] **Step 2: Run the test**

Run: `node qa/white-clean-checkout-routing.test.js`
Expected: PASS only when White Clean routes to shared member/checkout flows.

- [ ] **Step 3: Adapt Account/cart checkout actions to current routes/state**

Ensure mobile and desktop use the same Member Area and checkout entry points. Do not change payment provider logic in this task.

- [ ] **Step 4: Run checkout/member static QA**

Run: `node qa/white-clean-checkout-routing.test.js && node qa/mobile-member-nav.test.js && node qa/checkout-malaysia-address.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html clean-store.js checkout.html checkout.js member.js cart-flow.js qa/white-clean-checkout-routing.test.js
git commit -m "feat: connect White Clean member and checkout flows"
```

### Task 5: Guard ToyyibPay + DuitNow functionality during theme reintegration

**Files:**
- Do not redesign: `lib/toyyibpay.js`, `api/toyyibpay-create.js`, `api/toyyibpay-callback.js`, `api/toyyibpay-reconcile.js`, `api/toyyibpay-duitnow-status.js`, `payment-return.html`, `payment-return.js`
- Test: `qa/toyyibpay-sandbox.test.js`
- Create: `qa/white-clean-payment-preservation.test.js`

**Interfaces:**
- Consumes: shared checkout order ID and ToyyibPay sandbox configuration.
- Produces: a preservation gate proving White Clean work has not removed DuitNow or callback/reconciliation support.

- [ ] **Step 1: Write preservation test**

```js
const fs=require('fs');
const assert=require('assert');
const lib=fs.readFileSync('lib/toyyibpay.js','utf8');
for(const token of ["enableDuitNowQR:'1'",'chargeDuitNowQR','getBillTransactions','persistVerifiedTransaction']) assert(lib.includes(token),`missing ${token}`);
for(const path of ['api/toyyibpay-create.js','api/toyyibpay-callback.js','api/toyyibpay-reconcile.js','api/toyyibpay-duitnow-status.js','payment-return.html','payment-return.js']) assert(fs.existsSync(path),`missing ${path}`);
console.log('white-clean-payment-preservation: ok');
```

- [ ] **Step 2: Run payment static tests**

Run: `node qa/white-clean-payment-preservation.test.js && node qa/toyyibpay-sandbox.test.js`
Expected: PASS. No live payment is attempted.

- [ ] **Step 3: Commit the guard test only if no payment code changes are required**

```bash
git add qa/white-clean-payment-preservation.test.js
git commit -m "test: preserve ToyyibPay and DuitNow through White Clean reintegration"
```

### Task 6: Guard EasyParcel quote and fulfillment functionality during theme reintegration

**Files:**
- Do not redesign: `lib/easyparcel.js`, `lib/easyparcel-fulfillment.js`, `api/easyparcel-rates.js`, `api/easyparcel-quote.js`, `api/easyparcel-book.js`, `api/easyparcel-track.js`, `api/easyparcel-status.js`, `admin-shipping.js`
- Create: `qa/white-clean-easyparcel-preservation.test.js`

**Interfaces:**
- Consumes: shared checkout shipping quote and admin order/fulfillment data.
- Produces: preservation gate proving White Clean work does not remove server-verified shipping, booking, label/tracking, or admin readiness support.

- [ ] **Step 1: Write EasyParcel preservation test**

```js
const fs=require('fs');
const assert=require('assert');
for(const path of ['lib/easyparcel.js','lib/easyparcel-fulfillment.js','api/easyparcel-rates.js','api/easyparcel-quote.js','api/easyparcel-book.js','api/easyparcel-track.js','api/easyparcel-status.js','admin-shipping.js']) assert(fs.existsSync(path),`missing ${path}`);
const checkout=fs.readFileSync('checkout.js','utf8');
assert(/easyparcel|shipping quote|shipping_quote/i.test(checkout),'checkout must retain EasyParcel quote integration');
console.log('white-clean-easyparcel-preservation: ok');
```

- [ ] **Step 2: Run preservation test**

Run: `node qa/white-clean-easyparcel-preservation.test.js`
Expected: PASS. Do not call EasyParcel live/demo APIs in this task.

- [ ] **Step 3: Commit**

```bash
git add qa/white-clean-easyparcel-preservation.test.js
git commit -m "test: preserve EasyParcel through White Clean reintegration"
```

### Task 7: Mobile compatibility and visual regression hardening

**Files:**
- Modify: `mobile-product-reference-fix.css`
- Modify only if needed: `clean-store.css`, `storefront-control.css`, `storefront-visual-fix.css`
- Test: `qa/mobile-member-nav.test.js`
- Test: `qa/storefront-navigation.test.js`
- Test: `qa/storefront-runtime-visuals.test.js`
- Create: `qa/white-clean-mobile-contract.test.js`

**Interfaces:**
- Consumes: White Clean shell and current product renderer.
- Produces: mobile contract for menu, Account, product grid, product images and sticky cart.

- [ ] **Step 1: Write mobile DOM contract test**

```js
const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
for(const token of ['mobile-menu-btn','id="mobileMenu"','openStageAccount()','class="mobile-sticky-cart"','data-cart-count']) assert(html.includes(token),`missing mobile contract ${token}`);
console.log('white-clean-mobile-contract: ok');
```

- [ ] **Step 2: Run the contract and existing mobile tests**

Run: `node qa/white-clean-mobile-contract.test.js && node qa/mobile-member-nav.test.js && node qa/storefront-navigation.test.js`
Expected: PASS after compatibility adaptations.

- [ ] **Step 3: Apply only targeted responsive fixes**

Keep the approved White Clean composition. Fix overflow, image clipping, navigation visibility and sticky-cart overlap without redesigning desktop or changing business logic.

- [ ] **Step 4: Re-run mobile and visual tests**

Run: `node qa/white-clean-mobile-contract.test.js && node qa/mobile-member-nav.test.js && node qa/storefront-navigation.test.js && node qa/storefront-runtime-visuals.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add clean-store.css storefront-control.css storefront-visual-fix.css mobile-product-reference-fix.css qa/white-clean-mobile-contract.test.js
git commit -m "fix: harden White Clean mobile storefront"
```

### Task 8: Reintegration gate and Preview-only handoff

**Files:**
- Modify: `.github/workflows/site-smoke.yml` only if the White Clean route needs to be added to existing smoke coverage.
- Maintain: `qa/white-clean-reintegration-gate.test.js` and all `qa/*.test.js`.
- Maintain: `.github/workflows/site-smoke.yml`, `scripts/verify-preview-offline.mjs`.
- Record: `docs/contracts/preview-database-v1.md` and `preview-database-evidence.json`.
- Record: `.superpowers/sdd/2026-09-08-white-clean-core-v1-reintegration/progress.md` and `final-fix-report.md`.

This checklist restores the truncated Task 8 from the complete binding spec. It does not grant deployment or database authority.

- [x] Preserve White Clean shell and reference assets without deploying or touching the reference deployment.
- [x] Connect shared cart/product validity/currency/renderer and member/checkout routes; destination write locks remain explicit.
- [x] Fail-close every active database client and payment/shipping entrypoint; disable public provider diagnostics.
- [x] Execute actual script-order and failure-path offline tests, all maintained QA, both smoke scripts, syntax checks and `git diff --check`.
- [x] Run all maintained QA in PR CI, including the White Clean and isolation suites.
- [x] Version the intended isolated database contract and clearly record missing installed evidence.
- [ ] Establish the isolated installed schema, RLS/grants and real transactional inventory/wallet/audit behavior with separately authorized evidence.
- [ ] Prove authenticated isolated member -> checkout -> payment return and provider sandbox/demo workflows.
- [ ] Complete Android/reference screenshot QA at 360/390/620/720px, including detail media and Member menu.
- [ ] Verify published policy schema/content and the exact Cartridge guide.
- [ ] Obtain separate approval for any later Preview deployment or unlock. Production approval is a separate final gate.

Current result: **locked Preview code-level checks pass; operational reintegration is not complete**. No deployment, push, environment change, database write/migration, provider call or Production action is part of this final fix wave.
