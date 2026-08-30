# AI BioTech Master Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the existing AI BioTech website safely in staging, with all approved storefront, admin, member, commerce, shipping, research, protocol, AI, security and QA requirements implemented and independently verified before production release.

**Architecture:** Keep the existing GitHub repository, Vercel staging deployment and Supabase staging project as the only authoritative application. Use GitHub as source of truth, Supabase for data/auth/storage, Vercel for staging/runtime, and a requirement-to-test registry plus dependency graph so every requirement has one owner, one tester and a release gate. Production remains frozen until all P0/P1 requirements pass.

**Tech Stack:** GitHub, Vercel, Supabase/Postgres/Auth/Storage, browser JavaScript/CSS/HTML, Playwright/Testifly-style E2E, YepCode-style custom integration scripts, EasyParcel/SPX shipping integration, ToyyibPay, RAG/research tooling, static/security analysis.

**Spec:** GitHub Issue #4 — MASTER COMPLETION TASK and the approved combined requirements registry in this project conversation.

## Global Constraints

- Work only on `review/master-build-20260829` until release approval.
- Staging Vercel alias: `https://ai-biotech-store-git-review-master-build-20260829-rk-cd1c.vercel.app/`.
- Staging Supabase project: `yjauxyvtrmdriwtmckkl`.
- Production must not be modified before release approval.
- Attached `AI_BioTech_Master_Price_List (2).pdf` is the designated price source of truth when reconciling approved prices.
- Maintain exact identity: Product → Strength/Volume → Format → Variant ID → SKU → Price → Stock → Cart → Order → Invoice → Shipment → Tracking → Protocol.
- No requirement is complete because code compiled, a commit exists or Vercel is READY. Completion requires acceptance-test evidence.
- Valid requirement states: NOT TESTED / IMPLEMENTING / TESTING / FAIL / FIXING / RETEST / PASS / LOCKED / BLOCKED / NEEDS OWNER.
- No P0/P1 requirement may remain unresolved at production release.

---

### Task 1: Safety Baseline and Rollback Inventory

**Files:**
- Create: `docs/release/2026-08-30-baseline.md`
- Create: `docs/release/2026-08-30-supabase-baseline.md`
- Create: `docs/release/2026-08-30-rollback.md`

**Interfaces:**
- Consumes: current Git branch, Vercel staging deployment metadata, Supabase staging schema/data counts.
- Produces: immutable baseline identifiers and rollback procedure required by every later task.

- [ ] Record current branch HEAD SHA and Vercel staging deployment ID/URL.
- [ ] Record row counts for critical Supabase tables: products, variants, categories, customers/profiles, orders/order_items, wallet tables, invoices, protocols, media_templates, admin_users, activity/system logs where present.
- [ ] Record `catalog-media` storage objects and current master-image records.
- [ ] Record current migrations/schema version and relevant RLS policies.
- [ ] Save baseline reports under `docs/release/` and commit.
- [ ] Verify rollback instructions can restore Git branch, database records/migrations and master-image records without touching production.

Acceptance: baseline reports exist, identify staging explicitly, include before-state counts, current HEAD/deployment and rollback steps.

---

### Task 2: Requirements Registry and Dependency Graph

**Files:**
- Create: `docs/requirements/registry.md`
- Create: `docs/requirements/dependency-graph.md`
- Create: `docs/requirements/qa-matrix.md`

**Interfaces:**
- Produces requirement IDs used by implementation, QA and release reports.

- [ ] Convert the complete approved requirements into permanent IDs grouped by VIS, CAT, STO, ADM, AUTH, MEM, WAL, PAY, ORD, SHIP, INV, RES, RAG, PRO, AI, SEC, OPS, QA and REL.
- [ ] For each requirement include owner, reviewer, independent tester, dependency, priority, acceptance criteria and current status.
- [ ] Create dependency graph enforcing key chains such as Variant → Cart → Order → Invoice → Shipment → Tracking and Order+Variant → Protocol entitlement.
- [ ] Create QA matrix linking every P0/P1 REQ ID to one or more test cases/evidence targets.
- [ ] Commit registry before additional feature edits.

