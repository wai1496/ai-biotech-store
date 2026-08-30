# AI BioTech Requirements Registry

This registry is the permanent source of truth for the master build. No requirement is complete merely because code was committed or Vercel reports `READY`.

Valid states: `NOT TESTED`, `IMPLEMENTING`, `TESTING`, `FAIL`, `FIXING`, `RETEST`, `PASS`, `LOCKED`, `BLOCKED`, `NEEDS OWNER`.

Sources include the approved project conversation, GitHub Issue #4, `Continue Vercel Project.txt`, the uploaded master price list, approved visual references and the one-page Retatrutide Pen protocol example.

## A. Operations, safety and environment

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-OPS-001 | Staging-first execution; production frozen until final approval | P0 | ChatGPT/GitHub/Vercel | Release Manager | none | No production code/data/payment/postage write before approved release | PASS |
| REQ-OPS-002 | Immutable Git/Vercel/Supabase before-state and rollback procedure | P0 | GitHub/Supabase/Vercel | Release Manager | REQ-OPS-001 | Baseline docs, rollback branch and deployment reference exist | PASS |
| REQ-OPS-003 | One implementation owner and one independent tester per subsystem | P0 | ChatGPT/Graph Mode | QAMap role | REQ-OPS-001 | Every P0/P1 item has owner, tester and gate | PASS |
| REQ-OPS-004 | No destructive truncate/reseed/delete/migration without snapshot, preview and rollback | P0 | All implementers | Guardrail QA | REQ-OPS-002 | Change procedure blocks unscoped destructive operations | IMPLEMENTING |
| REQ-OPS-005 | Exact requirement IDs, status, evidence, fix commit and retest history | P0 | GitHub/QAMap role | Release Manager | REQ-OPS-003 | Registry and QA matrix stay current | IMPLEMENTING |
| REQ-OPS-006 | Owner is not routine QA; ask only for business decisions, credentials, destructive production approval or final RC | P1 | ChatGPT | Owner | REQ-OPS-003 | Automated/independent QA precedes owner review | IMPLEMENTING |
| REQ-OPS-007 | Plugins/themes/demos/AI experiments isolated from authoritative store | P1 | GitHub/Vercel | Architecture QA | REQ-ENV-001 | Experimental modules cannot override core store | NOT TESTED |
| REQ-OPS-008 | Background status watch reports meaningful blockers/milestones without false progress claims | P2 | Create Task/GitHub | Release Manager | REQ-OPS-005 | Status reports are evidence-based and non-spammy | BLOCKED |

## B. Environment and architecture

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-ENV-001 | One authoritative staging Supabase project used by storefront, admin, APIs and tests | P0 | GitHub/Supabase | Integration QA | REQ-OPS-002 | No cross-project runtime read/write except documented migration/import | IMPLEMENTING |
| REQ-ENV-002 | Protect `yjauxyvtrmdriwtmckkl` until formally classified; use no accidental writes | P0 | Supabase/Guardrails | Release Manager | REQ-OPS-002 | All code paths identify target project before writes | IMPLEMENTING |
| REQ-ENV-003 | Resolve review-branch split: storefront points to `rpnw...` while admin/media code references `yjaux...` | P0 | GitHub/Supabase | Integration QA | REQ-ENV-001 | Shared config and environment test pass | FAIL |
| REQ-ENV-004 | Central configuration module for environment, Supabase, feature flags and API endpoints | P0 | GitHub | Unit/Integration QA | REQ-ENV-001 | No hard-coded project IDs scattered across runtime files | NOT TESTED |
| REQ-ENV-005 | Staging and production secrets/configuration separated | P0 | Vercel/Supabase | Security QA | REQ-ENV-004 | Preview cannot use production payment/shipping credentials | NOT TESTED |
| REQ-ENV-006 | Safe configuration diagnostics page/status endpoint without exposing secrets | P1 | Vercel/GitHub | Testifly | REQ-ENV-004 | Admin can see readiness and environment identity | NOT TESTED |

