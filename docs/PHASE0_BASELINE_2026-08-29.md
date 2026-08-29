# AI BioTech — Phase 0 Production Baseline

Date: 2026-08-29
Status: READ-ONLY BASELINE / NO PRODUCTION CHANGES

## Purpose
This document freezes the verified starting point before the Master Build begins. Production data, routes and working functions must be preserved. Development proceeds only through staging/preview, controlled service calls, tests, approval and rollback.

## GitHub baseline
- Repository: `wai1496/ai-biotech-store`
- Production branch: `main`
- Baseline commit: `5924c9acf6940fce24a2bda9ed816e2d703dc479`
- Recovery branch: `backup/phase0-2026-08-29`
- Development/staging branch: `staging/master-build`

## Vercel baseline
- Production project: `ai-biotech-store`
- Project ID: `prj_9I2xhrMBBbPL0qUwNdP4YUVC5SWI`
- Production domain: `https://ai-biotech-store.vercel.app`
- Baseline production deployment: `dpl_5sP3QAxsdUpnnysaFqpnbgsRD6a9`
- Baseline deployment commit: `5924c9acf6940fce24a2bda9ed816e2d703dc479`
- Baseline state: READY
- Runtime error scan at baseline: no grouped runtime errors found in the selected 24-hour window.
- Separate existing payment project: `aibiotech-toyyibpay-bridge`

## Supabase baseline
- Project: `Ai BioTech Project`
- Project ref: `yjauxyvtrmdriwtmckkl`
- Region: `ap-south-1`
- Status: ACTIVE_HEALTHY
- PostgreSQL: 17
- Development branches at baseline: 0

### Verified live row counts
- products: 39
- variants: 224
- active variants: 222
- customer_profiles: 2
- orders: 3
- wallet_accounts: 2
- customer_protocols: 3
- protocol_configurations: 9
- protocol_sources: 5
- protocol_versions: 5
- research_entries: 39
- pages: 8
- media_assets: 3
- invoices: 5
- shipments: 2
- inventory_adjustments: 152
- audit_logs: 456
- payments: 0
- vouchers: 0

### Variant baseline
- Vial: 76 total / 76 active
- Cartridge: 72 total / 72 active
- Pen: 76 total / 74 active
- Two inactive Pen records belong to Bacteriostatic Water; active Bacteriostatic Water remains Vial-only.

### Product content gaps verified
All 39 products currently have no product-level:
- main_image_url
- short_description
- long_description
- seo_title
- seo_description

Variant image URLs are populated. This makes product-level content a candidate for a draft-first AI enrichment module, not a destructive catalog migration.

## Current public database functions / RPCs
- `adjust_inventory`
- `adjust_wallet`
- `admin_add_tracking`
- `admin_bulk_update_products`
- `admin_generate_customer_protocol` — SECURITY DEFINER
- `admin_generate_invoice`
- `admin_prepare_customer_protocol`
- `admin_save_product`
- `admin_save_protocol`
- `admin_update_order_status`
- `archive_product`
- `complete_password_change`
- `create_order`
- `get_my_protocol_guides`
- `is_admin`
- `record_customer_protocol_event`
- `restore_product`
- `rls_auto_enable` — SECURITY DEFINER
- `touch_updated_at`

## Supabase Edge Functions
- `admin-user-management` — ACTIVE, JWT verification enabled
- `protocol-reference-fetch` — ACTIVE, JWT verification enabled

## Current important routes
- `/` — storefront
- `/product/:id` — product permalink rewrite to storefront product view
- `/member.html` — member area
- `/checkout.html` — checkout
- `/admin.html` — administration
- `/research-insight.html` — research detail
- `/peptide-calculator.html` — calculator
- `/plain.html` and `/plain` permanently redirect to `/`

## Existing functions that must be preserved
- Live Supabase product and variant catalog
- Category colors
- Exact variant price, stock, SKU and images
- Cart
- Checkout
- Server-side order RPC
- Wallet validation/use
- Member area
- Orders
- Invoice access
- Shipment/tracking access
- Private purchased-variant protocol access
- Protocol PDF renderer and concentration/unit calculations
- Research catalog
- Admin authentication and role check
- Product/variant editor
- Stock audit history
- GitHub smoke checks
- Vercel security headers and route rules
- ToyyibPay bridge project