Acceptance: every approved requirement is traceable to an ID, owner, tester and acceptance gate.

---

### Task 3: Architecture Audit and Competing Logic Removal Plan

**Files:**
- Inspect/modify as required: `clean-store.js`, `uploaded-master-renderer.js`, `uploaded-master-renderer.css`, `storefront-visual-fix.js`, `storefront-control.js`, `mobile-product-reference-fix.css`, `category-visual-accent.css`, `vial-layered-renderer.js`, related HTML/CSS/JS.
- Create: `docs/architecture/visual-pipeline-audit.md`

**Interfaces:**
- Produces one documented visual resolver contract.

- [ ] Search repo for all product-image assignments, hard-coded master URLs, legacy placeholder SVGs and `variants.image_url` precedence.
- [ ] Document all competing writers to hero/card/modal/cart/checkout visuals.
- [ ] Define one resolver contract `resolveProductVisual({product, variant, format, context})` with explicit approved custom-image flag, active format master, neutral fallback priority.
- [ ] Add failing tests for resolver priority and cache/version behavior before implementation.
- [ ] Remove/deactivate competing runtime overrides only after tests capture desired behavior.
- [ ] Verify no first-paint cartoon/legacy asset flash remains.

Acceptance: one authoritative resolver is used across contexts and legacy sources cannot silently outrank it.

---

### Task 4: Vial, Pen and Cartridge Master System

**Files:**
- Modify visual resolver and master renderer files.
- Create precise Vial cap/stopper masks/assets as needed under `assets/masters/`.
- Keep approved Cartridge master and raster fallback under `assets/masters/`.
- Tests under existing/new test directories.

**Interfaces:**
- Consumes active `media_templates` records and category colors.
- Produces consistent visuals for hero/card/modal/cart/checkout/admin preview.

- [ ] Cartridge: verify realistic 1:1 transparent master, no dynamic product/strength overlay, remove all cartoon fallbacks, add PNG fallback if required.
- [ ] Vial: position product name below logo/tagline; strength badge below name; derive exact cap/stopper masks from real master; preserve silver/glass/reflections/powder.
- [ ] Pen: keep realistic master; fit product name within long field and strength within white field; auto-fit long names.
- [ ] Enforce category mapping: Orange Metabolism, Green Tissue, Red Healing, Purple Brain, Pink Sexual, Gold Longevity, Yellow GH, Light Blue Special Blend, Blue Solvent.
- [ ] Add visual assertions for six+ category colors and all three formats.
- [ ] Verify `object-fit: contain`, no crop/stretch, no badge overlap and consistent perceived size.

Acceptance: all three formats pass visual regression at required viewports with no legacy/cartoon asset, logo overlap or Vial fake neck band.

---

### Task 5: Catalog, Price and Stock Reconciliation

**Files:**
- Create: `docs/release/catalog-audit.md`
- Create/update safe migration or admin script only if discrepancies require changes.
- Add reconciliation tests/scripts.

**Interfaces:**
- Consumes attached master price list and staging catalog.
- Produces verified product/variant/price/stock report.

- [ ] Export active products/variants with product, strength/volume, format, SKU, price, stock, featured, category and image metadata.
- [ ] Reconcile every active variant against the authoritative master price list.
- [ ] Report Correct / Corrected / Missing from Site / Present but Absent from Source / Ambiguous.
- [ ] Do not invent prices or reapply obsolete multiplier rules where explicit prices exist.
- [ ] Verify Cartridge exclusions and Bacteriostatic Water Volume handling.
- [ ] Verify no null SKU for active variants, no negative stock and reserved/available stock logic.
- [ ] If updates are required, preview before/after changes, apply only to staging, rerun reconciliation and record result.

Acceptance: all P0 catalog inconsistencies resolved or explicitly marked NEEDS OWNER.