## C. Product visual masters

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-VIS-001 | One authoritative `resolveProductVisual()` pipeline | P0 | GitHub frontend | Unit/Visual QA | REQ-ENV-004 | Hero/card/modal/cart/checkout/admin preview use same resolver | FAIL |
| REQ-VIS-002 | Explicit approved custom image can override master only through dedicated flag | P1 | GitHub/Supabase | Data/Visual QA | REQ-VIS-001 | Legacy `variant.image_url` cannot silently outrank master | NOT TESTED |
| REQ-VIS-003 | No first-paint cartoon/old master flash | P0 | GitHub/Vercel | Testifly | REQ-VIS-001 | Skeleton/approved visual only during load | FAIL |
| REQ-VIS-004 | Vial uses one realistic reusable master, not product-specific image files | P0 | Visual implementation | Visual QA | REQ-VIS-001 | All vial products derive from one approved system | FAIL |
| REQ-VIS-005 | Vial product name below logo/tagline without overlap | P0 | Visual implementation | Visual QA | REQ-VIS-004 | Long/short names remain inside approved area | FAIL |
| REQ-VIS-006 | Vial strength in separate category-coloured rounded badge | P0 | Visual implementation | Visual QA | REQ-VIS-004 | Strength updates with selected variant and does not cover logo | FAIL |
| REQ-VIS-007 | Vial cap and stopper use precise category-colour masks; no fake neck band | P0 | Visual implementation | Pixel-diff QA | REQ-VIS-004 | Silver/glass/reflections/powder unchanged across colours | FAIL |
| REQ-VIS-008 | Pen name in long orange field and strength in white field with auto-fit | P0 | Visual implementation | Visual QA | REQ-VIS-001 | Text remains inside fields at all viewports | TESTING |
| REQ-VIS-009 | Cartridge uses realistic approved 1:1 transparent master; no dynamic overlay | P0 | Visual implementation | Visual QA | REQ-VIS-001 | No cartoon/broken image in any context | FAIL |
| REQ-VIS-010 | Master version/hash cache busting and correct SVG/PNG MIME/fallback | P0 | GitHub/Vercel/Supabase | Network QA | REQ-VIS-001 | New master appears immediately; no 404/bad MIME | FAIL |
| REQ-VIS-011 | 1:1 media frames, `object-fit: contain`, no border/crop/stretch/badge overlap | P1 | Frontend | Visual QA | REQ-VIS-001 | All formats align consistently on target viewports | RETEST |
| REQ-VIS-012 | Category colours: Orange Metabolism, Green Tissue, Red Healing, Purple Brain, Pink Sexual, Gold Longevity, Yellow GH, Light Blue Special Blend, Blue Solvent | P1 | Supabase/Frontend | Data/Visual QA | REQ-CAT-001 | DB-driven mapping matches approved palette | NOT TESTED |

## D. Catalog, variants, pricing and inventory

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-CAT-001 | Exact identity: Product→Strength/Volume→Format→Variant ID→SKU→Price→Stock | P0 | Supabase/catalog | YepCode/data QA | REQ-ENV-001 | Every active variant is valid and traceable | NOT TESTED |
| REQ-CAT-002 | Same variant identity preserved through Cart→Order→Invoice→Shipment→Tracking→Protocol | P0 | Commerce/Supabase | E2E QA | REQ-CAT-001 | Fixture retains identical variant ID end-to-end | NOT TESTED |
| REQ-CAT-003 | One product contains nested strengths and Vial/Pen/Cartridge formats | P1 | Catalog | Data/E2E QA | REQ-CAT-001 | No duplicate product required per format | NOT TESTED |
| REQ-CAT-004 | Strength switch recalculates compatible formats | P0 | Frontend/catalog | E2E QA | REQ-CAT-001 | Invalid format disappears/changes safely | NOT TESTED |
| REQ-CAT-005 | Format switch updates image, SKU, price and stock immediately | P0 | Frontend/catalog | E2E QA | REQ-CAT-001, REQ-VIS-001 | Exact selected variant is displayed | NOT TESTED |
| REQ-CAT-006 | Bacteriostatic Water uses Volume and approved format rules | P1 | Catalog | E2E QA | REQ-CAT-001 | UI/data use mL, not mg | NOT TESTED |
| REQ-CAT-007 | Cartridge exclusions respected, including Bacteriostatic Water and AOD-9604 unless later approved | P1 | Catalog | Data QA | REQ-CAT-001 | No excluded Cartridge variant is purchasable | NOT TESTED |
| REQ-CAT-008 | Uploaded master price list is authoritative; no invented or obsolete multiplier prices | P0 | Catalog/Supabase | Price audit | REQ-CAT-001 | Full Correct/Corrected/Missing/Ambiguous report | NOT TESTED |
| REQ-CAT-009 | Remove obsolete `-75` pricing copy/rules | P1 | GitHub/Supabase | Search/data QA | REQ-CAT-008 | No active UI/data rule contains obsolete text | NOT TESTED |
| REQ-CAT-010 | No active null SKU, missing price, missing format/strength or invalid category | P0 | Supabase | Data QA | REQ-CAT-001 | Integrity query returns zero blockers | NOT TESTED |
| REQ-CAT-011 | Stock cannot become negative; reserved and available stock remain consistent | P0 | Supabase/inventory | Data QA | REQ-CAT-001 | Invariants/RPC tests pass | NOT TESTED |
| REQ-CAT-012 | Stock audit records previous, new, difference, reason, note, actor and time | P1 | Supabase/admin | E2E/Data QA | REQ-CAT-011 | Every adjustment produces attributable history | NOT TESTED |
| REQ-CAT-013 | Featured Products controlled only by admin `featured` state | P1 | Supabase/storefront | E2E QA | REQ-CAT-001 | Homepage list equals DB state | NOT TESTED |
| REQ-CAT-014 | Customer and catalog exports available without exposing unauthorized data | P1 | Admin/reporting | Security/Data QA | REQ-AUTH-002 | Export scope and counts verified | NOT TESTED |

