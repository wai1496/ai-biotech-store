# AI BioTech Master Build Design

## Purpose
Complete the existing AI BioTech website as one coordinated staging-first program. The current GitHub repository, Vercel review branch/deployment, and staging Supabase project remain authoritative. No parallel storefront, admin panel, database, or catalog may be created.

## Governance
- Master coordinator: ChatGPT.
- Source of truth: GitHub requirements registry and implementation history.
- Deployment authority: Vercel staging first.
- Backend authority: Supabase staging project `yjauxyvtrmdriwtmckkl`.
- Engineering method: Superpowers design → plan → TDD → systematic debugging → verification.
- Dependency control: Graph Mode represented by explicit requirement dependencies.
- Independent QA: Testifly/YepCode/QAMap roles where available; owner is not routine tester.
- External technical research: Tavily AI.
- Unavailable helpers (Kora, Webcmd, SonarQube, Endor Labs, QAMap, RAGOps, ShipFrame, get-fable and other named helpers) remain named roles only until their connectors are actually callable. Never report that they executed work when they did not.

## Safety model
1. Work only on staging until all P0/P1 requirements pass.
2. Before destructive DB/storage/auth/catalog/deployment changes: create Git checkpoint, DB/data backup, before-state counts, rollback plan, validate staging target, execute, record after-state, test, rollback on failure.
3. Never silently truncate, reseed, overwrite, delete, or migrate production.
4. Vercel READY means deployed, not tested.
5. Production release requires one final owner approval after a frozen release candidate and QA package.

## Requirement lifecycle
Every requirement receives a stable `REQ-*` ID with owner, reviewer/tester, priority, dependency, acceptance criteria, status, evidence, fix commit, and retest result.

Statuses: `NOT TESTED`, `IMPLEMENTING`, `TESTING`, `FAIL`, `FIXING`, `RETEST`, `PASS`, `LOCKED`, `BLOCKED`, `NEEDS OWNER`.

## Architecture boundaries
### Catalog identity
Maintain exact identity through:
`Product → Strength/Volume → Format → Variant ID → SKU → Price → Stock → Cart → Order → Invoice → Shipment → Tracking → Protocol`.

### Product image resolver
Create one authoritative image pipeline. Remove competing hard-coded master URLs, old cartoon SVG fallbacks, and scripts that repeatedly replace images. Approved variant/custom image wins only when intentionally assigned; otherwise active Vial/Pen/Cartridge master wins; final fallback is a neutral missing-image state.

### Vial
Realistic glass/powder/silver ring remain fixed. Product name never overlaps AI BioTech branding. Strength occupies its dedicated field. Category colour controls approved accents and precise cap/stopper masks only.

### Pen
Realistic master. Name in long outlined field, strength in small field, long-name auto-fit, no unintended overlay border.

### Cartridge
Realistic clean 1:1 master. No product-name/strength overlay unless explicitly re-approved. Same approved master must appear in hero, card, info modal, cart, checkout, and admin preview. No cartoon/legacy fallback.

### Storefront
Professional clean light design; responsive mobile/desktop; featured products controlled by admin; filters/search/variant switching/cart/modal/research/guides/FAQ/contact/track order all functional.

### Admin
Dashboard, products/variants, inventory, categories, media/templates, customers, orders, wallet, payments, shipping/tracking, invoices, vouchers, research, protocols, pages, settings, AI Center, roles/users, activity/system logs, reports, backup/export/restore.

### Auth and roles
Supabase Auth with registration, login/logout, forgot-password/recovery, staging/production redirect separation, Super Admin/Admin/Agent permissions enforced with RLS/backend rules.

### Member area
Profile/company, multiple addresses, orders, invoices, wallet ledger, tracking, and exact purchased-product protocol access.

### Wallet/payment
RM1 = 1 point where approved. Wallet ledger must be auditable. ToyyibPay sandbox/live separation; no live financial side effects during automated staging tests.

### EasyParcel/SPX
EasyParcel is the shipping/fulfilment management layer where account/API capabilities permit. Prefer SPX when available. Required flow: rate lookup → courier selection/SPX preference → shipment creation → AWB/waybill → print/download → tracking number → AI BioTech order update → member tracking. Alternative couriers can remain configurable; manual fallback exists. Automated QA must not buy live postage.

### Research/RAG
Product-linked Research Center/Insights, editable approval workflow, controlled references/source visibility, Tavily-backed current technical research where appropriate, and independent retrieval/grounding evaluation.

### Protocols
Exact purchase entitlement by product/strength/format/order; admin approval before release; private/noindex; Vial/Pen/Cartridge awareness; controlled solution-volume changes; approved dose/frequency/timing locked by default; one-page PDF where required.

### AI Center
AI may research, draft, compare, detect gaps, and suggest. It must not silently perform destructive or financially significant production actions. Preview/approval/audit required for sensitive changes.

## Work packages
- WP-00 Safety & baseline
- WP-01 Requirements registry and dependency graph
- WP-02 Architecture cleanup
- WP-03 Product visual master system
- WP-04 Catalog/data reconciliation
- WP-05 Storefront
- WP-06 Super Admin
- WP-07 Authentication/security
- WP-08 Member Area
- WP-09 Cart/wallet/payment
- WP-10 Orders/invoices
- WP-11 EasyParcel/SPX
- WP-12 Research/RAG
- WP-13 Protocols
- WP-14 AI Center
- WP-15 Logs/reports/security
- WP-16 Complete QA
- WP-17 Release candidate
- WP-18 Production release after owner approval

## Dependency graph
`Safety → Requirements Registry → Data/Auth Baseline → Catalog/Image Resolver → Storefront/Admin → Member/Cart/Wallet → Payment/Order/Invoice → EasyParcel/SPX/Tracking → Research/Protocols → Security/QA → Release Candidate → Owner Approval → Production`.

Downstream work cannot reach PASS while an upstream blocking dependency is FAIL/BLOCKED.

## QA gates
Required: unit tests, integration tests, browser E2E, mobile/desktop viewport tests, visual regression, broken-link/missing-image scans, console/network/API checks, Auth/RLS tests, accessibility, performance, payment/shipping workflow validation, backup/restore proof.

Required viewports: 360×800, 390×844, 412×915, 768×1024, 1366×768, 1440×900.

## Release gate
No P0/P1 unresolved. Freeze commit/migrations. Produce requirements coverage, data integrity, screenshots, automated test report, RLS/security review, dependency/code-quality review, payment/shipping report, unresolved P2 list, backup/restore proof, rollback procedure, and production deployment plan. Ask owner for one final approval only after this gate passes.