---

### Task 6: Storefront Completion

**Files:**
- Existing storefront HTML/CSS/JS files.
- Browser E2E tests.

**Interfaces:**
- Consumes validated catalog + visual resolver.
- Produces responsive shopping experience.

- [ ] Light professional homepage/hero remains readable and performant.
- [ ] Featured Products uses admin `featured` state.
- [ ] Search/category/format/stock/sort filters work together.
- [ ] Strength selection updates compatible formats, SKU, price, stock and image.
- [ ] Format selection updates correct visual immediately.
- [ ] Sold-out variants disable Add to Cart.
- [ ] Product info modal uses correct variant and responsive white layout.
- [ ] Research Insight navigation/open/close works.
- [ ] Cart uses exact selected variant, correct image, limits, totals and persistence.
- [ ] Mobile sticky cart never covers primary controls.
- [ ] Home/Shop/Research/Guides/FAQ/Contact/Account/Cart/Track Order links all work.

Acceptance: storefront E2E and visual tests pass on all target viewports.

---

### Task 7: Super Admin Completion

**Files:**
- Existing admin HTML/CSS/JS plus Supabase functions/RPC/migrations where required.
- Admin E2E tests.

**Interfaces:**
- Produces full Super Admin operational surface.

- [ ] Complete Dashboard, Products/Variants, Inventory, Categories, Media/Templates, Customers, Orders, Wallet, Payments, Shipping/Tracking, Invoices, Vouchers, Research, Protocols, Pages, Settings, AI Center, Users/Roles, Activity Logs, System Logs, Reports, Backup/Export/Restore.
- [ ] Product CRUD supports nested strength/format variants, featured state, archive/delete confirmation and audit.
- [ ] Stock-change modal shows product/strength/format/SKU/previous/new/difference/reason/note and opens only when quantity changes.
- [ ] Bulk inventory tools prevent negative stock and require confirmation/audit.
- [ ] Mobile admin navigation/forms/tables/modals remain usable.
- [ ] Every save operation shows explicit success/error state.
- [ ] Replace or secure staging-only temporary master uploader through Admin → Media/Templates.

Acceptance: all admin P0/P1 workflows pass independent browser tests and permission checks.

---

### Task 8: Authentication, Roles and Security Controls

**Files:**
- Auth/admin/member JS.
- Supabase RLS/RPC migrations.
- Security tests.

**Interfaces:**
- Produces authenticated roles: super_admin/admin/agent/member and protected resources.

- [ ] Registration/login/logout/forgot-password/recovery flows work in staging.
- [ ] Recovery uses same-origin staging redirect and forces password-selection screen.
- [ ] Handle expired/used recovery link and rate-limit errors clearly.
- [ ] Enforce super_admin/admin/agent permissions through RLS/RPC, not UI hiding.
- [ ] Ensure member can access only own customer/order/wallet/invoice/protocol data.
- [ ] Verify public approved media read access and restricted master uploads.
- [ ] Verify no service-role keys or secrets in frontend/repo.
- [ ] Validate uploaded image/SVG MIME, size, dimensions and malicious content controls.

Acceptance: guest/member/admin/super-admin RLS matrix passes with no cross-account access.

---

### Task 9: Member Area

**Files:**
- Existing member/account frontend and Supabase queries/RPC.
- E2E tests.

- [ ] Profile, company details and multiple addresses.
- [ ] Order history and details.
- [ ] Invoice view/download.
- [ ] Wallet balance and transaction history.
- [ ] Tracking view.
- [ ] Entitled protocol downloads only.
- [ ] Account security/logout/recovery.

Acceptance: member E2E fixture cannot access another member's data and sees correct exact-variant records.

---

### Task 10: Wallet, Checkout and ToyyibPay

**Files:**
- Checkout/payment backend/frontend.
- Integration tests.