## E. Storefront and cart

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-STO-001 | Clean light professional biotech storefront; no dark/cartoon baseline | P1 | GitHub frontend | Visual QA | REQ-VIS-001 | Approved responsive baseline passes | TESTING |
| REQ-STO-002 | Responsive header/menu/search/account/cart and all navigation links | P1 | Frontend | Testifly | REQ-STO-001 | No dead link or horizontal overflow | NOT TESTED |
| REQ-STO-003 | Hero uses approved realistic masters and remains readable/performance-safe | P1 | Frontend | Visual/Performance QA | REQ-VIS-001 | Correct assets and no mobile lag | FAIL |
| REQ-STO-004 | Search, category, format, stock and sort filters work together | P1 | Frontend | E2E QA | REQ-CAT-001 | Combination tests return expected products | NOT TESTED |
| REQ-STO-005 | Product cards show exact selected variant, price and availability | P0 | Frontend | E2E QA | REQ-CAT-004, REQ-CAT-005 | Card state matches DB record | NOT TESTED |
| REQ-STO-006 | Sold-out variants clearly disabled | P1 | Frontend | E2E QA | REQ-CAT-011 | Add to Cart cannot bypass stock | NOT TESTED |
| REQ-STO-007 | Product information modal matches clean white reference and exact variant | P1 | Frontend | Visual/E2E QA | REQ-STO-005 | Image near top; no blank gap/overflow; closes correctly | RETEST |
| REQ-STO-008 | Research Insight opens correct compound and closes/navigates correctly | P1 | Frontend/research | E2E QA | REQ-RES-001 | No stuck popup/dead navigation | NOT TESTED |
| REQ-STO-009 | Cart adds exact selected variant, correct image, quantity limits and totals | P0 | Frontend/commerce | E2E QA | REQ-CAT-002 | Cart line and total reconcile | NOT TESTED |
| REQ-STO-010 | Sticky View Cart does not cover controls/content | P1 | Frontend | Visual QA | REQ-STO-009 | All primary controls remain usable | RETEST |
| REQ-STO-011 | Guides/FAQ/Contact/Terms/Privacy/Track Order pages complete and linked | P1 | Frontend/content | Link/E2E QA | REQ-STO-002 | All public pages load and function | NOT TESTED |
| REQ-STO-012 | Cold-chain/receiving copy avoids unsupported exact-temperature claims | P1 | Content | Content QA | REQ-STO-011 | Approved wording appears consistently | NOT TESTED |

## F. Authentication, roles and security boundaries

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-AUTH-001 | Member registration, login, logout and recovery | P0 | Supabase/Auth | Testifly | REQ-ENV-001 | Complete staging flow passes | NOT TESTED |
| REQ-AUTH-002 | Super Admin, Admin, Agent and Member roles enforced server-side | P0 | Supabase | Security QA | REQ-AUTH-001 | RLS/RPC role matrix passes | NOT TESTED |
| REQ-AUTH-003 | Password reset returns to same environment and forces new-password screen | P0 | Supabase/GitHub | E2E QA | REQ-ENV-004 | Newest recovery link completes correctly | FAIL |
| REQ-AUTH-004 | Clear expired/used/rate-limited recovery states | P1 | Auth UX | E2E QA | REQ-AUTH-003 | User receives actionable status | FAIL |
| REQ-AUTH-005 | Unauthorized admin is denied without creating admin access | P0 | Supabase | Security QA | REQ-AUTH-002 | Unauthorized fixture cannot enter admin | NOT TESTED |
| REQ-AUTH-006 | Member can access only own profile/address/orders/wallet/invoices/shipments/protocols | P0 | Supabase/RLS | Cross-account QA | REQ-AUTH-002 | Cross-account reads/writes denied | NOT TESTED |
| REQ-AUTH-007 | No service-role/private secrets in browser or repository | P0 | Vercel/GitHub | Secret scan | REQ-ENV-005 | Scan returns no release blocker | NOT TESTED |
| REQ-AUTH-008 | Leaked-password protection and auth hardening reviewed | P1 | Supabase | Security QA | REQ-AUTH-001 | Security advisor warning resolved or approved exception | FAIL |

