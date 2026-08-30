# AI BioTech QA Matrix

This matrix maps release-critical requirements to independent evidence targets. A deployment, commit or successful HTTP response does not equal PASS.

Valid states: `NOT TESTED`, `IMPLEMENTING`, `TESTING`, `FAIL`, `FIXING`, `RETEST`, `PASS`, `LOCKED`, `BLOCKED`, `NEEDS OWNER`.

## Operations and environment

| Requirement | Test / Evidence | Owner | Status | Current evidence or blocker |
|---|---|---|---|---|
| REQ-OPS-001 | Verify review branch, preview alias and production freeze | Release Manager | PASS | Review branch/alias recorded; no production action executed |
| REQ-OPS-002 | Git/Vercel/Supabase baseline + rollback documents | GitHub/Supabase | PASS | `docs/release/2026-08-30-*.md`; backup branch created |
| REQ-OPS-003 | Owner/tester assignment review | QAMap role | PASS | `team-roles.md` + registry |
| REQ-OPS-004 | Destructive-operation guard checklist/CI assertion | Guardrail QA | IMPLEMENTING | Rollback rules documented; enforcement not automated yet |
| REQ-OPS-005 | Registry-to-test coverage script | QAMap role | IMPLEMENTING | Registry expanded; automated coverage check pending |
| REQ-ENV-001 | All browser/admin/API config resolves one staging project | Integration QA | FAIL | Storefront points to `rpnw...`; admin/media code uses `yjaux...` |
| REQ-ENV-003 | Repository search + runtime probe for mixed project IDs | Integration QA | FAIL | Confirmed split; WP-02 opened |
| REQ-ENV-004 | Unit tests for shared config module | Unit QA | NOT TESTED | Shared module not implemented |
| REQ-ENV-005 | Preview/live secret and endpoint isolation check | Security QA | NOT TESTED | Requires centralized config |

## Visual masters and storefront

| Requirement | Test / Evidence | Owner | Status | Current evidence or blocker |
|---|---|---|---|---|
| REQ-VIS-001 | Resolver unit tests + first-paint browser test | Frontend QA | FAIL | Multiple writers/hard-coded masters remain |
| REQ-VIS-003 | Slow-network first-paint recording | Visual QA | FAIL | Previous screenshots showed cartoon/legacy assets |
| REQ-VIS-004 | Vial source/master identity test | Visual QA | FAIL | Layer/mask implementation unresolved |
| REQ-VIS-005 | Vial name bounds vs logo at all viewports | Visual QA | FAIL | Owner screenshots showed overlap |
| REQ-VIS-006 | Vial selected-strength update/bounds | Visual QA | FAIL | Position/data binding not yet independently verified |
| REQ-VIS-007 | Six-colour pixel-diff cap/stopper mask | Visual QA | FAIL | Rough CSS mask produced fake neck band |
| REQ-VIS-008 | Pen long/short name + strength text-fit screenshots | Visual QA | TESTING | Current Pen appears closest; full matrix pending |
| REQ-VIS-009 | Cartridge hero/card/modal/cart/checkout source assertion | Visual QA | FAIL | Cartoon/broken/old master observed in prior screenshots |
| REQ-VIS-010 | Asset 200/MIME/cache-version network suite | Network QA | FAIL | Master source/host/cache remain inconsistent |
| REQ-VIS-011 | Frame geometry at all viewports | Visual QA | RETEST | Some alignment improved; full matrix pending |
| REQ-STO-001 | Responsive storefront visual baseline | Visual QA | TESTING | Light design exists; regression suite absent |
| REQ-STO-002 | Navigation/link crawl | Browser QA | NOT TESTED | Pending architecture cleanup |
| REQ-STO-003 | Hero asset and performance test | Visual/Performance QA | FAIL | Hero participates in competing image pipeline |
| REQ-STO-004 | Search/category/format/stock/sort combinations | Browser QA | NOT TESTED | Pending E2E suite |
| REQ-STO-005 | Exact variant display test | Browser/Data QA | NOT TESTED | Pending catalog audit |
| REQ-STO-007 | Product modal visual and open/close tests | Browser/Visual QA | RETEST | Previous overflow fixes not independently verified |
| REQ-STO-009 | Exact selected variant/cart total E2E | Browser QA | NOT TESTED | Pending environment contract |
| REQ-STO-010 | Sticky-cart viewport assertions | Visual QA | RETEST | Prior screenshots require automated confirmation |