- [ ] Implement/verify RM1 = 1 point business rule where applicable.
- [ ] Wallet ledger records every credit/debit/admin adjustment with reason and linked order/payment.
- [ ] Checkout preserves exact selected variant and address.
- [ ] ToyyibPay sandbox/live configuration is environment-safe and secrets server-side.
- [ ] Test payment success, failure, cancel and retry paths with staging fixtures.
- [ ] COD remains disabled unless explicitly enabled.

Acceptance: no staging test creates unintended production payment/order writes; totals reconcile exactly.

---

### Task 11: Orders and Invoices

**Files:**
- Orders/invoices frontend/backend/RPC/templates/tests.

- [ ] Order records exact variants, quantities, prices, shipping, discount, wallet and payment state.
- [ ] Controlled status transitions/dropdowns.
- [ ] Invoice auto-generation and member/admin access.
- [ ] Invoice totals exactly match order totals.
- [ ] Archive/delete behavior follows audit rules.

Acceptance: checkout fixture generates correct order+invoice and audit trail.

---

### Task 12: EasyParcel + SPX Fulfilment

**Files:**
- Create server-side shipping integration module(s).
- Create admin shipping UI integration.
- Integration tests and docs.

**Interfaces:**
- Consumes eligible paid/approved order + parcel/address data.
- Produces EasyParcel shipment, courier, AWB/waybill, tracking and order status updates.

- [ ] Keep EasyParcel credentials server-side.
- [ ] Implement rate lookup and courier selection with SPX preference when API/account supports it.
- [ ] Support configurable J&T/DHL alternatives and manual fallback; do not auto-enable GDEX.
- [ ] Create shipment only after explicit admin action/approved workflow.
- [ ] Persist courier, shipping fee, tracking/AWB and shipment provider IDs.
- [ ] Generate/download/print waybill; support bulk printing where EasyParcel supports it.
- [ ] Sync/refresh tracking status where supported.
- [ ] Update member tracking view.
- [ ] Never mark order Shipped until valid shipment/tracking creation succeeds.
- [ ] Automated tests must use demo/non-live flows or mocks and must not buy unintended live postage.

Acceptance: staging fixture can progress Order → EasyParcel/SPX-preferred shipment → waybill → tracking without production side effects.

---

### Task 13: Research Center, Tavily-backed Source Discovery and RAG QA

**Files:**
- Research data/admin/front-end modules.
- RAG evaluation fixtures.

- [ ] Every active catalog compound maps to correct Research Insight.
- [ ] Research content is sufficiently complete and editable/approvable in admin.
- [ ] Tavily/current-source discovery is used only for research/verification; fetched material is reviewed before publication.
- [ ] Public research remains separate from private protocols.
- [ ] RAG tests cover source grounding, retrieval misses and hallucination resistance.
- [ ] Mobile Research Center navigation and close behavior passes.

Acceptance: no broken compound mapping and RAG evaluation meets defined grounding thresholds.

---

### Task 14: Peptide AI Assistant and AI Center

**Files:**
- AI assistant/admin AI modules.
- Safety/approval workflow tests.

- [ ] Friendly multilingual interaction; understand imperfect English/Malay/Chinese phrasing.
- [ ] Ask preferred language where appropriate.
- [ ] AI Center supports drafting, research assistance, product auto-fill suggestions, promotion/content assistance, catalog gap detection and protocol drafting.
- [ ] All financially significant/destructive changes require preview + human approval.
- [ ] AI must not silently change prices, stock, orders, production config or release protocols.

Acceptance: approval guardrails block unsafe silent writes and assistant responses remain grounded in approved sources/data.

---

### Task 15: Protocol System and PDF Workflow

**Files:**
- Protocol templates/management/frontend/backend/PDF generation/tests.

- [ ] Entitlement matches exact product + strength + format + order.
- [ ] Vial, Pen and Cartridge content is format-aware.
- [ ] Admin can adjust solution mL where allowed without silently altering approved locked dose/timing sequence.
- [ ] Explicit override path is audited.
- [ ] One-page A4 target where specified.
- [ ] Admin approval required before member release.
- [ ] Filename follows Brand + Product + Order ID.
- [ ] Private protocols are not publicly indexed or accessible without entitlement.