## G. Super Admin and operational controls

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-ADM-001 | Existing admin is consolidated; no disconnected replacement admin | P0 | GitHub/Supabase | Architecture QA | REQ-ENV-001 | One operational admin surface | FAIL |
| REQ-ADM-002 | Dashboard and module navigation for products, variants, inventory, categories, media, customers, orders, wallet, payments, shipping, invoices, vouchers, research, protocols, pages, settings, AI, users, logs, reports and backup | P1 | Admin team | Testifly | REQ-AUTH-002 | Every required module has usable workflow | NOT TESTED |
| REQ-ADM-003 | Product CRUD with nested variants, publish/status/featured/SEO/tags/images | P1 | Admin/catalog | E2E QA | REQ-CAT-001 | Create/edit/save/reload passes | NOT TESTED |
| REQ-ADM-004 | Variant add and archive/delete with confirmation and audit | P1 | Admin/catalog | E2E QA | REQ-ADM-003 | Historical orders remain intact | NOT TESTED |
| REQ-ADM-005 | Bulk inventory editor with selection/filter/confirmation | P1 | Admin/inventory | E2E QA | REQ-CAT-011 | Bulk changes safe and audited | NOT TESTED |
| REQ-ADM-006 | Professional stock-change modal replaces native prompts | P1 | Admin/inventory | E2E QA | REQ-CAT-012 | Modal only opens on actual quantity change | RETEST |
| REQ-ADM-007 | Media/Templates upload, preview, version, approval, rollback and audit | P1 | Admin/media | Security/E2E QA | REQ-VIS-001 | Authorized Super Admin only; old version recoverable | FAIL |
| REQ-ADM-008 | Orders have controlled status transitions, notes and archive rules | P1 | Admin/orders | E2E QA | REQ-ORD-001 | No arbitrary/invalid transition | NOT TESTED |
| REQ-ADM-009 | Tracking uses courier/tracking fields and controlled workflow | P1 | Admin/shipping | E2E QA | REQ-SHIP-001 | Saved tracking updates member/order | NOT TESTED |
| REQ-ADM-010 | All save actions show explicit success/error and cannot silently fail | P1 | Admin frontend | E2E QA | REQ-ADM-002 | Mutation feedback verified | FAIL |
| REQ-ADM-011 | Mobile admin nav/forms/tables/modals usable; raw JSON contained | P1 | Admin frontend | Visual QA | REQ-ADM-002 | Target mobile viewports pass | RETEST |
| REQ-ADM-012 | Admin users/roles management with audit | P1 | Supabase/admin | Security QA | REQ-AUTH-002 | Role CRUD respects privilege boundaries | NOT TESTED |
| REQ-ADM-013 | Activity/System logs contain useful attributable records | P1 | Supabase/admin | Data QA | REQ-LOG-001 | Sample actions/errors produce searchable rows | NOT TESTED |
| REQ-ADM-014 | Backup/export/restore module includes verified restore procedure | P1 | Admin/release | Release QA | REQ-OPS-002 | Restore test passes on staging-safe fixture | NOT TESTED |
| REQ-ADM-015 | Temporary staging uploader is integrated or securely removed before production | P0 | Admin/media | Security QA | REQ-ADM-007 | No unprotected temporary admin endpoint in RC | FAIL |