## Catalog and commerce

| Requirement | Test / Evidence | Owner | Status | Current evidence or blocker |
|---|---|---|---|---|
| REQ-CAT-001 | Full active variant integrity export | Data QA | NOT TESTED | 39 products / 224 variants observed in both projects |
| REQ-CAT-002 | Variant ID continuity fixture through downstream records | E2E/Data QA | NOT TESTED | Environment split blocks trusted result |
| REQ-CAT-008 | PDF-to-database price reconciliation | Price QA | NOT TESTED | Price PDF identified as source of truth |
| REQ-CAT-010 | Null SKU/price/format/category integrity SQL | Data QA | NOT TESTED | Pending WP-04 |
| REQ-CAT-011 | Negative/reserved/available-stock validation | Data QA | NOT TESTED | Pending WP-04 |
| REQ-CAT-012 | Inventory audit-row assertion | Data/E2E QA | NOT TESTED | `inventory_adjustments` exists in `yjaux...` only |
| REQ-WAL-001 | RM1=1 point business-rule tests | Data QA | NOT TESTED | Pending authoritative environment |
| REQ-WAL-002 | Wallet ledger sum equals balance | Data QA | NOT TESTED | Both projects currently have zero transactions |
| REQ-PAY-001 | ToyyibPay preview/live isolation | Integration/Security QA | NOT TESTED | Credentials/config not audited |
| REQ-ORD-001 | Cart→payment→order exact variant fixture | E2E QA | NOT TESTED | Must use staging fixture only |
| REQ-INV-002 | Invoice/order total reconciliation | Data QA | NOT TESTED | Pending order fixture |

## Auth, Admin and Member

| Requirement | Test / Evidence | Owner | Status | Current evidence or blocker |
|---|---|---|---|---|
| REQ-AUTH-001 | Register/login/logout/recovery E2E | Browser QA | NOT TESTED | Testifly connector currently unauthorized |
| REQ-AUTH-002 | Guest/member/agent/admin/super-admin RLS/RPC matrix | Security QA | NOT TESTED | Policies inventoried; role fixtures pending |
| REQ-AUTH-003 | Same-origin recovery URL and password-selection screen | Browser QA | FAIL | Owner observed automatic admin return/rate-limit issue |
| REQ-AUTH-004 | Expired/used/rate-limit states | Browser QA | FAIL | Rate-limit screenshot captured; UX not complete |
| REQ-AUTH-006 | Cross-account denial | Security QA | NOT TESTED | Requires fixture accounts |
| REQ-AUTH-007 | Secret scan | Security QA | NOT TESTED | Pending static scan setup |
| REQ-AUTH-008 | Supabase leaked-password protection | Security QA | FAIL | Advisor warns disabled on both projects |
| REQ-ADM-001 | Single consolidated admin architecture | Architecture QA | FAIL | Admin currently targets different backend from storefront |
| REQ-ADM-002 | Required module inventory and workflow suite | Browser QA | NOT TESTED | Pending environment contract |
| REQ-ADM-006 | Stock modal trigger/content/audit E2E | Browser/Data QA | RETEST | Implementation exists; independent test absent |
| REQ-ADM-007 | Media master upload/version/rollback authorization | Security/E2E QA | FAIL | Temporary uploader and cross-project media flow remain |
| REQ-ADM-010 | Save success/failure feedback suite | Browser QA | FAIL | Known silent/inconsistent saves reported |
| REQ-ADM-011 | Admin responsive screenshots | Visual QA | RETEST | Mobile CSS added; full matrix pending |
| REQ-ADM-015 | Temporary uploader protected/removed | Security QA | FAIL | Temporary route still exists in review branch |
| REQ-MEM-001 | Profile/company/address workflow | Browser QA | NOT TESTED | Pending authoritative environment |
| REQ-MEM-006 | Entitled protocol allow/deny | Security/E2E QA | NOT TESTED | Pending fixtures |

## Shipping, research and protocols