Acceptance: test fixtures prove allowed member access and denied non-entitled access; PDF output fits required format.

---

### Task 16: Email, Maintenance, Affiliate/Analytics and Store Settings

**Files:**
- Store settings/admin/member notification modules.
- Supabase tables/RLS where required.

- [ ] Configure registration/recovery/order/tracking/protocol/invoice email flows with environment-safe secrets and failure logs.
- [ ] Maintenance mode with optional passcode/admin bypass and audit.
- [ ] Store settings include currency RM, shipping/payment/wallet toggles, free-shipping threshold and legal/contact settings.
- [ ] Affiliate/referral source/cookie tracking implemented only with appropriate privacy disclosure.
- [ ] Visitor analytics/referrer handling remains privacy-conscious and admin-only.

Acceptance: staging notification/configuration tests pass without exposing secrets or locking out Super Admin.

---

### Task 17: Reports, Audit Logs and System Logs

**Files:**
- Reports/logging modules and queries.

- [ ] Sales/order/customer/inventory/low-stock/wallet/payment/shipping/voucher/protocol/research reports.
- [ ] Customer export.
- [ ] Audit price, stock, product, order, tracking, wallet, roles, media, protocol approval and configuration changes with user/time and before/after where appropriate.
- [ ] System logs capture application/API/payment/shipping/email/auth/database failures meaningfully.

Acceptance: sample staging actions create searchable, attributable log/report entries.

---

### Task 18: Static Analysis, Dependency Security and Engineering Guardrails

**Files:**
- CI config, dependency config and remediation commits.

- [ ] Add/enable static code checks for bugs, duplication and maintainability.
- [ ] Audit dependency vulnerabilities/supply-chain risk.
- [ ] Scan repository for secrets.
- [ ] Remove dead/duplicate legacy code discovered during architecture cleanup.
- [ ] Enforce review/test guardrails before release branch merge.

Acceptance: no unresolved critical/high release-blocking security finding without explicit documented exception.

---

### Task 19: Independent End-to-End and Visual QA

**Files:**
- E2E test suite.
- Visual baselines/results.
- `docs/release/final-qa.md`.

- [ ] Run browser tests at 360×800, 390×844, 412×915, 768×1024, 1366×768 and 1440×900.
- [ ] Test all three formats and six+ category colors.
- [ ] Test storefront, cart, member, admin, auth, wallet, checkout, orders, invoices, shipping, research and protocols.
- [ ] Scan broken links, missing images, 404/500s, console errors and network failures.
- [ ] Accessibility checks: keyboard, focus, labels, dialog behavior, contrast, alt text.
- [ ] Performance checks with Lighthouse mobile target ≥80 Performance, ≥90 Accessibility, ≥90 Best Practices, ≥85 SEO unless documented blocker.
- [ ] Every failure maps back to REQ ID and returns to FIXING → RETEST.

Acceptance: no P0/P1 failure remains and final QA report contains evidence.

---

### Task 20: Release Candidate, Final Approval and Production

**Files:**
- Create: `docs/release/release-candidate.md`
- Create: `docs/release/production-runbook.md`

- [ ] Freeze release commit and migration inventory.
- [ ] Verify latest baseline/backup and tested rollback.
- [ ] Produce requirement coverage matrix, data-integrity report, visual screenshots, automated-test results, RLS/security report, code/dependency report, payment/shipping report, unresolved P2 list and rollback plan.
- [ ] Request one owner approval for the complete release candidate.
- [ ] Only after approval, deploy production.
- [ ] Run production smoke test for homepage/assets/auth/catalog/cart/checkout entry points without creating fake transactions.
- [ ] Keep immediate rollback path ready and document release outcome.

Acceptance: production release occurs only after explicit owner approval and post-deploy smoke test passes.