## H. Member, wallet, checkout, orders and invoices

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-MEM-001 | Member profile, company, phone/email and multiple addresses | P1 | Member/Supabase | E2E QA | REQ-AUTH-001 | Create/edit/reload own details | NOT TESTED |
| REQ-MEM-002 | Member order history and details | P1 | Member/orders | E2E QA | REQ-ORD-001 | Exact variants/status/totals shown | NOT TESTED |
| REQ-MEM-003 | Member invoice view/download | P1 | Member/invoice | E2E QA | REQ-INV-001 | Authorized invoice downloadable | NOT TESTED |
| REQ-MEM-004 | Member wallet balance and ledger | P1 | Member/wallet | E2E/Data QA | REQ-WAL-001 | Balance reconciles to transactions | NOT TESTED |
| REQ-MEM-005 | Member tracking timeline/status | P1 | Member/shipping | E2E QA | REQ-SHIP-003 | Saved shipment visible to owner | NOT TESTED |
| REQ-MEM-006 | Member sees only approved entitled protocols | P0 | Member/protocol | Security/E2E QA | REQ-PRO-001 | Non-entitled member denied | NOT TESTED |
| REQ-WAL-001 | RM1 = 1 point where approved | P1 | Supabase/commerce | Data QA | REQ-MEM-001 | Business-rule tests pass | NOT TESTED |
| REQ-WAL-002 | Wallet ledger for every credit/debit/top-up/order/admin adjustment | P1 | Supabase | Data QA | REQ-WAL-001 | Balance equals ledger sum | NOT TESTED |
| REQ-WAL-003 | Admin adjustment requires reason/note/audit | P1 | Admin/wallet | E2E QA | REQ-WAL-002 | No silent balance update | NOT TESTED |
| REQ-WAL-004 | ToyyibPay wallet top-up status and callback | P1 | Payment backend | Integration QA | REQ-PAY-001 | Intent/callback/ledger reconcile | NOT TESTED |
| REQ-PAY-001 | ToyyibPay sandbox/live isolation; secrets server-side | P0 | Vercel backend/Supabase | Integration/Security QA | REQ-ENV-005 | Staging cannot charge live unintentionally | NOT TESTED |
| REQ-PAY-002 | Payment success, failure, cancel and retry paths | P1 | Payment backend | Integration/E2E QA | REQ-PAY-001 | All states map correctly | NOT TESTED |
| REQ-PAY-003 | COD disabled unless explicitly enabled | P1 | Store settings | E2E QA | REQ-PAY-001 | COD unavailable by default | NOT TESTED |
| REQ-ORD-001 | Cart→address→wallet/payment→order exact lifecycle | P0 | Commerce/Supabase | E2E QA | REQ-STO-009, REQ-PAY-001 | Fixture produces exact order safely | NOT TESTED |
| REQ-ORD-002 | Order stores exact variants, quantities, prices, discount, wallet, shipping and payment status | P0 | Supabase | Data QA | REQ-ORD-001 | Order totals/invariants reconcile | NOT TESTED |
| REQ-ORD-003 | Order confirmation/customer communication | P1 | Backend/email | Integration QA | REQ-ORD-001, REQ-COM-001 | Staging notification flow recorded | NOT TESTED |
| REQ-INV-001 | Invoice auto-generated for valid order | P1 | Supabase/invoice | E2E QA | REQ-ORD-001 | Invoice exists after fixture order | NOT TESTED |
| REQ-INV-002 | Invoice lines/totals equal order including shipping/discount/wallet/payment | P0 | Invoice engine | Data QA | REQ-INV-001 | Reconciliation difference is zero | NOT TESTED |
| REQ-INV-003 | Admin/member view, download and controlled regenerate | P1 | Admin/member | E2E QA | REQ-INV-001 | Authorized flows pass | NOT TESTED |

## I. EasyParcel, SPX, shipping and tracking

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-SHIP-001 | EasyParcel is the fulfilment integration layer where account/API supports it | P0 | Vercel backend/Supabase | YepCode integration QA | REQ-ORD-001 | Safe rate→shipment→AWB workflow passes | NOT TESTED |
| REQ-SHIP-002 | SPX preferred where available/appropriate | P1 | Shipping rules | Integration QA | REQ-SHIP-001 | Selection logic prefers SPX without forcing unavailable service | NOT TESTED |
| REQ-SHIP-003 | Configurable J&T/DHL alternatives; no automatic GDEX | P1 | Shipping rules | Integration QA | REQ-SHIP-001 | Courier policy tests pass | NOT TESTED |
| REQ-SHIP-004 | Shipping rates based on destination and parcel configuration | P1 | Shipping backend | Integration QA | REQ-SHIP-001 | West/Sabah/Sarawak/Labuan fixtures return stored quote | NOT TESTED |
| REQ-SHIP-005 | Admin creates shipment without retyping order/customer data | P1 | Admin/shipping | E2E QA | REQ-SHIP-001 | Eligible order pre-fills shipment | NOT TESTED |
| REQ-SHIP-006 | Generate/download/print waybill and bulk print where supported | P1 | Shipping backend/admin | E2E QA | REQ-SHIP-005 | AWB/label persisted and accessible | NOT TESTED |
| REQ-SHIP-007 | Persist courier, fee, provider IDs, AWB/tracking and status | P0 | Supabase/shipping | Data QA | REQ-SHIP-001 | Shipment record complete | NOT TESTED |
| REQ-SHIP-008 | Never mark Shipped before valid shipment/tracking | P0 | Orders/shipping | E2E QA | REQ-SHIP-007 | Invalid transition denied | NOT TESTED |
| REQ-SHIP-009 | Tracking sync/manual refresh and member Track Order view | P1 | Shipping/member | E2E QA | REQ-SHIP-007 | Customer sees latest status | NOT TESTED |
| REQ-SHIP-010 | Automated QA uses demo/mock/non-live path; no unintended postage purchase | P0 | Shipping QA | Release Manager | REQ-SHIP-001 | No live transaction during tests | NOT TESTED |
| REQ-SHIP-011 | Customer pays recorded shipping; configurable free-shipping threshold | P1 | Commerce/settings | Data/E2E QA | REQ-SHIP-004 | Order/invoice shipping matches quote/rule | NOT TESTED |
| REQ-SHIP-012 | Manual shipment/waybill fallback retained | P1 | Admin/shipping | E2E QA | REQ-SHIP-001 | Admin can complete fulfilment if API unavailable | NOT TESTED |