| Requirement | Test / Evidence | Owner | Status | Current evidence or blocker |
|---|---|---|---|---|
| REQ-SHIP-001 | EasyParcel demo/mock rate→shipment→AWB integration | Integration QA | NOT TESTED | Staging adapter contracts exist in `rpnw...`; credentials not configured/tested |
| REQ-SHIP-002 | SPX-preference selection fixtures | Integration QA | NOT TESTED | Must not force unavailable courier |
| REQ-SHIP-006 | Waybill generate/download/print test | Browser/Integration QA | NOT TESTED | Pending EasyParcel safe-mode integration |
| REQ-SHIP-008 | Reject Shipped without valid shipment/tracking | E2E QA | NOT TESTED | Pending order/shipping test fixture |
| REQ-SHIP-010 | Prove no live postage purchase | Release Manager | NOT TESTED | Demo/mock required |
| REQ-RES-001 | Product-to-Research Insight completeness query | Data QA | NOT TESTED | Both projects show 39 research entries; mapping not verified |
| REQ-RAG-002 | Grounding/miss/hallucination evaluation | RAG QA | NOT TESTED | Test corpus pending |
| REQ-AI-004 | Critical-write approval guardrail tests | Guardrail QA | NOT TESTED | Pending AI Center audit |
| REQ-PRO-001 | Exact entitlement allow/deny fixture | Security/E2E QA | NOT TESTED | Two projects have different protocol completeness |
| REQ-PRO-005 | Solution-mL vs locked dose/timing tests | Unit/E2E QA | NOT TESTED | Pending engine audit |
| REQ-PRO-007 | One-page PDF visual/layout check | PDF QA | NOT TESTED | Uploaded demo PDF is reference |
| REQ-PRO-009 | Anonymous protocol access/noindex check | Security QA | NOT TESTED | Pending authoritative environment |

## Security and release

| Requirement | Test / Evidence | Owner | Status | Current evidence or blocker |
|---|---|---|---|---|
| REQ-SEC-001 | Full RLS allow/deny matrix | Security QA | NOT TESTED | Policy inventories captured |
| REQ-SEC-002 | Storage public-read/Super-Admin-write test | Security QA | NOT TESTED | rpnw storage empty; yjaux storage populated |
| REQ-SEC-003 | Malformed/MIME/SVG upload rejection | Security QA | NOT TESTED | Current uploader validation is mostly client-side |
| REQ-SEC-004 | CSP/URL/open-redirect tests | Security QA | NOT TESTED | Pending architecture cleanup |
| REQ-SEC-005 | Restrict exposed protocol SECURITY DEFINER RPC | Security QA | FAIL | Supabase advisor warning on `yjaux...` |
| REQ-SEC-006 | Static quality scan | Static QA | BLOCKED | SonarQube connector not available in this session |
| REQ-SEC-007 | Dependency/supply-chain scan | Dependency QA | BLOCKED | Endor connector not available in this session |
| REQ-QA-001 | Unit suite | GitHub QA | NOT TESTED | Test harness not yet established |
| REQ-QA-002 | Supabase integration suite | YepCode/Supabase QA | NOT TESTED | YepCode worker not yet invoked/configured |
| REQ-QA-003 | Browser E2E suite | Testifly | BLOCKED | Testifly OAuth returned 401 Unauthorized on 2026-08-30 |
| REQ-QA-004 | Required viewport visual regression | Visual QA | NOT TESTED | Baselines not automated |
| REQ-QA-006 | Broken-link/image/console/network scan | Browser/Vercel QA | NOT TESTED | Pending stable architecture |
| REQ-QA-010 | CI release checks | GitHub Actions | NOT TESTED | Existing smoke workflow must be audited/expanded |
| REQ-REL-001 | No unresolved P0/P1 | Release Manager | NOT TESTED | Numerous P0/P1 failures remain |
| REQ-REL-003 | Backup/restore proof | Release Manager | IMPLEMENTING | Git/Vercel rollback recorded; safe DB fixture restore pending |
| REQ-REL-004 | One final owner approval | Owner | NOT TESTED | Not yet at release candidate |

## Required viewport set

- 360×800
- 390×844
- 412×915
- 768×1024
- 1366×768
- 1440×900

## Current external-tool status

- Testifly: connector discovered, but OAuth call returned `401 Unauthorized`; mark browser QA as `BLOCKED` until connected. Continue with repository-based tests and Vercel probes in parallel.
- SonarQube / Endor Labs / QAMap / RAGOps / Kora / Webcmd / ShipFrame / get-fable / Duende Skills / React Native testing: logical/reserved roles only unless their callable connectors become available. They must not be reported as having run.

## Release rule

No P0/P1 requirement may remain `FAIL`, `FIXING`, `RETEST`, `BLOCKED`, `NOT TESTED` or `NEEDS OWNER` at release, except a documented owner-approved exception that does not weaken safety, data integrity, authorization, payment/shipping isolation or exact variant identity.