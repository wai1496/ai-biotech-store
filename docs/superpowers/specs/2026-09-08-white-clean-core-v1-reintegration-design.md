# AI BioTech White Clean Core v1 Reintegration Design

Date: 2026-09-08
Status: Approved design, implementation not started
Branch: `integration/white-clean-core-v1`

## Objective

Re-establish the polished White Clean storefront as the AI BioTech Core v1 reference UI while preserving the latest payment, shipping, checkout, product visual, member, admin, and QA functionality from the current feature branch.

The target is **not** to roll back the project. The target is to combine the proven White Clean presentation layer with the latest business functionality through controlled integration.

## Source References

### White Clean visual/reference source

Reference deployment family: polished staging build from commit `ed36e4225c6b453dfd06fab7788e27564bcb4d53` (`Load true layered vial renderer`).

Reference characteristics:
- `STAGING PREVIEW — ISOLATED FROM PRODUCTION WRITES`
- White/light-blue clinical storefront
- Home / Shop / Research / Guides / FAQ / Contact navigation
- Account + Cart actions
- Precision Peptide Research Products hero
- hero vial / pen / cartridge visual slots
- Cold Chain / Secure & Discreet / Research Use Only / Variant Accurate trust strip
- search, category, format, stock and sort filters
- category chips and desktop category sidebar
- product grid with strength / format selection, live price / stock and direct Add to Cart
- Research Center, Guides, FAQ and footer
- mobile menu and sticky mobile cart
- staging-only `noindex,nofollow`

### Latest functionality source

Current feature head at design approval: `6b149ab006ab14ef7dd335ef7404ebb583d55dad` (`feat: enable DuitNow QR on ToyyibPay sandbox bills`).

Capabilities to preserve:
- ToyyibPay sandbox payment creation, callback, return and reconciliation
- DuitNow QR enablement on the same ToyyibPay hosted payment page
- pending-payment retry flow
- safe failed-payment handling
- EasyParcel rate lookup
- server-verified EasyParcel shipping quote
- courier selection before checkout
- EasyParcel booking, AWB/label and tracking support
- admin shipping controls and setup status
- current checkout changes
- current product visual renderer work
- current member/admin changes
- current QA test coverage

## Architectural Rule

**Presentation must be replaceable; business logic must stay shared.**

White Clean is the Core v1 reference storefront. Dark Biotech remains preserved as a future Theme #2. The reintegration must avoid duplicating cart, checkout, payment, shipping, member or product logic inside theme-specific code.

## Integration Strategy

Use a dedicated branch: `integration/white-clean-core-v1`.

Do not force-merge or reset either divergent history line. Reintegrate by controlled layers.

### Layer 1 — White Clean shell

Restore/preserve the White Clean page structure and styling:
- header and navigation
- hero section
- trust strip
- catalog toolbar
- categories/sidebar
- product grid container
- Research Center entry
- Guides
- FAQ
- footer
- mobile menu
- sticky mobile cart

Success condition: the staging page visually matches the approved polished White Clean reference before latest integrations are reconnected.

### Layer 2 — Shared storefront data and cart wiring

Connect White Clean UI to the latest product, variant, stock and cart interfaces without copying old business logic back into the page.

Requirements:
- exact strength / format selection remains accurate
- price and stock remain sourced from current data layer
- Add to Cart uses current cart logic
- product visual renderer uses current approved assets/fallbacks
- no stale hard-coded product or stock data

### Layer 3 — Member and checkout wiring

Reconnect:
- Account / Member Area entry
- cart-to-checkout flow
- address and Malaysia checkout logic
- pending-payment retry path

White Clean must not have a separate checkout implementation from the current core flow.

### Layer 4 — Payment integration

Preserve the latest ToyyibPay flow:
- same hosted ToyyibPay payment page
- sandbox mode during QA
- FPX/online banking compatibility
- DuitNow QR enabled via current fields
- callback verification
- server-side transaction reconciliation
- correct paid / pending / failed mapping

No live payment activation during reintegration.

### Layer 5 — Shipping integration

Preserve latest EasyParcel functionality:
- rate lookup
- server-verified quote
- courier selection
- quote validation and expiry handling
- booking
- shipment payment where applicable
- AWB / printable label
- tracking
- admin setup/readiness status

No EasyParcel live production cutover during reintegration.

### Layer 6 — Mobile and admin compatibility

Verify White Clean on Android/mobile and preserve latest fixes:
- responsive navigation
- Member Area access on mobile
- quick/direct Add to Cart
- sticky cart
- product image crop/alignment
- modal behavior
- checkout layout

Admin remains functionally independent of theme styling, except for links/actions that must continue to work with the reintegrated storefront.

### Layer 7 — QA only

Testing is intentionally batched later, per user direction. Reintegration must still preserve or extend automated checks, but no claim of end-to-end success is made until the later QA batch.

The later QA batch will cover:
- White Clean navigation and responsive layout
- products / variants / price / stock / image accuracy
- cart
- member area
- checkout
- ToyyibPay FPX / DuitNow success, pending, fail, cancel and retry
- EasyParcel quote, courier selection, booking, AWB, label and tracking
- admin shipping controls
- inventory effects around paid / failed / cancelled orders
- performance / INP and Android usability

## Data and Safety Constraints

- Production must remain untouched during reintegration.
- No Production merge until explicit final approval.
- No Production database writes from staging.
- Do not blindly run old migration or backup SQL.
- No database rollback is part of this reintegration.
- Orders, invoices, customers, payments, wallet, stock history and audit history must not be reverted by theme work.
- Existing staging isolation controls must remain in place.
- White Clean reference deployment remains untouched as a visual/fallback reference.

## Theme Boundary for Future Theme Manager

Core v1 must move toward a shared interface so future themes can change presentation without duplicating business logic.

Shared core responsibilities:
- products / variants / stock
- cart
- member/account
- checkout
- orders
- payment adapters
- shipping adapters
- invoices
- wallet
- audit/history

Theme responsibilities:
- layout
- typography
- colors
- spacing
- hero composition
- product-card presentation
- navigation presentation
- footer presentation
- optional visual effects

White Clean becomes Theme #1 / reference implementation after Core v1 is stable. Dark Biotech becomes Theme #2 later.

## Out of Scope for This Reintegration

Do not build these yet as part of the White Clean reintegration:
- full Theme Manager UI
- plugin ZIP installer
- plugin permission/manifest system
- Safe Mode / Protection Center
- Snapshot Manager
- database backup/recovery UI
- automatic provider failover
- live ToyyibPay/DuitNow activation
- live EasyParcel activation

These remain roadmap items after Core v1 stabilization.

## Release Gate

Reintegration is considered ready for later QA only when:
1. White Clean visual structure is restored on the integration branch.
2. Current product/cart/member/checkout integrations are connected without duplicated legacy logic.
3. Current ToyyibPay/DuitNow and EasyParcel code remains present and callable.
4. Production has not been changed.
5. Existing automated checks still run or are updated for the White Clean structure.
6. No user/business data has been rolled back or overwritten.

Final Production release remains a separate explicit approval after full QA.