## J. Research, RAG and AI

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-RES-001 | Every active product maps to correct Research Insight | P1 | Supabase/research | Data/E2E QA | REQ-CAT-001 | Zero missing/wrong product mapping | NOT TESTED |
| REQ-RES-002 | Research content sufficiently detailed, editable and approval-controlled | P1 | Research/admin | Content QA | REQ-RES-001 | Published content meets approved template | NOT TESTED |
| REQ-RES-003 | References/source registry private until approved for public display | P1 | Research/Supabase | Security QA | REQ-RES-002 | Public cannot read private provenance | NOT TESTED |
| REQ-RES-004 | Research Center mobile navigation/popups close and return correctly | P1 | Frontend | Testifly | REQ-RES-001 | E2E navigation passes | NOT TESTED |
| REQ-RAG-001 | Tavily/current-source discovery is reviewed before publication | P1 | Research/Tavily | RAG QA | REQ-RES-002 | No unreviewed web content auto-publishes | NOT TESTED |
| REQ-RAG-002 | Retrieval grounding, miss detection and hallucination tests | P1 | RAGOps role | QA lead | REQ-RAG-001 | Evaluation suite meets defined threshold | NOT TESTED |
| REQ-AI-001 | Peptide assistant friendly, detailed and understands imperfect English/Malay/Chinese | P1 | AI assistant | RAG/E2E QA | REQ-RAG-002 | Language/style test set passes | NOT TESTED |
| REQ-AI-002 | Ask preferred language where appropriate | P2 | AI assistant | Conversation QA | REQ-AI-001 | First-use flow offers language preference | NOT TESTED |
| REQ-AI-003 | AI Center assists product/research/content/promotion/catalog/protocol work | P1 | AI/admin | E2E QA | REQ-AUTH-002 | Tools produce editable preview | NOT TESTED |
| REQ-AI-004 | AI cannot silently change prices, stock, orders, payments, production config or release protocols | P0 | AI guardrails | Guardrail QA | REQ-AI-003 | Critical-write tests require explicit approval | NOT TESTED |
| REQ-AI-005 | Customer-facing assistant hides internal research operations/source clutter unless requested | P1 | AI UX | Conversation QA | REQ-AI-001 | Responses remain comfortable/readable | NOT TESTED |