## Current write surfaces observed
### Controlled RPC/service calls already in use
- Checkout → `create_order`
- Product save → `admin_save_product`
- Inventory adjustment → `adjust_inventory`
- Order status → `admin_update_order_status`
- Protocol save/preparation → protocol RPCs
- Member protocol event → `record_customer_protocol_event`

### Direct-write exception requiring refactor
`admin-enhancements.js` currently archives variants with a direct `variants.update(...)` and writes the audit event separately with `audit_logs.insert(...)`. This must be moved behind one controlled atomic service/RPC so manual admin, AI, plugins and automations cannot diverge.

## Security findings to review before production changes
Supabase advisory baseline reports:
1. `admin_generate_customer_protocol(...)` is a SECURITY DEFINER function callable by the general `authenticated` role. Permission intent must be reviewed before changing it.
2. Leaked-password protection is disabled.
3. Multiple tables have overlapping permissive RLS policies for authenticated users. These are performance/security-review items, not permission to remove policies blindly.

## Storefront design baseline and target
### Current production presentation
The current root storefront still includes the dark/animated biotech presentation and loads `biotech-animated-background.js`.

### Approved target default theme
- Clean professional white/light ecommerce storefront
- Navy/dark-blue professional header/menu
- Controlled electric-blue actions
- Category colors used as accents only
- Fast responsive layout for mobile, tablet, notebook and desktop
- Direct Strength + Format selection on product cards
- Direct Add to Cart
- Professional Product Information panel
- Research Insight link
- Strong search/filter/sort
- Existing Dark Biotech / Animated DNA presentation retained only as an optional theme

## Approved product visual masters
- Vial master
- Cartridge master — tall straight glass cartridge with blue-tinted liquid and dark plunger; do not revert to ampoule-style artwork
- Pen master — horizontal disposable pen

Rules:
1. Real uploaded product image always has priority.
2. If no real image exists, use the matching controlled master placeholder.
3. Product name, strength and category accent populate dynamically at fixed mapped positions.
4. Generated labels must look printed on the object, not like pasted text.

## Product/pricing source of truth
The uploaded Master Price List is the current business reference for Vial / Cartridge / Disposable Pen pricing. Production prices were checked and align with the current master structure for the catalog reviewed. No price migration is authorized by this baseline.

## Protocol rules locked for the Master Build
- Protocols are PRIVATE and map to Product + Strength + Format.
- Locked source-controlled values: phase/time sequence, dose per phase, frequency.
- Adjustable field: solution/final volume.
- Changing final volume recalculates concentration, units and device warnings without changing locked doses/frequency.
- Pen and Cartridge are format-aware; Vial guidance must not be shown where irrelevant.
- Customer PDF uses the approved one-page A4 direction and an order-specific filename.
- No unreviewed protocol auto-publishing.

## System architecture target
All writes from these sources must converge on the same controlled service layer:
- Manual Admin
- Bulk Workspace
- AI Control Center
- Plugins/Features
- Automations/Cron
- External integrations

Required change pipeline:
READ → ANALYSE → PREVIEW → VALIDATE → BACKUP/SNAPSHOT → CONFIRM → EXECUTE → VERIFY → AUDIT → UNDO/ROLLBACK

## Non-negotiable UI / interaction release gates
- Professional, consistent design across the entire storefront, member area, checkout and admin.
- No dead buttons.
- No decorative controls that imply an action but do nothing.
- Every menu item, button, icon, dropdown, form, CTA and link must have a real tested result.
- Important actions must show Ready / Processing / Success or Failure + Retry states.
- Responsive QA must cover phones, tablets, notebooks and desktops.
- No horizontal overflow, broken modal/drawer states, misaligned cards, inconsistent fonts or mixed unfinished UI.

## Button / Route QA requirement
Before any production release, automated and manual checks must verify:
- Internal routes
- Product links
- Menus
- Cart actions
- Variant selectors
- Checkout actions
- Member actions
- Invoice/tracking/protocol links
- Admin create/edit/save/archive/bulk actions
- AI preview/confirm actions
- Plugin controls
- Theme controls
- External links
- Mobile menu/drawers
- Forms and validation

## Phase 0 rule
No production deployment, DDL migration, destructive SQL, seed/reset/truncate, or production table replacement is authorized by this document.

## Next development target after baseline
Build the clean storefront as a staging-only theme/component system while preserving live data and existing working flows. Before any database branch is created, show the Supabase branch cost and obtain approval.