## K. Protocols, documents and guides

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-PRO-001 | Protocol entitlement matches exact product+strength+format+order | P0 | Supabase/protocol | Security/E2E QA | REQ-ORD-002 | Allowed fixture succeeds; non-entitled denied | NOT TESTED |
| REQ-PRO-002 | Payment/order validity verified before release | P0 | Protocol/orders | E2E QA | REQ-PRO-001 | Invalid/unpaid order cannot receive protocol | NOT TESTED |
| REQ-PRO-003 | Admin review/approval before member access | P1 | Admin/protocol | E2E QA | REQ-PRO-002 | Pending content not downloadable | NOT TESTED |
| REQ-PRO-004 | Vial/Pen/Cartridge-aware content and images | P1 | Protocol renderer | PDF/Content QA | REQ-PRO-001 | Each format gets correct guide | NOT TESTED |
| REQ-PRO-005 | Solution mL edits recalculate permitted values without silently changing locked approved dose/timing | P0 | Protocol engine | Unit/E2E QA | REQ-PRO-004 | Lock/override tests pass | NOT TESTED |
| REQ-PRO-006 | Explicit override is permission-controlled and audited | P1 | Admin/protocol | Security QA | REQ-PRO-005 | Override records actor/reason/before/after | NOT TESTED |
| REQ-PRO-007 | One-page A4 protocol target where specified | P1 | PDF renderer | PDF QA | REQ-PRO-004 | Required fixture remains one page/readable | NOT TESTED |
| REQ-PRO-008 | Filename follows Brand + Product + Order ID | P1 | PDF renderer | Unit QA | REQ-PRO-007 | Filename assertion passes | NOT TESTED |
| REQ-PRO-009 | Private protocols noindex and inaccessible publicly | P0 | Supabase/Vercel | Security QA | REQ-PRO-001 | Anonymous access denied; no public indexing | NOT TESTED |
| REQ-PRO-010 | Protocol states Pending/Generated/Approved/Printed/Downloaded | P1 | Protocol/Supabase | Data/E2E QA | REQ-PRO-003 | Valid transitions and audit pass | NOT TESTED |
| REQ-GDE-001 | Pen, Vial, Cartridge and Cold Chain/Receiving guides use approved real assets | P1 | Content/frontend | Visual/Content QA | REQ-VIS-001 | Guide links/media responsive and correct | NOT TESTED |
| REQ-GDE-002 | Pen guide retains approved visual steps and avoids duplicate unnecessary pages | P1 | Content/frontend | E2E QA | One coherent guide flow | NOT TESTED |

## L. Email, settings, maintenance, analytics, logs and reports

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-COM-001 | Environment-safe registration/recovery/order/tracking/protocol/invoice emails | P1 | Vercel backend/email | Integration QA | REQ-ENV-005 | Staging notifications logged without secret exposure | NOT TESTED |
| REQ-COM-002 | Email delivery failures recorded in System Logs | P1 | Backend/logging | Data QA | REQ-COM-001 | Failed fixture creates useful log | NOT TESTED |
| REQ-SET-001 | Store identity/contact/email/currency/payment/wallet/shipping/legal settings | P1 | Admin/settings | E2E QA | REQ-ADM-002 | Values persist and storefront consumes approved settings | NOT TESTED |
| REQ-SET-002 | Maintenance mode with optional passcode and admin bypass | P1 | Admin/Vercel | E2E/Security QA | REQ-SET-001 | Public maintenance page and safe admin access pass | NOT TESTED |
| REQ-SET-003 | Feature toggles and environment indicators | P1 | Admin/settings | E2E QA | REQ-SET-001 | Toggles are audited and environment-scoped | NOT TESTED |
| REQ-ANA-001 | Affiliate/referral code/cookie/source attribution | P2 | Supabase/analytics | Privacy/Data QA | REQ-AUTH-001 | Order attribution works and is disclosed | NOT TESTED |
| REQ-ANA-002 | Privacy-conscious visitor/referrer/behaviour analytics | P2 | Analytics | Privacy QA | REQ-SET-001 | Admin-only data; policy/cookie controls documented | NOT TESTED |
| REQ-LOG-001 | Audit product/price/stock/order/wallet/role/media/protocol/settings actions | P1 | Supabase | Data QA | REQ-AUTH-002 | Sample actions create attributable logs | NOT TESTED |
| REQ-LOG-002 | System logs capture application/API/payment/shipping/email/auth/DB errors | P1 | Vercel/Supabase | Operations QA | REQ-ENV-006 | Failure fixtures create searchable entries | NOT TESTED |
| REQ-REP-001 | Sales/order/customer/inventory/wallet/payment/shipping/voucher/protocol/research reports | P1 | Admin/reporting | Data QA | REQ-LOG-001 | Report totals reconcile to source tables | NOT TESTED |
| REQ-REP-002 | Customer and operational CSV/export with date/filter controls | P1 | Admin/reporting | Security/Data QA | REQ-REP-001 | Export scope, permissions and counts pass | NOT TESTED |

## M. Security, code quality and uploads

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-SEC-001 | RLS matrix for anon/member/agent/admin/super_admin | P0 | Supabase | Security QA | REQ-AUTH-002 | Allow/deny matrix passes | NOT TESTED |
| REQ-SEC-002 | Storage policy: public approved reads; Super Admin master writes only | P0 | Supabase | Security QA | REQ-ADM-007 | Unauthorized upload/update denied | NOT TESTED |
| REQ-SEC-003 | Upload validation: MIME, extension, size, dimensions and malicious SVG/content | P0 | Vercel/Supabase | Security QA | REQ-SEC-002 | Invalid fixtures rejected | NOT TESTED |
| REQ-SEC-004 | CSP, URL sanitization and open-redirect review | P0 | Vercel/GitHub | Security QA | REQ-ENV-004 | Security tests pass | NOT TESTED |
| REQ-SEC-005 | Review/restrict exposed `SECURITY DEFINER` protocol RPC | P0 | Supabase | Security QA | REQ-AUTH-002 | Only intended roles can execute | FAIL |
| REQ-SEC-006 | Static analysis for duplication, dead code, bugs and security hotspots | P1 | GitHub/Sonar role | Guardrail QA | REQ-ENV-004 | No unresolved P0/P1 finding | NOT TESTED |
| REQ-SEC-007 | Dependency/supply-chain vulnerability review | P1 | Endor role/GitHub | Security QA | REQ-SEC-006 | No release-blocking vulnerable dependency | NOT TESTED |
| REQ-SEC-008 | Staging `noindex`; private protocols noindex; production SEO approved | P1 | Vercel/frontend | SEO/Security QA | REQ-STO-011 | Crawler directives verified | NOT TESTED |

## N. Automated QA and release

| ID | Requirement | Priority | Owner | Independent tester | Depends on | Acceptance | Status |
|---|---|---:|---|---|---|---|---|
| REQ-QA-001 | Unit tests for resolver, variant selection, totals, colours, auth route and permissions | P0 | GitHub QA | Release Manager | architecture tasks | Defined suite passes | NOT TESTED |
| REQ-QA-002 | Supabase integration tests for catalog/media/RLS/orders/stock/auth/invoice/protocol | P0 | YepCode/Supabase QA | Release Manager | backend tasks | Non-destructive staging suite passes | NOT TESTED |
| REQ-QA-003 | Browser E2E for storefront/admin/member/payment/shipping/research/protocol | P0 | Testifly | Release Manager | all P0/P1 workflows | Critical journeys pass | NOT TESTED |
| REQ-QA-004 | Visual regression at 360×800, 390×844, 412×915, 768×1024, 1366×768, 1440×900 | P0 | Visual QA | Release Manager | REQ-VIS/STO/ADM | Structural pixel/layout assertions pass | NOT TESTED |
| REQ-QA-005 | Six+ category-colour and all-format visual matrix | P0 | Visual QA | Release Manager | REQ-VIS-012 | No overlap/cartoon/fake band | NOT TESTED |
| REQ-QA-006 | Broken-link, missing-image, console and network error scan | P0 | Testifly/Vercel | Release Manager | storefront/admin | Zero blocking 4xx/5xx/unhandled errors | NOT TESTED |
| REQ-QA-007 | Accessibility: keyboard, focus, labels, dialog, alt text, contrast | P1 | Accessibility QA | Release Manager | UI tasks | Accessibility target passes | NOT TESTED |
| REQ-QA-008 | Performance: no mutation loop/duplicate master loads; Lighthouse mobile ≥80/90/90/85 targets | P1 | Performance QA | Release Manager | REQ-VIS/STO | Thresholds pass or documented external blocker | NOT TESTED |
| REQ-QA-009 | EasyParcel/ToyyibPay tests use mock/demo/sandbox only | P0 | Integration QA | Release Manager | REQ-PAY/SHIP | No live financial side effect | NOT TESTED |
| REQ-QA-010 | CI runs static/unit/E2E/accessibility/broken-link/visual checks | P0 | GitHub Actions | Release Manager | REQ-QA-001..008 | Review branch check suite green | NOT TESTED |
| REQ-REL-001 | No unresolved P0/P1 before release candidate | P0 | Release Manager | Owner | all P0/P1 | Matrix contains only PASS/LOCKED | NOT TESTED |
| REQ-REL-002 | Freeze commit, migrations, asset versions and evidence package | P0 | GitHub/Vercel/Supabase | Owner | REQ-REL-001 | Reproducible RC documented | NOT TESTED |
| REQ-REL-003 | Backup/restore proof and rollback instructions | P0 | Release Manager | Owner | REQ-OPS-002, REQ-ADM-014 | Recovery evidence complete | IMPLEMENTING |
| REQ-REL-004 | One final owner approval before production | P0 | ChatGPT | Owner | REQ-REL-002 | Explicit approval recorded | NOT TESTED |
| REQ-REL-005 | Controlled production deployment and smoke test | P0 | Vercel/GitHub/Supabase | Release Manager | REQ-REL-004 | Production stable; rollback immediately available | NOT TESTED |

## Release rule

No P0/P1 requirement may remain `FAIL`, `FIXING`, `RETEST`, `BLOCKED`, `NOT TESTED` or `NEEDS OWNER` at release, except a documented owner-approved exception that does not weaken safety, data integrity, authorization, payment/shipping isolation or exact variant identity.